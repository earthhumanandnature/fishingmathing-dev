'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { BroadcastTicker } from '@/components/BroadcastTicker';
import { EventsPanel } from '@/components/EventsPanel';
import { WeatherPanel } from '@/components/WeatherPanel';
import { FishAdminPanel } from '@/components/FishAdminPanel';
import { UsersPanel } from '@/components/UsersPanel';
import { InventoryPanel } from '@/components/InventoryPanel';
import { MessagesPanel } from '@/components/MessagesPanel';
import { AuditPanel } from '@/components/AuditPanel';
import { StatsPanel } from '@/components/StatsPanel';
import type { BroadcastEvent, SessionUser } from '@/lib/types';

export type TabId =
  | 'dashboard'
  | 'events'
  | 'weather'
  | 'fish'
  | 'inventory'
  | 'users'
  | 'messages'
  | 'audit';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [tab, setTab] = useState<TabId>('dashboard');
  const [feed, setFeed] = useState<BroadcastEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (!d?.user) {
          router.replace('/');
          return;
        }
        setUser(d.user);
        setLoading(false);
      })
      .catch(() => router.replace('/'));
  }, [router]);

  useEffect(() => {
    if (!user) return;
    const es = new EventSource('/api/broadcast/stream');
    es.addEventListener('message', (e) => {
      try {
        const payload = JSON.parse((e as MessageEvent).data);
        if (payload?.type === 'broadcast' && payload?.event) {
          setFeed((prev) => {
            const next = [payload.event, ...prev];
            return next.slice(0, 50);
          });
        }
      } catch {
        /* ignore */
      }
    });
    es.onerror = () => {
      // EventSource natively retries
    };
    return () => es.close();
  }, [user]);

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center text-slate-500">
        <div className="font-mono text-sm">Đang tải console…</div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-ink-900">
      <BroadcastTicker feed={feed} />

      <div className="flex min-h-[calc(100vh-56px)]">
        <Sidebar
          user={user}
          tab={tab}
          setTab={setTab}
          onLogout={async () => {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.replace('/');
          }}
        />

        <main className="flex-1 overflow-x-hidden px-6 py-6">
          {tab === 'dashboard' && <StatsPanel />}
          {tab === 'events' && <EventsPanel />}
          {tab === 'weather' && <WeatherPanel />}
          {tab === 'fish' && <FishAdminPanel />}
          {tab === 'inventory' && <InventoryPanel />}
          {tab === 'users' && <UsersPanel />}
          {tab === 'messages' && <MessagesPanel />}
          {tab === 'audit' && <AuditPanel />}
        </main>
      </div>

      <aside className="fixed bottom-4 right-4 z-40 hidden w-80 rounded-xl border border-ink-500/60 bg-ink-800/95 p-3 shadow-2xl backdrop-blur xl:block">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">
            Live Feed
          </h3>
          <span className="flex items-center gap-1 text-[10px] text-emerald-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            realtime
          </span>
        </div>
        <ul className="max-h-64 space-y-1.5 overflow-y-auto pr-1 text-xs">
          {feed.length === 0 && (
            <li className="text-slate-500">Chưa có hoạt động nào…</li>
          )}
          {feed.map((ev) => (
            <li
              key={ev.id}
              className="rounded border-l-2 border-amber-500/40 bg-ink-900/60 px-2 py-1 font-mono"
            >
              <span className="text-amber-300">{ev.text}</span>
              <span className="ml-2 text-[10px] text-slate-600">
                {new Date(ev.ts).toLocaleTimeString('vi-VN')}
              </span>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
