'use client';

import { useEffect, useState } from 'react';
import {
  Gift,
  KeyRound,
  Hammer,
  GlassWater,
  Package,
  RefreshCw,
  Sparkles,
  Wand2,
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
} from 'lucide-react';

interface SaveSummary {
  coins: number;
  scrapIron?: number;
  glass?: number;
  foodBoxes?: Partial<Record<string, number>>;
  ancientRod?: { expiresAt: number; level: number } | null;
  tankLevel?: number;
  tankCapacity?: number;
  totalCatches?: number;
  fishCaughtCount?: number;
  tankFishCount?: number;
}

interface UserDetail {
  user?: { username: string; createdAt: string; updatedAt: string } | null;
  save?: { saveData: any; updatedAt: string } | null;
}

const ITEM_OPTIONS = [
  { id: 'acorns', label: 'Hạt sồi (coins)', icon: '🌰', color: 'text-amber-400' },
  { id: 'scrapIron', label: 'Sắt vụn', icon: '🔩', color: 'text-slate-300' },
  { id: 'glass', label: 'Kính', icon: '🪟', color: 'text-cyan-300' },
  { id: 'foodBoxes', label: 'Hộp thức ăn', icon: '📦', color: 'text-emerald-300' },
];

const RARITY_OPTIONS = [
  { id: 'common', label: 'Phổ Biến', color: 'text-slate-400' },
  { id: 'uncommon', label: 'Không Phổ Biến', color: 'text-emerald-400' },
  { id: 'rare', label: 'Hiếm', color: 'text-cyan-400' },
  { id: 'epic', label: 'Sử Thi', color: 'text-purple-400' },
  { id: 'legendary', label: 'Huyền Thoại', color: 'text-amber-400' },
  { id: 'mythical', label: 'Thần Thoại', color: 'text-rose-400' },
];

const PRESETS = [
  { label: '+100 hạt sồi', item: 'acorns', amount: 100 },
  { label: '+1.000 hạt sồi', item: 'acorns', amount: 1000 },
  { label: '+50 sắt vụn', item: 'scrapIron', amount: 50 },
  { label: '+50 kính', item: 'glass', amount: 50 },
  { label: '+10 hộp common', item: 'foodBoxes', amount: 10, rarity: 'common' },
  { label: '+5 hộp rare', item: 'foodBoxes', amount: 5, rarity: 'rare' },
  { label: 'Tặng starter pack', item: '__starter__', amount: 0 },
];

