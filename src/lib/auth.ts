import { SignJWT, jwtVerify } from 'jose';
import type { Role, SessionUser } from './types';

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'db260bb51eca597cb5170a170a79751d7c0159b18bf09bde3a356e7738657a3c'
);
const COOKIE_NAME = 'fishingmath_admin';

const ADMIN_USERS = (process.env.ADMIN_USERS || 'vvt')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Idk@15832';

/**
 * Định nghĩa role cho 1 username:
 * - Nếu username thuộc ADMIN_USERS env → role = admin (cần mật khẩu)
 * - Ngược lại → role = developer (vào thẳng không cần mật khẩu)
 */
export function resolveRole(username: string): Role {
  return ADMIN_USERS.includes(username.trim().toLowerCase()) ? 'admin' : 'developer';
}

/** Verify password admin. Developer không cần. */
export function verifyAdminPassword(password: string): boolean {
  // So sánh plaintext — CHỈ dùng cho localhost dev tool
  return password === ADMIN_PASSWORD;
}

export async function signSession(user: SessionUser): Promise<string> {
  return await new SignJWT({
    username: user.username,
    role: user.role,
    loginAt: user.loginAt,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET);
}

export async function verifySession(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (typeof payload.username === 'string' && typeof payload.role === 'string') {
      return {
        username: payload.username,
        role: payload.role as Role,
        loginAt: typeof payload.loginAt === 'number' ? payload.loginAt : Date.now(),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function getSessionFromRequest(req: Request): Promise<SessionUser | null> {
  const cookie = req.headers.get('cookie') || '';
  const token = parseCookie(cookie, COOKIE_NAME);
  return await verifySession(token);
}

export function parseCookie(cookieStr: string, name: string): string | undefined {
  const pairs = cookieStr.split(';').map((p) => p.trim());
  for (const p of pairs) {
    const idx = p.indexOf('=');
    if (idx > 0) {
      const k = p.slice(0, idx).trim();
      const v = p.slice(idx + 1).trim();
      if (k === name) return v;
    }
  }
  return undefined;
}

export function setSessionCookie(token: string): string {
  return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${7 * 24 * 60 * 60}`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

export { COOKIE_NAME };
