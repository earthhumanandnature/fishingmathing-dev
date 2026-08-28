import { NextResponse } from 'next/server';
import { ensureAdminIndexes, pingDb } from '@/lib/mongo';
import { resolveRole, setSessionCookie, signSession, verifyAdminPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface Body {
  username?: string;
  password?: string;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const username = (body.username || '').trim();
  const password = (body.password || '').trim();

  if (!username) {
    return NextResponse.json({ error: 'missing_username' }, { status: 400 });
  }
  if (username.length < 2 || username.length > 32) {
    return NextResponse.json({ error: 'invalid_username' }, { status: 400 });
  }
  if (!/^[a-zA-Z0-9_\-\.]+$/.test(username)) {
    return NextResponse.json({ error: 'invalid_username_chars' }, { status: 400 });
  }

  try {
    await ensureAdminIndexes();
  } catch (e) {
    return NextResponse.json(
      { error: 'db_init_failed', message: (e as Error).message },
      { status: 500 }
    );
  }

  const role = resolveRole(username);

  if (role === 'admin') {
    if (!verifyAdminPassword(password)) {
      return NextResponse.json({ error: 'wrong_password' }, { status: 401 });
    }
  }

  const ping = await pingDb();
  if (!ping.ok) {
    return NextResponse.json(
      { error: 'db_unreachable', message: ping.err },
      { status: 500 }
    );
  }

  const session = { username, role, loginAt: Date.now() };
  const token = await signSession(session);

  const res = NextResponse.json({ ok: true, user: session });
  res.headers.set('Set-Cookie', setSessionCookie(token));
  return res;
}
