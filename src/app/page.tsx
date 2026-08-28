'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Admin usernames list — client heuristic (server check lại).
  const ADMIN_HINTS = ['vvt'];
  const needsPassword = ADMIN_HINTS.includes(username.trim().toLowerCase());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.error === 'wrong_password') {
          setError('Mật khẩu admin sai. Thử lại.');
        } else if (data?.error === 'db_unreachable' || data?.error === 'db_init_failed') {
          setError(`Lỗi MongoDB: ${data?.message || data?.error}`);
        } else {
          setError(`Lỗi: ${data?.error || res.statusText}`);
        }
        return;
      }
      router.push('/dashboard');
    } catch (e) {
      setError(`Network error: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bg-grid flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-ink-500/60 bg-ink-800/80 p-8 shadow-2xl backdrop-blur">
        <div className="mb-6 flex items-center gap-3">
          <img src="/logo.svg" alt="logo" width={40} height={40} className="rounded-lg" />
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-amber-400">
              Math Fishing
            </h1>
            <p className="text-xs font-mono text-slate-400">admin console · localhost only</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Tên tài khoản
            </label>
            <input
              type="text"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin hoặc username dev"
              className="w-full rounded-lg border border-ink-500 bg-ink-900 px-4 py-2.5 font-mono text-sm text-amber-300 placeholder:text-slate-600 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              required
            />
            <p className="mt-1.5 text-[11px] text-slate-500">
              {needsPassword
                ? '⚡ Tài khoản admin — cần mật khẩu.'
                : '✓ Developer — vào thẳng không cần mật khẩu.'}
            </p>
          </div>

          <div className={needsPassword ? 'block' : 'hidden'}>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Mật khẩu admin
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-ink-500 bg-ink-900 px-4 py-2.5 font-mono text-sm text-amber-300 placeholder:text-slate-600 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              required={needsPassword}
            />
          </div>

          {error && (
            <div className="rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm font-semibold text-rose-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-amber-500 px-4 py-2.5 font-bold text-ink-900 transition hover:bg-amber-400 disabled:opacity-50"
          >
            {loading ? 'Đang vào…' : 'Vào console'}
          </button>
        </form>

        <div className="mt-6 border-t border-ink-500/40 pt-4 text-[11px] leading-relaxed text-slate-500">
          <p>
            <span className="font-bold text-amber-400">Admin</span>: nhập username admin + mật khẩu.
          </p>
          <p>
            <span className="font-bold text-emerald-400">Developer</span>: nhập username bất kỳ → vào thẳng (không cần mật khẩu).
          </p>
        </div>
      </div>
    </main>
  );
}
