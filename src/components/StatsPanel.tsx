'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Database, Users, CalendarPlus, CloudLightning, Megaphone, type LucideIcon } from 'lucide-react';

interface Stats {
  ok: boolean;
  db?: { ms?: number; dbName?: string; err?: string };
  counts?: {
    users: number;
    saves: number;
    activeEvents: number;
    activeWeathers: number;
    messages: number;
  };
  top?: Array<{ username: string; coins: number; totalCatches: number; bestStreak: number }>;
  error?: string;
}

export function StatsPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/stats');
      const d = await r.json();
      setStats(d);
    } catch {
      setStats({ ok: false, error: 'fetch_failed' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-amber-400">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Tổng quan trạng thái MongoDB &amp; hoạt động gần đây.
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-ink-500 bg-ink-800 px-3 py-1.5 text-sm font-semibold text-slate-300 hover:bg-ink-700 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className={`rounded-xl border p-4 ${stats?.ok ? 'border-emerald-500/40 bg-emerald-950/30' : 'border-rose-500/40 bg-rose-950/30'}`}>
        <div className="flex items-center gap-2">
          <Database size={16} className={stats?.ok ? 'text-emerald-400' : 'text-rose-400'} />
          <span className="text-sm font-bold uppercase tracking-wider text-slate-400">
            MongoDB
          </span>
        </div>
        {stats?.ok ? (
          <p className="mt-1 font-mono text-sm text-emerald-300">
            ✓ {stats.db?.dbName} · {stats.db?.ms}ms
          </p>
        ) : (
          <p className="mt-1 font-mono text-sm text-rose-300">
            ✗ {(stats?.db?.err) || stats?.error || 'Lỗi không xác định'}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard icon={Users} label="Users" value={stats?.counts?.users} />
        <StatCard icon={Database} label="Saves" value={stats?.counts?.saves} />
        <StatCard icon={CalendarPlus} label="Events active" value={stats?.counts?.activeEvents} accent="amber" />
        <StatCard icon={CloudLightning} label="Weather active" value={stats?.counts?.activeWeathers} accent="cyan" />
        <StatCard icon={Megaphone} label="Messages" value={stats?.counts?.messages} accent="emerald" />
      </div>

      <div className="rounded-xl border border-ink-500/60 bg-ink-800/60">
        <div className="border-b border-ink-500/60 px-4 py-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-amber-400">
            Top 10 — nhiều hạt sồi nhất
          </h2>
        </div>
        {stats?.top && stats.top.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-2 font-bold">#</th>
                <th className="px-4 py-2 font-bold">Username</th>
                <th className="px-4 py-2 font-bold text-right">Hạt sồi</th>
                <th className="px-4 py-2 font-bold text-right">Cá câu</th>
                <th className="px-4 py-2 font-bold text-right">Streak</th>
              </tr>
            </thead>
            <tbody>
              {stats.top.map((u, i) => (
                <tr key={u.username} className="border-t border-ink-700">
                  <td className="px-4 py-2 font-mono text-slate-500">{i + 1}</td>
                  <td className="px-4 py-2 font-mono text-amber-300">{u.username}</td>
                  <td className="px-4 py-2 text-right font-mono text-amber-400">{u.coins}</td>
                  <td className="px-4 py-2 text-right text-slate-300">{u.totalCatches}</td>
                  <td className="px-4 py-2 text-right text-orange-400">{u.bestStreak}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-4 py-6 text-center text-sm text-slate-500">
            Chưa có save nào.
          </p>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent = 'slate',
}: {
  icon: LucideIcon;
  label: string;
  value?: number;
  accent?: 'slate' | 'amber' | 'cyan' | 'emerald';
}) {
  const accentMap: Record<string, string> = {
    slate: 'text-slate-300',
    amber: 'text-amber-400',
    cyan: 'text-cyan-400',
    emerald: 'text-emerald-400',
  };
  return (
    <div className="rounded-xl border border-ink-500/60 bg-ink-800/60 p-4">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon size={14} />
        <span className="text-[11px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className={`mt-1 font-mono text-2xl font-extrabold ${accentMap[accent]}`}>
        {value ?? '—'}
      </div>
    </div>
  );
}