export function InventoryPanel() {
  const [username, setUsername] = useState('');
  const [item, setItem] = useState('acorns');
  const [rarity, setRarity] = useState('common');
  const [amount, setAmount] = useState(100);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [userDetail, setUserDetail] = useState<SaveSummary | null>(null);
  const [userFound, setUserFound] = useState<boolean | null>(null);

  // Password form
  const [newPassword, setNewPassword] = useState('');
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Rod
  const [rodBusy, setRodBusy] = useState(false);

  // Tank
  const [tankBusy, setTankBusy] = useState(false);

  async function flash(m: { ok: boolean; text: string }) {
    setMsg(m);
    setTimeout(() => setMsg(null), 4000);
  }

  async function flashPwd(m: { ok: boolean; text: string }) {
    setPwdMsg(m);
    setTimeout(() => setPwdMsg(null), 4000);
  }

  async function lookupUser(name?: string) {
    const u = (name ?? username).trim();
    if (!u) return;
    try {
      const r = await fetch(`/api/users/${encodeURIComponent(u)}`);
      if (r.status === 404) {
        setUserFound(false);
        setUserDetail(null);
        return;
      }
      const d = await r.json();
      setUserFound(true);
      const sd = d?.save?.saveData;
      // Sanitize tất cả field — bắt buộc là number/object-null đúng kiểu
      // để tránh React error #31 khi render {value} với value là {} (object rỗng)
      const num = (v: unknown, fb = 0): number =>
        typeof v === 'number' && isFinite(v) ? v : fb;
      const objRecord = (v: unknown): Record<string, number> =>
        v && typeof v === 'object' && !Array.isArray(v)
          ? (v as Record<string, number>)
          : {};
      const rodOr = (v: unknown): { expiresAt: number; level: number } | null => {
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          const r = v as { expiresAt?: unknown; level?: unknown };
          const expiresAt = typeof r.expiresAt === 'number' ? r.expiresAt : 0;
          const level = typeof r.level === 'number' ? r.level : 1;
          if (expiresAt > 0) return { expiresAt, level };
        }
        return null;
      };
      setUserDetail(
        sd
          ? {
              coins: num(sd.coins),
              scrapIron: num(sd.scrapIron),
              glass: num(sd.glass),
              foodBoxes: objRecord(sd.foodBoxes),
              ancientRod: rodOr(sd.ancientRod),
              tankLevel: Math.max(0, Math.min(10, num(sd.tankLevel))),
              tankCapacity: 10 + Math.max(0, Math.min(10, num(sd.tankLevel))) * 5,
              totalCatches: num(sd.totalCatches),
              fishCaughtCount:
                sd.fishCaught && typeof sd.fishCaught === 'object'
                  ? Object.keys(sd.fishCaught).length
                  : 0,
              tankFishCount: Array.isArray(sd.tankFish) ? sd.tankFish.length : 0,
            }
          : null
      );
    } catch {
      setUserFound(null);
    }
  }

  async function submitGive(itemOverride?: string, amountOverride?: number, rarityOverride?: string) {
    const u = username.trim();
    const it = itemOverride ?? item;
    const rar = rarityOverride ?? rarity;
    const amt = amountOverride ?? amount;
    if (!u) {
      flash({ ok: false, text: 'Nhập username trước' });
      return;
    }

    // Starter pack: 1000 hạt + 50 sắt + 50 kính + 10 hộp common + cổ câu level 1 (7 ngày)
    if (it === '__starter__') {
      setBusy(true);
      try {
        await fetch('/api/admin/give-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: u, item: 'acorns', amount: 1000 }),
        });
        await fetch('/api/admin/give-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: u, item: 'scrapIron', amount: 50 }),
        });
        await fetch('/api/admin/give-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: u, item: 'glass', amount: 50 }),
        });
        await fetch('/api/admin/give-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: u, item: 'foodBoxes', amount: 10, rarity: 'common' }),
        });
        await fetch('/api/admin/rod', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: u, has: true, level: 1, durationMs: 7 * 24 * 60 * 60 * 1000 }),
        });
        flash({ ok: true, text: `Đã tặng starter pack cho ${u}` });
        await lookupUser(u);
      } catch (e) {
        flash({ ok: false, text: (e as Error).message });
      } finally {
        setBusy(false);
      }
      return;
    }

    setBusy(true);
    try {
      const payload: any = { username: u, item: it, amount: amt };
      if (it === 'foodBoxes') payload.rarity = rar;
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
      const suffix = it === 'foodBoxes' ? ` (${rar})` : '';
      flash({
        ok: true,
        text: `Đã ${amt >= 0 ? 'tặng' : 'trừ'} ${Math.abs(amt)} ${it}${suffix} cho ${u} (now: ${d.after})`,
      });
      await lookupUser(u);
    } catch (e) {
      flash({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function submitRod(has: boolean) {
    const u = username.trim();
    if (!u) {
      flash({ ok: false, text: 'Nhập username trước' });
      return;
    }
    setRodBusy(true);
    try {
      const r = await fetch('/api/admin/rod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, has }),
      });
      const d = await r.json();
      if (!r.ok) {
        flash({ ok: false, text: d?.error || 'failed' });
        return;
      }
      flash({
        ok: true,
        text: `${has ? 'Tặng' : 'Thu hồi'} cần câu cổ đại ${u}`,
      });
      await lookupUser(u);
    } catch (e) {
      flash({ ok: false, text: (e as Error).message });
    } finally {
      setRodBusy(false);
    }
  }

  async function submitTank(action: 'upgrade' | 'downgrade' | 'set', level?: number) {
    const u = username.trim();
    if (!u) {
      flash({ ok: false, text: 'Nhập username trước' });
      return;
    }
    setTankBusy(true);
    try {
      const r = await fetch('/api/admin/tank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, action, level }),
      });
      const d = await r.json();
      if (!r.ok) {
        flash({ ok: false, text: d?.error || 'failed' });
        return;
      }
      flash({
        ok: true,
        text: `Bể ${u} cấp ${d.after} (dung tích ${d.capacity})`,
      });
      await lookupUser(u);
    } catch (e) {
      flash({ ok: false, text: (e as Error).message });
    } finally {
      setTankBusy(false);
    }
  }

  async function submitPassword() {
    const u = username.trim();
    if (!u) {
      flashPwd({ ok: false, text: 'Nhập username trước' });
      return;
    }
    if (newPassword.length < 4 || newPassword.length > 64) {
      flashPwd({ ok: false, text: 'Mật khẩu 4-64 ký tự' });
      return;
    }
    setPwdBusy(true);
    try {
      const r = await fetch('/api/admin/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, newPassword }),
      });
      const d = await r.json();
      if (!r.ok) {
        flashPwd({ ok: false, text: d?.error || 'failed' });
        return;
      }
      flashPwd({ ok: true, text: `Đổi mật khẩu ${u} thành công` });
      setNewPassword('');
    } catch (e) {
      flashPwd({ ok: false, text: (e as Error).message });
    } finally {
      setPwdBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-amber-400">Inventory Admin</h1>
        <p className="text-sm text-slate-500">
          Tặng / trừ nguyên liệu, đổi mật khẩu, tặng cần câu cổ đại, nâng cấp bể cho user.
        </p>
      </div>

      {/* USERNAME */}
      <div className="rounded-xl border border-ink-500/60 bg-ink-800/60 p-4">
        <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
          Username
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="vd: vvt, fish_master_99..."
            className="flex-1 rounded-lg border border-ink-500 bg-ink-900 px-3 py-2 font-mono text-sm text-amber-300"
            onKeyDown={(e) => {
              if (e.key === 'Enter') lookupUser();
            }}
          />
          <button
            onClick={() => lookupUser()}
            className="flex items-center gap-1.5 rounded-lg border border-ink-500 bg-ink-900 px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-ink-700"
          >
            <RefreshCw size={14} /> Tra cứu
          </button>
        </div>

        {userFound === false && (
          <div className="mt-2 text-sm text-rose-400">Không tìm thấy user này.</div>
        )}

        {userFound && userDetail && (
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 lg:grid-cols-4">
            <Stat icon="🌰" label="Hạt sồi" value={userDetail.coins} color="text-amber-300" />
            <Stat icon="🔩" label="Sắt vụn" value={userDetail.scrapIron ?? 0} color="text-slate-300" />
            <Stat icon="🪟" label="Kính" value={userDetail.glass ?? 0} color="text-cyan-300" />
            <Stat
              icon="📦"
              label="Hộp (tổng)"
              value={(Object.values(userDetail.foodBoxes || {}) as number[]).reduce((s, n) => s + (n ?? 0), 0)}
              color="text-emerald-300"
            />
            <Stat
              icon="🎣"
              label="Cổ câu"
              value={
                userDetail.ancientRod
                  ? userDetail.ancientRod.expiresAt > Date.now()
                    ? `Lv${userDetail.ancientRod.level} ✓`
                    : 'Hết hạn'
                  : '—'
              }
              color={
                userDetail.ancientRod && userDetail.ancientRod.expiresAt > Date.now()
                  ? 'text-emerald-400'
                  : 'text-slate-500'
              }
            />
            <Stat
              icon="🐠"
              label="Cá trong bể"
              value={`${userDetail.tankFishCount}/${userDetail.tankCapacity}`}
              color="text-cyan-400"
            />
            <Stat icon="⭐" label="Cấp bể" value={userDetail.tankLevel ?? 0} color="text-amber-300" />
            <Stat icon="🎯" label="Loài đã câu" value={userDetail.fishCaughtCount ?? 0} color="text-orange-400" />
          </div>
        )}

        {userFound && userDetail && Object.keys(userDetail.foodBoxes || {}).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
            <span className="self-center font-bold uppercase tracking-wider text-slate-500">
              Hộp theo rank:
            </span>
            {Object.entries(userDetail.foodBoxes || {}).map(([rar, n]) => (
              <span
                key={rar}
                className="rounded-md border border-emerald-500/30 bg-emerald-950/30 px-1.5 py-0.5 font-mono text-emerald-300"
              >
                {rar}: {n}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* GIVE/REMOVE ITEMS */}
      <div className="rounded-xl border border-ink-500/60 bg-ink-800/60 p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-400">
          <Gift size={16} /> Give / Remove nguyên liệu
        </h2>

        <div className="mb-3 flex flex-wrap gap-2">
          {ITEM_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setItem(opt.id)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                item === opt.id
                  ? 'border-amber-500 bg-amber-500/15 text-amber-300'
                  : 'border-ink-500 bg-ink-900 text-slate-400 hover:bg-ink-700'
              }`}
            >
              <span className="mr-1">{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>

        {/* Rarity dropdown — chỉ hiển thị khi item === foodBoxes */}
        {item === 'foodBoxes' && (
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="self-center text-xs font-bold uppercase tracking-wider text-slate-500">
              Rank cá:
            </span>
            {RARITY_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setRarity(opt.id)}
                className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                  rarity === opt.id
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
                    : 'border-ink-500 bg-ink-900 text-slate-400 hover:bg-ink-700'
                }`}
              >
                <span className={`mr-1 ${opt.color}`}>●</span>
                {opt.label}
              </button>
            ))}
          </div>
        )}

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Số lượng
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Math.max(-1_000_000, Math.min(1_000_000, Number(e.target.value))))}
            className="w-32 rounded-lg border border-ink-500 bg-ink-900 px-3 py-1.5 font-mono text-sm text-amber-300"
          />
          <div className="flex gap-2">
            <button
              onClick={() => submitGive()}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              <ArrowUpFromLine size={13} /> Give (+)
            </button>
            <button
              onClick={() => submitGive(item, -Math.abs(amount), rarity)}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
            >
              <ArrowDownToLine size={13} /> Remove (−)
            </button>
          </div>
        </div>

        <div className="border-t border-ink-700 pt-3">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            Quick presets
          </div>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => submitGive(p.item, p.amount, (p as any).rarity)}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-lg border border-ink-500 bg-ink-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-ink-700 disabled:opacity-50"
              >
                <Sparkles size={12} className="text-amber-400" />
                {p.label}
              </button>
            ))}
          </div>
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

      {/* ANCIENT ROD */}
      <div className="rounded-xl border border-ink-500/60 bg-ink-800/60 p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-400">
          <Wand2 size={16} /> Cần câu cổ đại
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => submitRod(true)}
            disabled={rodBusy}
            className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
          >
            <CheckCircle2 size={13} /> Tặng cần câu
          </button>
          <button
            onClick={() => submitRod(false)}
            disabled={rodBusy}
            className="flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-ink-900 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-950/40 disabled:opacity-50"
          >
            Thu hồi
          </button>
          {userDetail?.ancientRod && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-400">
              <CheckCircle2 size={12} /> Đang sở hữu
            </span>
          )}
        </div>
      </div>

      {/* TANK UPGRADE */}
      <div className="rounded-xl border border-ink-500/60 bg-ink-800/60 p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-400">
          <Package size={16} /> Nâng cấp bể cá
        </h2>
        <p className="mb-3 text-xs text-slate-500">
          Cấp bể tính theo công thức: dung tích = 10 + cấp × 5 (cấp 0 = 10 con, cấp 10 = 60 con).
          Tối đa cấp 10.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => submitTank('upgrade')}
            disabled={tankBusy}
            className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
          >
            <ArrowUpFromLine size={13} /> Nâng 1 cấp
          </button>
          <button
            onClick={() => submitTank('downgrade')}
            disabled={tankBusy}
            className="flex items-center gap-1.5 rounded-lg border border-ink-500 bg-ink-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-ink-700 disabled:opacity-50"
          >
            <ArrowDownToLine size={13} /> Hạ 1 cấp
          </button>
          <button
            onClick={() => submitTank('set', 0)}
            disabled={tankBusy}
            className="flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-ink-900 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-950/40 disabled:opacity-50"
          >
            Reset về cấp 0
          </button>
          <button
            onClick={() => submitTank('set', 10)}
            disabled={tankBusy}
            className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-ink-900 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-950/40 disabled:opacity-50"
          >
            Max cấp 10
          </button>
        </div>
      </div>

      {/* CHANGE PASSWORD */}
      <div className="rounded-xl border border-ink-500/60 bg-ink-800/60 p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-400">
          <KeyRound size={16} /> Đổi mật khẩu
        </h2>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="mật khẩu mới (4-64 ký tự)"
            className="flex-1 rounded-lg border border-ink-500 bg-ink-900 px-3 py-2 font-mono text-sm text-amber-300"
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitPassword();
            }}
          />
          <button
            onClick={submitPassword}
            disabled={pwdBusy}
            className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
          >
            <KeyRound size={14} /> Đổi mật khẩu
          </button>
        </div>
        {pwdMsg && (
          <div
            className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
              pwdMsg.ok
                ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                : 'border-rose-500/40 bg-rose-950/40 text-rose-300'
            }`}
          >
            {pwdMsg.text}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500">
        <span>{icon}</span> {label}
      </div>
      <div className={`mt-0.5 font-mono text-base font-bold ${color}`}>{value}</div>
    </div>
  );
}
