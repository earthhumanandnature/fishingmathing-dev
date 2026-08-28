'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Search, KeyRound, Gift, Hammer, RotateCcw } from 'lucide-react';

interface UserItem {
  username: string;
  createdAt?: string;
  updatedAt?: string;
  save?: {
    coins: number;
    totalCatches: number;
    bestStreak: number;
    fishCaughtCount: number;
    tankFishCount: number;
    scrapIron?: number;
    glass?: number;
    foodBoxes?: Partial<Record<string, number>> | number;
    ancientRod?: { expiresAt: number; level: number } | null | boolean;
    tankLevel?: number;
    tankCapacity?: number;
    updatedAt?: string;
  } | null;
}

function foodBoxesTotal(fb?: Partial<Record<string, number>> | number | null): number {
  if (!fb) return 0;
  if (typeof fb === 'number' && isFinite(fb)) return fb;
  if (typeof fb === 'object' && !Array.isArray(fb)) {
    return (Object.values(fb) as number[]).reduce((s, n) => {
      // Sanitize từng value — có thể là object/string/undefined do dữ liệu cũ
      const num = typeof n === 'number' && isFinite(n) ? n : 0;
      return s + num;
    }, 0);
  }
  return 0;
}

function rodLabel(rod?: { expiresAt: number; level: number } | null | boolean | object): string {
  if (!rod) return '—';
  if (typeof rod === 'boolean') return rod ? '✓' : '—';
  // rod is object — phải có expiresAt + level hợp lệ
  if (typeof rod === 'object' && !Array.isArray(rod)) {
    const r = rod as { expiresAt?: unknown; level?: unknown };
    const expiresAt = typeof r.expiresAt === 'number' && isFinite(r.expiresAt) ? r.expiresAt : 0;
    const level = typeof r.level === 'number' && isFinite(r.level) ? r.level : 1;
    if (expiresAt > 0) {
      return expiresAt > Date.now() ? `Lv${level} ✓` : 'Hết hạn';
    }
  }
  return '—';
}

