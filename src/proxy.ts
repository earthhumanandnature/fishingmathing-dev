import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession, COOKIE_NAME } from '@/lib/auth';

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Bảo vệ /dashboard — yêu cầu session
  if (pathname.startsWith('/dashboard')) {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    const user = await verifySession(token);
    if (!user) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

  // Nếu đã login rồi mà vào /, redirect sang /dashboard
  if (pathname === '/') {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    const user = await verifySession(token);
    if (user) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/dashboard/:path*'],
};
