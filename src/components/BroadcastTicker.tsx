'use client';

import type { BroadcastEvent } from '@/lib/types';

interface Props {
  feed: BroadcastEvent[];
}

/**
 * Thanh ticker ở đầu dashboard — hiển thị các action realtime gần nhất.
 * Format: "<username>: đã <verb>" hoặc "<username>: <message>"
 */
export function BroadcastTicker({ feed }: Props) {
  const items = [...feed].slice(0, 8).reverse();
  if (items.length === 0) {
    return (
      <header className="flex h-14 items-center gap-3 border-b border-ink-500/60 bg-ink-800/80 px-4 backdrop-blur">
        <span className="rounded-md bg-emerald-500/15 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
          LIVE
        </span>
        <span className="font-mono text-sm text-slate-500">
          Đang chờ hoạt động… (mọi action sẽ hiện tại đây)
        </span>
      </header>
    );
  }

  const doubled = [...items, ...items];

  return (
    <header className="flex h-14 items-center gap-3 overflow-hidden border-b border-ink-500/60 bg-ink-800/80 px-4 backdrop-blur">
      <span className="shrink-0 rounded-md bg-emerald-500/15 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
        ● LIVE
      </span>
      <div className="relative flex-1 overflow-hidden">
        <div className="ticker-track inline-flex gap-6 whitespace-nowrap">
          {doubled.map((ev, i) => (
            <span key={`${ev.id}-${i}`} className="font-mono text-sm">
              <span className="text-amber-300">{ev.text}</span>
              <span className="ml-2 text-[10px] text-slate-600">
                · {new Date(ev.ts).toLocaleTimeString('vi-VN')}
              </span>
              <span className="ml-2 text-slate-700">|</span>
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}