export function UsersPanel() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Quick action state
  const [quickUser, setQuickUser] = useState('');
  const [quickPwd, setQuickPwd] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function refresh(s?: string) {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/users?search=${encodeURIComponent(s ?? search)}&limit=200`);
      const d = await r.json();
      if (!r.ok) {
        setError(d?.error || 'fetch_failed');
        setUsers([]);
        return;
      }
      setUsers(d.users || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function flash(m: { ok: boolean; text: string }) {
    setMsg(m);
    setTimeout(() => setMsg(null), 4000);
  }

  async function quickGiveItem(item: string, amount: number, rarity?: string) {
    const u = quickUser.trim();
    if (!u) {
      flash({ ok: false, text: 'Nhập username ở ô dưới' });
      return;
    }
    setBusy(true);
    try {
      const payload: any = { username: u, item, amount };
      if (item === 'foodBoxes') payload.rarity = rarity || 'common';
      const r = await fetch('/api/admin/give-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) {
        flash({ ok: false, text: d?.error || 'failed' });
        return;
      }
      const suffix = item === 'foodBoxes' ? ` (${rarity || 'common'})` : '';
      flash({ ok: true, text: `${amount >= 0 ? '+' : ''}${amount} ${item}${suffix} → ${u} (now: ${d.after})` });
      refresh();
    } catch (e) {
      flash({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function quickGiveRod() {
    const u = quickUser.trim();
    if (!u) {
      flash({ ok: false, text: 'Nhập username ở ô dưới' });
      return;
    }
    setBusy(true);
    try {
      const r = await fetch('/api/admin/rod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: u,
          has: true,
          level: 1,
          durationMs: 7 * 24 * 60 * 60 * 1000, // 7 ngày
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        flash({ ok: false, text: d?.error || 'failed' });
        return;
      }
      flash({ ok: true, text: `Đã tặng cần câu cổ đại (Lv1, 7 ngày) cho ${u}` });
      refresh();
    } catch (e) {
      flash({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function quickUpgradeTank() {
    const u = quickUser.trim();
    if (!u) {
      flash({ ok: false, text: 'Nhập username ở ô dưới' });
      return;
    }
    setBusy(true);
    try {
      const r = await fetch('/api/admin/tank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, action: 'upgrade' }),
      });
      const d = await r.json();
      if (!r.ok) {
        flash({ ok: false, text: d?.error || 'failed' });
        return;
      }
      flash({ ok: true, text: `Bể ${u} → cấp ${d.after} (dung tích ${d.capacity})` });
      refresh();
    } catch (e) {
      flash({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function quickReset() {
    const u = quickUser.trim();
    if (!u) {
      flash({ ok: false, text: 'Nhập username ở ô dưới' });
      return;
    }
    if (!confirm(`Reset toàn bộ save của "${u}"? Hành động này không thể hoàn tác.`)) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/users/${encodeURIComponent(u)}?action=reset`, {
        method: 'DELETE',
      });
      const d = await r.json();
      if (!r.ok) {
        flash({ ok: false, text: d?.error || 'failed' });
        return;
      }
      flash({ ok: true, text: `Đã reset save của ${u}` });
      refresh();
    } catch (e) {
      flash({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function quickChangePwd() {
    const u = quickUser.trim();
    if (!u) {
      flash({ ok: false, text: 'Nhập username ở ô dưới' });
      return;
    }
    if (quickPwd.length < 4 || quickPwd.length > 64) {
      flash({ ok: false, text: 'Mật khẩu 4-64 ký tự' });
      return;
    }
    setBusy(true);
    try {
      const r = await fetch('/api/admin/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, newPassword: quickPwd }),
      });
      const d = await r.json();
      if (!r.ok) {
        flash({ ok: false, text: d?.error || 'failed' });
        return;
      }
      flash({ ok: true, text: `Đổi mật khẩu ${u} thành công` });
      setQuickPwd('');
    } catch (e) {
      flash({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-amber-400">Users</h1>
        <p className="text-sm text-slate-500">
          Danh sách tài khoản + bảng thống kê nguyên liệu.
        </p>
      </div>

      {/* Quick actions */}
      <div className="rounded-xl border border-amber-500/40 bg-amber-950/10 p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-400">
          <Gift size={16} /> Quick Actions
        </h2>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Username
            </label>
            <input
              type="text"
              value={quickUser}
              onChange={(e) => setQuickUser(e.target.value)}
              placeholder="vd: vvt"
              className="w-full rounded-lg border border-ink-500 bg-ink-900 px-3 py-2 font-mono text-sm text-amber-300"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Mật khẩu mới (đổi pass)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={quickPwd}
                onChange={(e) => setQuickPwd(e.target.value)}
                placeholder="4-64 ký tự"
                className="flex-1 rounded-lg border border-ink-500 bg-ink-900 px-3 py-2 font-mono text-sm text-amber-300"
              />
              <button
                onClick={quickChangePwd}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
              >
                <KeyRound size={14} /> Đổi pass
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <QuickBtn label="+1k hạt sồi" onClick={() => quickGiveItem('acorns', 1000)} disabled={busy} color="amber" />
          <QuickBtn label="+100 hạt" onClick={() => quickGiveItem('acorns', 100)} disabled={busy} color="amber" />
          <QuickBtn label="-100 hạt" onClick={() => quickGiveItem('acorns', -100)} disabled={busy} color="rose" />
          <QuickBtn label="+50 sắt" onClick={() => quickGiveItem('scrapIron', 50)} disabled={busy} color="slate" />
          <QuickBtn label="+50 kính" onClick={() => quickGiveItem('glass', 50)} disabled={busy} color="cyan" />
          <QuickBtn label="+10 hộp common" onClick={() => quickGiveItem('foodBoxes', 10, 'common')} disabled={busy} color="emerald" />
          <QuickBtn label="+5 hộp rare" onClick={() => quickGiveItem('foodBoxes', 5, 'rare')} disabled={busy} color="emerald" />
          <QuickBtn label="+5 hộp legendary" onClick={() => quickGiveItem('foodBoxes', 5, 'legendary')} disabled={busy} color="emerald" />
          <QuickBtn label="Tặng cần câu" onClick={quickGiveRod} disabled={busy} color="amber" icon={<Hammer size={12} />} />
          <QuickBtn label="Nâng cấp bể" onClick={quickUpgradeTank} disabled={busy} color="cyan" />
          <QuickBtn label="Reset save" onClick={quickReset} disabled={busy} color="rose" icon={<RotateCcw size={12} />} />
        </div>

        {msg && (
          <div
            className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
              msg.ok
                ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                : 'border-rose-500/40 bg-rose-950/40 text-rose-300'
            }`}
          >
            {msg.text}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="tìm username…"
            className="w-full rounded-lg border border-ink-500 bg-ink-800 py-2 pl-9 pr-3 text-sm text-amber-300"
            onKeyDown={(e) => {
              if (e.key === 'Enter') refresh();
            }}
          />
        </div>
        <button
          onClick={() => refresh()}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-ink-700 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-300">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-ink-500/60 bg-ink-800/60">
        <div className="border-b border-ink-500/60 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
          {users.length} users
        </div>
        {users.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">
            Chưa có user nào.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-2 font-bold">#</th>
                  <th className="px-3 py-2 font-bold">Username</th>
                  <th className="px-3 py-2 font-bold text-right text-amber-400" title="Hạt sồi">🌰</th>
                  <th className="px-3 py-2 font-bold text-right text-slate-300" title="Sắt vụn">🔩</th>
                  <th className="px-3 py-2 font-bold text-right text-cyan-300" title="Kính">🪟</th>
                  <th className="px-3 py-2 font-bold text-right text-emerald-300" title="Hộp thức ăn">📦</th>
                  <th className="px-3 py-2 font-bold text-center text-amber-300" title="Cần câu cổ đại">🎣</th>
                  <th className="px-3 py-2 font-bold text-right text-cyan-400" title="Cá trong bể">🐠</th>
                  <th className="px-3 py-2 font-bold text-right text-orange-400" title="Streak">⭐</th>
                  <th className="px-3 py-2 font-bold text-right text-emerald-400" title="Loài đã câu">🐟</th>
                  <th className="px-3 py-2 font-bold text-right text-amber-300" title="Cấp bể">📦 Lv</th>
                  <th className="px-3 py-2 font-bold">Updated</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => {
                  // Sanitize tất cả giá trị trước khi render để tránh React #31
                  // (nếu DB có dữ liệu cũ field là object {} thì `??` không catch được)
                  const num = (v: unknown, fb: number | string = 0): number | string =>
                    typeof v === 'number' && isFinite(v) ? v : fb;
                  const coins = u.save?.coins;
                  const scrapIron = u.save?.scrapIron;
                  const glass = u.save?.glass;
                  const tankLevel = u.save?.tankLevel;
                  const bestStreak = u.save?.bestStreak;
                  const fishCaughtCount = u.save?.fishCaughtCount;
                  const tankFishCount = u.save?.tankFishCount;
                  const safeTankLevel = typeof tankLevel === 'number' && isFinite(tankLevel) ? Math.max(0, Math.min(10, tankLevel)) : 0;
                  return (
                  <tr key={u.username} className="border-t border-ink-700 hover:bg-ink-700/30">
                    <td className="px-3 py-2 font-mono text-slate-500">{i + 1}</td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => setQuickUser(u.username)}
                        className="font-mono text-amber-300 hover:underline"
                        title="Click để nạp vào Quick Actions"
                      >
                        {u.username}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-amber-400">{num(coins, '—')}</td>
                    <td className="px-3 py-2 text-right font-mono text-slate-300">{num(scrapIron)}</td>
                    <td className="px-3 py-2 text-right font-mono text-cyan-300">{num(glass)}</td>
                    <td className="px-3 py-2 text-right font-mono text-emerald-300">
                      {foodBoxesTotal(u.save?.foodBoxes)}
                    </td>
                    <td className="px-3 py-2 text-center text-xs font-mono text-amber-300">
                      {rodLabel(u.save?.ancientRod)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-cyan-400">
                      {num(tankFishCount)}/{10 + safeTankLevel * 5}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-orange-400">{num(bestStreak, '—')}</td>
                    <td className="px-3 py-2 text-right font-mono text-emerald-400">{num(fishCaughtCount)}</td>
                    <td className="px-3 py-2 text-right font-mono text-amber-300">{safeTankLevel}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">
                      {u.save?.updatedAt ? new Date(u.save.updatedAt).toLocaleString('vi-VN') : '—'}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-600">
        Mẹo: Click vào username bất kỳ để nạp vào ô Quick Actions phía trên, rồi dùng các nút nhanh để tặng nguyên liệu / đổi mật khẩu / nâng cấp bể.
      </p>
    </div>
  );
}

function QuickBtn({
  label,
  onClick,
  disabled,
  color,
  icon,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  color: 'amber' | 'rose' | 'slate' | 'cyan' | 'emerald';
  icon?: React.ReactNode;
}) {
  const cls: Record<typeof color, string> = {
    amber: 'border-amber-500/40 bg-amber-950/40 text-amber-300 hover:bg-amber-950/60',
    rose: 'border-rose-500/40 bg-rose-950/40 text-rose-300 hover:bg-rose-950/60',
    slate: 'border-slate-500/40 bg-slate-900 text-slate-300 hover:bg-slate-800',
    cyan: 'border-cyan-500/40 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-950/60',
    emerald: 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-950/60',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${cls[color]}`}
    >
      {icon}
      {label}
    </button>
  );
}
