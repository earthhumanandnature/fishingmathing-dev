import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { auditCol } from '@/lib/mongo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/audit?limit=100 — list audit entries gần nhất.
 */
export async function GET(req: Request) {
  const me = await getSessionFromRequest(req);
  if (!me) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10) || 100, 500);
  const col = await auditCol();
  const list = await col
    .find({}, { projection: { _id: 1, username: 1, role: 1, action: 1, detail: 1, payload: 1, createdAt: 1 } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  const out = list.map((e) => ({ ...e, _id: e._id?.toString() }));
  return NextResponse.json({ entries: out });
}
