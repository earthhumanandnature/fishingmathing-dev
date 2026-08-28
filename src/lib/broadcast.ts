import type { BroadcastEvent, Role } from './types';
import { auditCol, broadcastsCol } from './mongo';

/**
 * In-memory broadcast bus for Server-Sent Events (SSE).
 * Khi một admin/dev thực hiện action (tạo event, give fish, weather, global message...)
 * → gọi `broadcast()` → đẩy tới tất cả client đang subscribe SSE `/api/broadcast/stream`
 * VÀ ghi vào MongoDB collection `admin_broadcasts` để GAME CHÍNH poll qua /api/game/live.
 *
 * Buffer 200 event gần nhất để client mới kết nối vẫn thấy lịch sử.
 */

type Subscriber = (ev: BroadcastEvent) => void;

const MAX_BUFFER = 200;
const buffer: BroadcastEvent[] = [];
const subscribers = new Set<Subscriber>();

let seq = 0;

function nextId(): string {
  seq = (seq + 1) % 1_000_000_000;
  return `${Date.now()}-${seq}`;
}

export function subscribe(cb: Subscriber): () => void {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}

export function getBuffered(): BroadcastEvent[] {
  return [...buffer];
}

export interface BroadcastOpts {
  username: string;
  role: Role;
  action: string;
  /** Nếu là global message → dùng raw text. Nếu không → null (sẽ tự dựng "...đã <verb>"). */
  message?: string | null;
  /** Động từ mô tả hành động (vd "tạo event", "kích hoạt weather", "xoá 1 con cá"). */
  verb?: string;
  /** Lưu vào audit log collection? */
  audit?: boolean;
  /** Payload cho audit log. */
  payload?: unknown;
}

export async function broadcast(opts: BroadcastOpts): Promise<BroadcastEvent> {
  let text: string;
  if (opts.message !== null && opts.message !== undefined && opts.message !== '') {
    // Global message format: "<username>: <message>"
    text = `${opts.username}: ${opts.message}`;
  } else {
    // Action format: "<username>: đã <verb>"
    const verb = opts.verb || 'thực hiện hành động';
    text = `${opts.username}: đã ${verb}`;
  }

  const ev: BroadcastEvent = {
    id: nextId(),
    username: opts.username,
    role: opts.role,
    action: opts.action,
    text,
    ts: Date.now(),
  };

  buffer.push(ev);
  if (buffer.length > MAX_BUFFER) {
    buffer.splice(0, buffer.length - MAX_BUFFER);
  }

  for (const sub of subscribers) {
    try {
      sub(ev);
    } catch {
      /* ignore */
    }
  }

  // Persist vào `admin_broadcasts` (fire-and-forget) — game chính poll collection này
  try {
    const col = await broadcastsCol();
    await col.insertOne({
      id: ev.id,
      username: ev.username,
      role: ev.role,
      action: ev.action,
      text: ev.text,
      ts: ev.ts,
      createdAt: new Date(ev.ts),
    });
  } catch {
    /* ignore — broadcast should never fail because persist fails */
  }

  // Audit log (fire-and-forget)
  if (opts.audit) {
    try {
      const col = await auditCol();
      await col.insertOne({
        username: opts.username,
        role: opts.role,
        action: opts.action,
        detail: text,
        payload: opts.payload,
        createdAt: new Date(),
      });
    } catch {
      /* ignore — broadcast should never fail because audit fails */
    }
  }

  return ev;
}

// Helper verbs cho các action phổ biến
export const VERBS = {
  createEvent: (name: string) => `tạo event "${name}"`,
  deleteEvent: (name: string) => `xoá event "${name}"`,
  activateWeather: (mutationName: string, mult: number) =>
    `kích hoạt weather ${mutationName} +${Math.round(mult * 100)}%`,
  deactivateWeather: (mutationName: string) => `tắt weather ${mutationName}`,
  giveFish: (username: string, fishName: string) =>
    `tặng cá "${fishName}" cho ${username}`,
  deleteFish: (username: string, fishName: string) =>
    `xoá 1 con "${fishName}" của ${username}`,
  globalMessage: null,
  banUser: (username: string) => `cấm tài khoản ${username}`,
  unbanUser: (username: string) => `bỏ cấm ${username}`,
  resetSave: (username: string) => `reset save của ${username}`,
  giveItem: (username: string, item: string, amount: number) =>
    `${amount >= 0 ? 'tặng' : 'trừ'} ${Math.abs(amount)} ${item} cho ${username}`,
  giveRod: (username: string, has: boolean) =>
    `${has ? 'tặng' : 'thu hồi'} cần câu cổ đại của ${username}`,
  upgradeTank: (username: string, level: number) =>
    `set bể của ${username} sang cấp ${level}`,
  changePassword: (username: string) => `đổi mật khẩu của ${username}`,
} as const;
