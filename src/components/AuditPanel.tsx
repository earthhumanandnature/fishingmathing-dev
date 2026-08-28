'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

interface Entry {
  _id: string;
  username: string;
  role: string;
  action: string;
  detail: string;
  payload?: unknown;
  createdAt: string;
}

const ACTION_COLORS: Record<string, string> = {
  'event.create': 'text-amber-300',
  'event.delete': 'text-rose-300',
  'weather.activate': 'text-cyan-300',
  'weather.deactivate': 'text-slate-400',
  'fish.give': 'text-emerald-300',
  'fish.delete': 'text-rose-300',
  'global.message': 'text-purple-300',
  'user.reset': 'text-orange-300',
  'user.delete': 'text-rose-400',
};

export function AuditPanel() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const r = await fetch('/api/audit?limit=200');
      const d = await r.json();
      setEntries(d.entries || []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-amber-400">Audit Log</h1>
          <p className="text-sm text-slate-500">
            Mọi action của admin/dev đều được lưu lại.
          </p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-1.5 rounded-lg border border-ink-500 bg-ink-800 px-3 py-1.5 text-sm font-semibold text-slate-300 hover:bg-ink-700"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="rounded-xl border border-ink-500/60 bg-ink-800/60">
        {entries.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">
            Chưa có action nào.
          </p>
        ) : (
          <ul className="divide-y divide-ink-700">
            {entries.map((e) => (
              <li key={e._id} className="px-4 py-2.5">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 rounded bg-ink-900/60 px-1.5 py-0.5 font-mono text-[10px] uppercase text-slate-500">
                    {e.role}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-sm font-bold text-amber-300">
                        {e.username}
                      </span>
                      <span className="text-slate-500">·</span>
                      <span className={`font-mono text-xs ${ACTION_COLORS[e.action] || 'text-slate-300'}`}>
                        {e.action}
                      </span>
                      <span className="ml-auto text-[10px] text-slate-600">
                        {new Date(e.createdAt).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-slate-300">{e.detail}</p>
                    {e.payload !== undefined && (
                      <button
                        onClick={() => setOpen(open === e._id ? null : e._id)}
                        className="mt-1 text-[11px] text-slate-500 hover:text-amber-300"
                      >
                        {open === e._id ? '▾ ẩn payload' : '▸ xem payload'}
                      </button>
                    )}
                    {open === e._id && (
                      <pre className="mt-1 overflow-x-auto rounded border border-ink-700 bg-ink-900/60 p-2 font-mono text-[11px] text-slate-400">
                        {JSON.stringify(e.payload, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
