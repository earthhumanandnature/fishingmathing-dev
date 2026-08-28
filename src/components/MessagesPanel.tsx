'use client';

import { useEffect, useState } from 'react';
import { Send, RefreshCw } from 'lucide-react';

interface Message {
  _id: string;
  username: string;
  role: string;
  message: string;
  createdAt: string;
}

export function MessagesPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const r = await fetch('/api/messages');
      const d = await r.json();
      setMessages(d.messages || []);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d?.error || 'Lỗi gửi');
        return;
      }
      setText('');
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-amber-400">Global Message</h1>
        <p className="text-sm text-slate-500">
          Gửi tin nhắn realtime tới tất cả tab đang bật. Format:{' '}
          <code className="rounded bg-ink-800 px-1 text-amber-300">
            &lt;tên admin&gt;: &lt;message&gt;
          </code>
        </p>
      </div>

      <form onSubmit={send} className="rounded-xl border border-ink-500/60 bg-ink-800/60 p-4">
        <label className="block">
          <span className="text-xs font-bold text-slate-400">Nội dung (max 500 ký tự)</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 500))}
            placeholder="Vd: Hệ thống bảo trì lúc 22:00 hôm nay."
            rows={3}
            className="mt-1 w-full rounded border border-ink-500 bg-ink-900 px-3 py-2 text-sm text-amber-300"
          />
          <div className="mt-1 text-right text-[10px] text-slate-500">{text.length}/500</div>
        </label>
        {error && (
          <div className="mt-2 rounded border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-300">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={submitting || !text.trim()}
          className="mt-2 flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-ink-900 hover:bg-amber-400 disabled:opacity-50"
        >
          <Send size={14} /> {submitting ? 'Đang gửi…' : 'Gửi broadcast'}
        </button>
      </form>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Lịch sử message ({messages.length})
        </h2>
        <button onClick={refresh} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> refresh
        </button>
      </div>

      {messages.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-500/60 p-8 text-center text-sm text-slate-500">
          Chưa có message nào.
        </div>
      ) : (
        <ul className="space-y-1.5">
          {messages.map((m) => (
            <li
              key={m._id}
              className="flex items-start gap-3 rounded border-l-2 border-amber-500/60 bg-ink-800/60 px-3 py-2"
            >
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                m.role === 'admin' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
              }`}>
                {m.role}
              </span>
              <span className="font-mono text-sm text-amber-300">{m.username}</span>
              <span className="text-slate-500">:</span>
              <span className="flex-1 text-sm text-slate-200">{m.message}</span>
              <span className="text-[10px] text-slate-600">
                {new Date(m.createdAt).toLocaleString('vi-VN')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
