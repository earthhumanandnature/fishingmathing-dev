// ===== Types shared across the admin panel =====

import type { ObjectId } from 'mongodb';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythical';

export type Role = 'admin' | 'developer';

export interface SessionUser {
  username: string;
  role: Role;
  loginAt: number;
}

/** Một entry trong bảng audit log (lưu vào collection `admin_audit`). */
export interface AuditEntry {
  _id?: ObjectId | string;
  username: string;
  role: Role;
  action: string;
  detail: string;
  payload?: unknown;
  createdAt: Date;
}

/** Một event do admin tạo — lưu ở collection `admin_events`. */
export interface AdminEvent {
  _id?: ObjectId | string;
  name: string;
  type: 'bonus_coins' | 'luck_boost' | 'double_catch' | 'ancient_rod' | 'custom';
  multiplier: number;
  startsAt: Date;
  endsAt: Date;
  active: boolean;
  createdBy: string;
  createdAt: Date;
}

/** Một weather mutation boost — lưu ở collection `admin_weather`. */
export interface AdminWeather {
  _id?: ObjectId | string;
  mutationId: string;
  multiplier: number;
  startsAt: Date;
  expiresAt: Date;
  active: boolean;
  createdBy: string;
  createdAt: Date;
}

/** Một global message — lưu ở collection `admin_messages`. */
export interface AdminMessage {
  _id?: ObjectId | string;
  username: string;
  role: Role;
  message: string;
  createdAt: Date;
}

/** Dòng realtime broadcast tới tất cả tab. */
export interface BroadcastEvent {
  id: string;
  username: string;
  role: Role;
  action: string;
  text: string;
  ts: number;
}

// ===== Game types (mirror of game chính) =====

export interface FishSpecies {
  id: string;
  name: string;
  emoji: string;
  rarity: Rarity;
  minWeight: number;
  maxWeight: number;
  baseValue: number;
}

export interface MutationDef {
  id: string;
  name: string;
  emoji: string;
  chance: number;
  valueMult: number;
}

export interface CaughtRecord {
  count: number;
  bestWeight: number;
  mutations: string[];
}

export interface TankFish {
  uid: string;
  speciesId: string;
  weight: number;
  addedAt: number;
}

export interface SaveData {
  version: number;
  hasStarted: boolean;
  playerName: string;
  avatar: string;
  character: 'lac' | 'long';
  coins: number; // Hạt sồi (acorns)
  totalCatches: number;
  totalFails: number;
  currentStreak: number;
  bestStreak: number;
  difficulty: 'easy' | 'medium' | 'hard';
  soundOn: boolean;
  fishCaught: Record<string, CaughtRecord>;
  tankFish: TankFish[];
  bestCatch: { fishId: string; weight: number; value: number } | null;
  achievements: string[];
  problemsSolved: number;
  coinsEarned: number;
  // === Breeding / crafting fields (mirror game chính types.ts) ===
  items?: Record<string, number>;
  catchLog?: Array<{ uid: string; speciesId: string; weight: number; mutations: string[]; value: number; gotShell: boolean; caughtAt: number }>;
  sellFish?: TankFish[];
  shells?: number; // vỏ sò
  ancientRod?: AncientRodState | null; // cần câu cổ đại — OBJECT hoặc null (KHÔNG phải boolean!)
  scrapIron?: number; // sắt vụn
  glass?: number; // kính
  tankLevel?: number; // cấp bể (0..10) — game chính: capacity = 10 + level*5
  foodBoxes?: Partial<Record<Rarity, number>>; // hộp thức ăn theo rank (object, không phải number!)
  eggs?: unknown[];
  inbreedAlert?: unknown | null;
  lastInbreedAt?: number;
  subject?: string;
}

/** Trạng thái Cần Câu Cổ Đại — phải khớp với game chính types.ts */
export interface AncientRodState {
  expiresAt: number; // epoch ms
  level: number; // 0..10
}

export interface UserDoc {
  username: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SaveDoc {
  username: string;
  saveData: SaveData;
  updatedAt: Date;
}
