import { MongoClient, Db } from 'mongodb';
import type { AdminEvent, AdminMessage, AdminWeather, AuditEntry, SaveDoc, UserDoc } from './types';

/**
 * ===== MongoDB connection (HARDENED) =====
 *
 * Ưu tiên URI (thứ tự):
 * 1. process.env.MONGODB_URI (nếu .env.local có)
 * 2. ATLAS_STANDARD_URI — hardcode dưới đây (DEFAULT, không cần .env.local)
 * 3. ATLAS_SRV_URI — hardcode (chỉ thử nếu env yêu cầu SRV)
 *
 * Vì đây là dev tool localhost-only cho cluster riêng nên URI được hardcode
 * làm default — đảm bảo app chạy ngay kể cả khi thiếu .env.local
 * (tránh lỗi ECONNREFUSED 127.0.0.1:27017 do env không nạp).
 *
 * Nếu URI active là SRV-style và DNS SRV bị chặn (querySrv ECONNREFUSED),
 * tự động fallback sang ATLAS_STANDARD_URI (danh sách 3 node trực tiếp).
 */

// Cluster fishingmath (Atlas M0) — 3 node + replicaSet, KHÔNG cần DNS SRV:
export const ATLAS_STANDARD_URI =
  'mongodb://vvt158214_db_user:tU4FHL6MHaUV9KHJ@ac-lj83an3-shard-00-00.x7krg70.mongodb.net:27017,ac-lj83an3-shard-00-01.x7krg70.mongodb.net:27017,ac-lj83an3-shard-00-02.x7krg70.mongodb.net:27017/math_fishing?ssl=true&replicaSet=atlas-e7wxg6-shard-0&authSource=admin&retryWrites=true&w=majority';

// SRV URI (cần DNS SRV hoạt động):
export const ATLAS_SRV_URI =
  'mongodb+srv://vvt158214_db_user:tU4FHL6MHaUV9KHJ@fishingmath.x7krg70.mongodb.net/math_fishing?retryWrites=true&w=majority&appName=fishingmath';

const ENV_URI = (process.env.MONGODB_URI || process.env.MONGO_URI || '').trim();
const DB_NAME = process.env.MONGODB_DB || process.env.MONGO_DB || 'math_fishing';

// Active URI: env nếu có (và không rỗng), ngược lại dùng standard hardcode.
const PRIMARY_URI = ENV_URI.length > 10 ? ENV_URI : ATLAS_STANDARD_URI;

// Reuse client across hot-reloads in dev
declare global {
  // eslint-disable-next-line no-var
  var __adminMongoClient: MongoClient | undefined;
  // eslint-disable-next-line no-var
  var __adminMongoUri: string | undefined;
}

function createClient(uri: string): MongoClient {
  return new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
}

let client: MongoClient;
let activeUri: string = '';

if (process.env.NODE_ENV === 'production') {
  activeUri = PRIMARY_URI;
  client = createClient(activeUri);
} else {
  if (!globalThis.__adminMongoClient) {
    activeUri = PRIMARY_URI;
    globalThis.__adminMongoClient = createClient(activeUri);
    globalThis.__adminMongoUri = activeUri;
  }
  client = globalThis.__adminMongoClient;
  activeUri = globalThis.__adminMongoUri || PRIMARY_URI;
}

let srvFallbackDone = false;

export async function getDb(): Promise<Db> {
  try {
    await client.connect();
    return client.db(DB_NAME);
  } catch (err) {
    const msg = (err as Error).message || '';
    const isSrvDnsError = /querySrv|ECONNREFUSED.*_mongodb|ENODATA|EAI_AGAIN/i.test(msg);

    // Nếu URI active là SRV-style và DNS SRV fail → swap sang standard URI
    if (isSrvDnsError && activeUri.startsWith('mongodb+srv://') && !srvFallbackDone) {
      srvFallbackDone = true;
      try {
        await client.close();
      } catch {
        /* ignore */
      }
      const newClient = createClient(ATLAS_STANDARD_URI);
      globalThis.__adminMongoClient = newClient;
      globalThis.__adminMongoUri = ATLAS_STANDARD_URI;
      client = newClient;
      activeUri = ATLAS_STANDARD_URI;
      await client.connect();
      return client.db(DB_NAME);
    }
    throw err;
  }
}

/** URI đang active (đã mask password) — cho /api/health debug. */
export function getActiveUriMasked(): string {
  return activeUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
}

/** DB name đang dùng. */
export function getDbName(): string {
  return DB_NAME;
}

// Convenience accessors (typed)
export async function usersCol() {
  const db = await getDb();
  return db.collection<UserDoc>('users');
}

export async function savesCol() {
  const db = await getDb();
  return db.collection<SaveDoc>('saves');
}

export async function eventsCol() {
  const db = await getDb();
  return db.collection<AdminEvent>('admin_events');
}

export async function weatherCol() {
  const db = await getDb();
  return db.collection<AdminWeather>('admin_weather');
}

export async function messagesCol() {
  const db = await getDb();
  return db.collection<AdminMessage>('admin_messages');
}

export async function auditCol() {
  const db = await getDb();
  return db.collection<AuditEntry>('admin_audit');
}

/** Broadcast events persisted cho game chính poll qua /api/game/live. */
export interface BroadcastDoc {
  id: string;
  username: string;
  role: string;
  action: string;
  text: string;
  ts: number;
  createdAt: Date;
}

export async function broadcastsCol() {
  const db = await getDb();
  return db.collection<BroadcastDoc>('admin_broadcasts');
}

export async function ensureAdminIndexes(): Promise<void> {
  const db = await getDb();
  await Promise.all([
    db.collection<UserDoc>('users').createIndex({ username: 1 }, { unique: true }),
    db.collection<SaveDoc>('saves').createIndex({ username: 1 }, { unique: true }),
    db.collection<AdminEvent>('admin_events').createIndex({ createdAt: -1 }),
    db.collection<AdminWeather>('admin_weather').createIndex({ createdAt: -1 }),
    db.collection<AdminMessage>('admin_messages').createIndex({ createdAt: -1 }),
    db.collection<AuditEntry>('admin_audit').createIndex({ createdAt: -1 }),
    db.collection<BroadcastDoc>('admin_broadcasts').createIndex({ ts: -1 }),
  ]);
}

// ===== Ping check =====
export async function pingDb(): Promise<{ ok: boolean; ms: number; dbName: string; err?: string }> {
  const t0 = Date.now();
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    return { ok: true, ms: Date.now() - t0, dbName: db.databaseName };
  } catch (e) {
    return { ok: false, ms: Date.now() - t0, dbName: DB_NAME, err: (e as Error).message };
  }
}
