'use client';

import { useState } from 'react';
import { FISH_DB, MUTATIONS, RARITY_META, RARITIES } from '@/lib/game-data';
import { RefreshCw, Trash2, Gift, Fish as FishIcon } from 'lucide-react';

interface SaveDetail {
  username: string;
  updatedAt: string;
  saveData: {
    coins: number;
    totalCatches: number;
    bestStreak: number;
    tankFish: Array<{ uid: string; speciesId: string; weight: number; addedAt: number; species?: { id: string; name: string; emoji: string; rarity: string } | null }>;
    fishCaught: Record<string, { count: number; bestWeight: number; mutations: string[] }>;
  };
}

export function FishAdminPanel() {
  const [username, setUsername] = useState('');
  const [save, setSave] = useState<SaveDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [speciesId, setSpeciesId] = useState(FISH_DB[0]?.id || '');
  const [weight, setWeight] = useState<number | ''>('');
  const [selectedMuts, setSelectedMuts] = useState<string[]>([]);
  const [count, setCount] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  async function loadUser(u?: string) {
    const target = (u ?? username).trim();
    if (!target) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/users/${encodeURIComponent(target)}`);
      const d = await r.json();
      if (!r.ok) {
        setError(d?.error || 'not_found');
        setSave(null);
        return;
      }
      setSave(d.save ? { ...d.save, saveData: d.save.saveData } : null);
      setUsername(target);
    } catch (e) {
      setError((e as Error).message);
      setSave(null);
    } finally {
      setLoading(false);
    }
  }

  async function giveFish() {
    if (!username || !speciesId) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch('/api/fish/give', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          speciesId,
          weight: typeof weight === 'number' ? weight : undefined,
          mutations: selectedMuts,
          count,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d?.error || 'Lỗi give');
        return;
      }
      await loadUser(username);
      setWeight('');
      setSelectedMuts([]);
      setCount(1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteFish(uid: string) {
    if (!username) return;
    if (!confirm('Xoá 1 con cá khỏi tank?')) return;
    await fetch('/api/fish/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, uid }),
    });
    await loadUser(username);
  }

  async function deleteAllSpecies(spId: string) {
    if (!username) return;
    const sp = FISH_DB.find((f) => f.id === spId);
    if (!confirm(`Xoá TẤT CẢ "${sp?.name}" khỏi tank?`)) return;
    await fetch('/api/fish/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, speciesId: spId, all: true }),
    });
    await loadUser(username);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-amber-400">Give / Delete Fish</h1>
        <p className="text-sm text-slate-500">
          Tặng / xoá cá trong tank của bất kỳ user nào.
        </p>
      </div>

      <div className="rounded-xl border border-ink-500/60 bg-ink-800/60 p-4">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-amber-400">
          Chọn user
        </h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
            className="flex-1 rounded border border-ink-500 bg-ink-900 px-3 py-2 text-sm font-mono text-amber-300"
            onKeyDown={(e) => {
              if (e.key === 'Enter') loadUser();
            }}
          />
          <button
            onClick={() => loadUser()}
            disabled={loading || !username}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-ink-900 hover:bg-amber-400 disabled:opacity-50"
          >
            {loading ? <RefreshCw size={14} className="animate-spin" /> : 'Tải'}
          </button>
        </div>
        {error && (
          <div className="mt-2 text-sm text-rose-400">{error}</div>
        )}
      </div>

      {save && (
        <div className="rounded-xl border border-ink-500/60 bg-ink-800/60 p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <div className="text-xs uppercase text-slate-500">User</div>
              <div className="font-mono font-bold text-amber-300">{save.username}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-slate-500">Hạt sồi</div>
              <div className="font-mono font-bold text-amber-400">{save.saveData.coins}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-slate-500">Cá câu</div>
              <div className="font-mono text-slate-300">{save.saveData.totalCatches}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-slate-500">Best streak</div>
              <div className="font-mono text-orange-400">{save.saveData.bestStreak}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-slate-500">Tank</div>
              <div className="font-mono text-cyan-400">{save.saveData.tankFish?.length || 0}</div>
            </div>
          </div>
        </div>
      )}

      {save && (
        <div className="rounded-xl border border-ink-500/60 bg-ink-800/60 p-4">
          <h2 className="mb-3 flex items-center gap-1 text-sm font-bold uppercase tracking-wider text-amber-400">
            <Gift size={14} /> Tặng cá cho {save.username}
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-bold text-slate-400">Loài cá</span>
              <select
                value={speciesId}
                onChange={(e) => setSpeciesId(e.target.value)}
                className="mt-1 w-full rounded border border-ink-500 bg-ink-900 px-3 py-2 text-sm text-amber-300"
              >
                {RARITIES.flatMap((r) =>
                  FISH_DB.filter((f) => f.rarity === r).map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.emoji} {f.name} ({RARITY_META[f.rarity].label}, {f.minWeight}-{f.maxWeight}kg)
                    </option>
                  ))
                )}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-bold text-slate-400">Trọng lượng (kg, để trống = random)</span>
              <input
                type="number"
                step="0.01"
                value={weight}
                onChange={(e) => setWeight(e.target.value === '' ? '' : parseFloat(e.target.value))}
                placeholder="random"
                className="mt-1 w-full rounded border border-ink-500 bg-ink-900 px-3 py-2 text-sm text-amber-300"
              />
            </label>
            <div className="md:col-span-2">
              <span className="text-xs font-bold text-slate-400">Mutations (tùy chọn)</span>
              <div className="mt-1 flex flex-wrap gap-2">
                {MUTATIONS.map((m) => {
                  const on = selectedMuts.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() =>
                        setSelectedMuts((prev) =>
                          on ? prev.filter((x) => x !== m.id) : [...prev, m.id]
                        )
                      }
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                        on
                          ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                          : 'border-ink-500 text-slate-400 hover:border-amber-500/50'
                      }`}
                    >
                      {m.emoji} {m.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="block">
              <span className="text-xs font-bold text-slate-400">Số lượng</span>
              <input
                type="number"
                min="1"
                max="50"
                value={count}
                onChange={(e) => setCount(Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 1)))}
                className="mt-1 w-full rounded border border-ink-500 bg-ink-900 px-3 py-2 text-sm text-amber-300"
              />
            </label>
          </div>
          <button
            onClick={giveFish}
            disabled={submitting}
            className="mt-3 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-ink-900 hover:bg-emerald-400 disabled:opacity-50"
          >
            {submitting ? 'Đang tặng…' : `Tặng ${count} con`}
          </button>
        </div>
      )}

      {save && (
        <div className="rounded-xl border border-ink-500/60 bg-ink-800/60 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1 text-sm font-bold uppercase tracking-wider text-amber-400">
              <FishIcon size={14} /> Tank của {save.username} ({save.saveData.tankFish?.length || 0})
            </h2>
          </div>
          {save.saveData.tankFish && save.saveData.tankFish.length > 0 ? (
            <ul className="max-h-96 space-y-1.5 overflow-y-auto pr-1">
              {save.saveData.tankFish
                .slice()
                .sort((a, b) => b.addedAt - a.addedAt)
                .map((t) => (
                  <li
                    key={t.uid}
                    className="flex items-center justify-between rounded border border-ink-700 bg-ink-900/40 px-3 py-1.5"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-lg">{t.species?.emoji || '🐟'}</span>
                      <span className="font-bold text-amber-300">
                        {t.species?.name || t.speciesId}
                      </span>
                      <span className="font-mono text-xs text-slate-400">{t.weight}kg</span>
                      <span className="font-mono text-[10px] text-slate-600">{t.uid}</span>
                    </div>
                    <button
                      onClick={() => deleteFish(t.uid)}
                      className="rounded border border-rose-500/40 px-2 py-0.5 text-[10px] font-semibold text-rose-400 hover:bg-rose-500/10"
                    >
                      <Trash2 size={10} className="mr-1 inline" /> Xoá
                    </button>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-slate-500">
              Tank trống — tặng cá cho user ở form trên ↑
            </p>
          )}

          {save.saveData.fishCaught && Object.keys(save.saveData.fishCaught).length > 0 && (
            <div className="mt-4 border-t border-ink-700 pt-3">
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                Xoá tất cả 1 loài:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.keys(save.saveData.fishCaught).map((sid) => {
                  const sp = FISH_DB.find((f) => f.id === sid);
                  return (
                    <button
                      key={sid}
                      onClick={() => deleteAllSpecies(sid)}
                      className="rounded border border-rose-500/30 px-2 py-0.5 text-[11px] text-rose-400 hover:bg-rose-500/10"
                    >
                      {sp?.emoji || '🐟'} {sp?.name || sid} ({save.saveData.fishCaught[sid]?.count || 0})
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
