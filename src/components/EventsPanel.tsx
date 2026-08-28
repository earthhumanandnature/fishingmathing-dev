'use client';

import { useEffect, useState } from 'react';
import { Trash2, Plus, RefreshCw } from 'lucide-react';

interface EventItem {
  _id: string;
  name: string;
  type: string;
  multiplier: number;
  startsAt: string;
  endsAt: string;
  active: boolean;
  createdBy: string;
  createdAt: string;
}

export function EventsPanel() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('bonus_coins');
  const [multiplier, setMultiplier] = useState(2);
  const [durationH, setDurationH] = useState(24);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/events');
      const d = await r.json();
      setEvents(d.events || []);
    } catch {
      setEvents([]);
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
    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + durationH * 60 * 60 * 1000);
    try {
      const r = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, multiplier, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), active: true }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d?.error || 'Lỗi tạo event');
        return;
      }
      setName('');
      setMultiplier(2);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function del(id: string, name: string) {
    if (!confirm(`Xoá event "${name}"?`)) return;
    await fetch(`/api/events/${id}`, { method: 'DELETE' });
    await refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-amber-400">Events</h1>
        <p className="text-sm text-slate-500">Tạo / xoá event cho game.</p>
      </div>

      <form onSubmit={submit} className="rounded-xl border border-ink-500/60 bg-ink-800/60 p-4">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-amber-400">
          <Plus size={14} className="mr-1 inline" /> Tạo event mới
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <label className="block">
            <span className="text-xs font-bold text-slate-400">Tên event</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Vd: Đôi Hạt Sồi Cuối Tuần"
              className="mt-1 w-full rounded border border-ink-500 bg-ink-900 px-3 py-2 text-sm text-amber-300"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-400">Loại</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1 w-full rounded border border-ink-500 bg-ink-900 px-3 py-2 text-sm text-amber-300"
            >
              <option value="bonus_coins">bonus_coins (+coins)</option>
              <option value="luck_boost">luck_boost (+rarity)</option>
              <option value="double_catch">double_catch (câu đôi)</option>
              <option value="ancient_rod">ancient_rod (Kỷ Phấn Trắng — mở bán cần cổ đại)</option>
              <option value="custom">custom</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-400">Multiplier</span>
            <input
              type="number"
              step="0.1"
              min="0.1"
              max="10"
              value={multiplier}
              onChange={(e) => setMultiplier(parseFloat(e.target.value))}
              className="mt-1 w-full rounded border border-ink-500 bg-ink-900 px-3 py-2 text-sm text-amber-300"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-400">Thời lượng (giờ)</span>
            <input
              type="number"
              min="1"
              max="168"
              value={durationH}
              onChange={(e) => setDurationH(parseInt(e.target.value, 10))}
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
          {submitting ? 'Đang tạo…' : 'Tạo event'}
        </button>
      </form>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Event đang có ({events.length})
        </h2>
        <button onClick={refresh} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> refresh
        </button>
      </div>

      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-500/60 p-8 text-center text-sm text-slate-500">
          Chưa có event nào. Tạo event đầu tiên ở trên ↑
        </div>
      ) : (
        <ul className="space-y-2">
          {events.map((ev) => {
            const now = Date.now();
            const ended = new Date(ev.endsAt).getTime() < now;
            const upcoming = new Date(ev.startsAt).getTime() > now;
            const active = ev.active && !ended && !upcoming;
            return (
              <li
                key={ev._id}
                className="flex items-center justify-between rounded-lg border border-ink-500/60 bg-ink-800/60 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${active ? 'animate-pulse bg-emerald-400' : upcoming ? 'bg-amber-400' : 'bg-slate-600'}`} />
                    <span className="font-bold text-amber-300">{ev.name}</span>
                    <span className="rounded bg-ink-700 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                      {ev.type}
                    </span>
                    <span className="font-mono text-xs text-slate-500">×{ev.multiplier}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {new Date(ev.startsAt).toLocaleString('vi-VN')} → {new Date(ev.endsAt).toLocaleString('vi-VN')} · tạo bởi <span className="text-slate-400">{ev.createdBy}</span>
                  </div>
                </div>
                <button
                  onClick={() => del(ev._id, ev.name)}
                  className="flex items-center gap-1 rounded border border-rose-500/40 px-2 py-1 text-xs font-semibold text-rose-400 hover:bg-rose-500/10"
                >
                  <Trash2 size={12} /> Xoá
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
