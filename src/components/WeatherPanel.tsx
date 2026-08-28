'use client';

import { useEffect, useState } from 'react';
import { MUTATIONS } from '@/lib/game-data';
import { Trash2, Plus, RefreshCw } from 'lucide-react';

interface WeatherItem {
  _id: string;
  mutationId: string;
  multiplier: number;
  startsAt: string;
  expiresAt: string;
  active: boolean;
  createdBy: string;
  createdAt: string;
  mutation?: { id: string; name: string; emoji: string };
}

export function WeatherPanel() {
  const [list, setList] = useState<WeatherItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mutationId, setMutationId] = useState('shiny');
  const [multiplier, setMultiplier] = useState(0.3);
  const [durationMin, setDurationMin] = useState(60);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/weather');
      const d = await r.json();
      setList(d.weathers || []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch('/api/weather', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mutationId, multiplier, durationMin }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d?.error || 'Lỗi kích hoạt weather');
        return;
      }
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function del(id: string, label: string) {
    if (!confirm(`Tắt weather "${label}"?`)) return;
    await fetch(`/api/weather/${id}`, { method: 'DELETE' });
    await refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-amber-400">Weather</h1>
        <p className="text-sm text-slate-500">
          Kích hoạt weather để tăng cơ hội dính mutation đặc trưng khi câu cá.
        </p>
      </div>

      <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-sm text-amber-200">
        ℹ️ Khi weather đang active, cơ hội dính mutation = chance gốc × (1 + multiplier).
        Vd: shiny (6%) + multiplier 0.3 → 6% × 1.3 = 7.8%.
      </div>

      <form onSubmit={submit} className="rounded-xl border border-ink-500/60 bg-ink-800/60 p-4">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-amber-400">
          <Plus size={14} className="mr-1 inline" /> Kích hoạt weather mới
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="block">
            <span className="text-xs font-bold text-slate-400">Mutation</span>
            <select
              value={mutationId}
              onChange={(e) => setMutationId(e.target.value)}
              className="mt-1 w-full rounded border border-ink-500 bg-ink-900 px-3 py-2 text-sm text-amber-300"
            >
              {MUTATIONS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.emoji} {m.name} (chance {(m.chance * 100).toFixed(1)}%)
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-400">Boost (+% cơ hội)</span>
            <input
              type="number"
              step="0.05"
              min="0.01"
              max="5"
              value={multiplier}
              onChange={(e) => setMultiplier(parseFloat(e.target.value))}
              className="mt-1 w-full rounded border border-ink-500 bg-ink-900 px-3 py-2 text-sm text-amber-300"
            />
            <span className="mt-1 block text-[10px] text-slate-500">0.3 = +30%</span>
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-400">Thời lượng (phút)</span>
            <input
              type="number"
              min="1"
              max="10080"
              value={durationMin}
              onChange={(e) => setDurationMin(parseInt(e.target.value, 10))}
              className="mt-1 w-full rounded border border-ink-500 bg-ink-900 px-3 py-2 text-sm text-amber-300"
            />
          </label>
        </div>
        {error && (
          <div className="mt-3 rounded border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-300">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="mt-3 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-ink-900 hover:bg-amber-400 disabled:opacity-50"
        >
          {submitting ? 'Đang kích hoạt…' : 'Kích hoạt'}
        </button>
      </form>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Weather đang có ({list.length})
        </h2>
        <button onClick={refresh} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> refresh
        </button>
      </div>

      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-500/60 p-8 text-center text-sm text-slate-500">
          Chưa có weather nào active.
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((w) => {
            const now = Date.now();
            const expired = new Date(w.expiresAt).getTime() < now;
            const active = w.active && !expired;
            const m = w.mutation || MUTATIONS.find((mm) => mm.id === w.mutationId);
            const label = m ? `${m.emoji} ${m.name}` : w.mutationId;
            return (
              <li
                key={w._id}
                className="flex items-center justify-between rounded-lg border border-ink-500/60 bg-ink-800/60 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${active ? 'animate-pulse bg-cyan-400' : 'bg-slate-600'}`} />
                    <span className="text-lg">{m?.emoji}</span>
                    <span className="font-bold text-cyan-300">{label}</span>
                    <span className="font-mono text-xs text-slate-500">
                      +{Math.round(w.multiplier * 100)}%
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {new Date(w.startsAt).toLocaleString('vi-VN')} → {new Date(w.expiresAt).toLocaleString('vi-VN')} · tạo bởi <span className="text-slate-400">{w.createdBy}</span>
                  </div>
                </div>
                <button
                  onClick={() => del(w._id, label)}
                  className="flex items-center gap-1 rounded border border-rose-500/40 px-2 py-1 text-xs font-semibold text-rose-400 hover:bg-rose-500/10"
                >
                  <Trash2 size={12} /> Tắt
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
