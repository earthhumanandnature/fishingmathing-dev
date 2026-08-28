import { NextResponse } from 'next/server';
import { getActiveUriMasked, getDbName, pingDb } from '@/lib/mongo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/health — diagnostic endpoint (không cần login, dùng để debug lỗi kết nối).
 * Trả về: URI đang active (mask password), ping status, dbName.
 */
export async function GET() {
  const ping = await pingDb();
  return NextResponse.json({
    ok: ping.ok,
    db: ping,
    activeUri: getActiveUriMasked(),
    dbName: getDbName(),
    envUriPresent: Boolean((process.env.MONGODB_URI || '').trim()),
    hint: ping.ok
      ? 'MongoDB OK'
      : 'Không kết nối được MongoDB. Kiểm tra mạng / Atlas IP whitelist (0.0.0.0/0).',
  });
}
