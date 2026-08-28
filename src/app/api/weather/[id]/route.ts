import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { weatherCol } from '@/lib/mongo';
import { broadcast, VERBS } from '@/lib/broadcast';
import { MUTATION_BY_ID } from '@/lib/game-data';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * DELETE /api/weather/[id] — tắt/xoá weather boost.
 */
export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const me = await getSessionFromRequest(req);
  if (!me) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id } = await ctx.params;

  const { ObjectId } = await import('mongodb');
  let oid;
  try {
    oid = new ObjectId(id);
  } catch {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  const col = await weatherCol();
  const existing = await col.findOne({ _id: oid as never });
  if (!existing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  await col.deleteOne({ _id: oid as never });

  const m = existing.mutationId ? MUTATION_BY_ID[existing.mutationId] : null;
  const label = m ? `${m.emoji} ${m.name}` : existing.mutationId;
  await broadcast({
    username: me.username,
    role: me.role,
    action: 'weather.deactivate',
    verb: VERBS.deactivateWeather(label),
    audit: true,
    payload: { weatherId: id, mutationId: existing.mutationId },
  });

  return NextResponse.json({ ok: true });
}
