import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSessionFromRequest } from '@/lib/auth';
import { usersCol } from '@/lib/mongo';
import { broadcast, VERBS } from '@/lib/broadcast';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/password
 * Body: { username, newPassword }
 *
 * Đổi mật khẩu của BẤT KỲ user nào (dùng cho admin support).
 * - Validate username 3-20 ký tự, không ký tự đặc biệt.
 * - Validate password 4-64 ký tự.
 * - Hash bằng bcrypt (cost 10) — cùng quy tắc với route /api/auth/register.
 */
export async function POST(req: Request) {
  const me = await getSessionFromRequest(req);
  if (!me) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { username?: string; newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const username = (body.username || '').trim();
  const newPassword = body.newPassword || '';

  if (!/^[a-zA-Z0-9_À-ỹ]{3,20}$/.test(username)) {
    return NextResponse.json(
      { error: 'Tên đăng nhập 3-20 ký tự, không chứa ký tự đặc biệt' },
      { status: 400 }
    );
  }
  if (newPassword.length < 4 || newPassword.length > 64) {
    return NextResponse.json(
      { error: 'Mật khẩu từ 4 đến 64 ký tự' },
      { status: 400 }
    );
  }

  try {
    const users = await usersCol();
    const existing = await users.findOne({ username });
    if (!existing) {
      return NextResponse.json({ error: 'user_not_found' }, { status: 404 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await users.updateOne(
      { username },
      { $set: { passwordHash, updatedAt: new Date() } }
    );

    await broadcast({
      username: me.username,
      role: me.role,
      action: 'admin.change_password',
      verb: VERBS.changePassword(username),
      audit: true,
      payload: { target: username, by: me.username },
    });

    return NextResponse.json({ ok: true, username });
  } catch (e) {
    return NextResponse.json(
      { error: 'db_error', message: (e as Error).message },
      { status: 500 }
    );
  }
}
