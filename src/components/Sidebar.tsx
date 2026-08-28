'use client';

import type { SessionUser } from '@/lib/types';
import type { TabId } from '@/app/dashboard/page';
import {
  LayoutDashboard,
  CalendarPlus,
  CloudLightning,
  Fish,
  Users,
  Megaphone,
  ScrollText,
  LogOut,
  Gift,
  type LucideIcon,
} from 'lucide-react';

interface Props {
  user: SessionUser;
  tab: TabId;
  setTab: (t: TabId) => void;
  onLogout: () => void;
}

const ITEMS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'events', label: 'Events', icon: CalendarPlus },
  { id: 'weather', label: 'Weather', icon: CloudLightning },
  { id: 'fish', label: 'Give / Delete Fish', icon: Fish },
  { id: 'inventory', label: 'Inventory Admin', icon: Gift },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'messages', label: 'Global Message', icon: Megaphone },
  { id: 'audit', label: 'Audit Log', icon: ScrollText },
];

export function Sidebar({ user, tab, setTab, onLogout }: Props) {
  return (
    <aside className="flex w-60 flex-col border-r border-ink-500/60 bg-ink-800/60">
      <div className="flex items-center gap-2.5 border-b border-ink-500/60 px-5 py-4">
        <img src="/logo.svg" alt="logo" width={32} height={32} />
        <div>
          <div className="text-sm font-extrabold text-amber-400">Math Fishing</div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
            admin console
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                active
                  ? 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/40'
                  : 'text-slate-400 hover:bg-ink-700/60 hover:text-slate-200'
              }`}
            >
              <Icon size={16} className={active ? 'text-amber-400' : 'text-slate-500'} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-ink-500/60 p-3">
        <div className="mb-2 rounded-lg bg-ink-900/60 px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-sm font-extrabold text-amber-300">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-slate-200">
                {user.username}
              </div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                {user.role === 'admin' ? '🔐 admin' : '⌨ developer'}
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-rose-500/40 px-3 py-2 text-sm font-semibold text-rose-400 transition hover:bg-rose-500/10"
        >
          <LogOut size={14} /> Đăng xuất
        </button>
      </div>
    </aside>
  );
}
