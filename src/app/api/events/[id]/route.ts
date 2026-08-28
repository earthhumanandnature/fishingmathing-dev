import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { eventsCol } from '@/lib/mongo';
import { broadcast, VERBS } from '@/lib/broadcast';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * DELETE /api/events/[id] — xoá event.
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

  const col = await eventsCol();
  const { ObjectId } = await import('mongodb');
  let oid;
  try {
    oid = new ObjectId(id);
  } catch {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  const existing = await col.findOne({ _id: oid as never });
  if (!existing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  await col.deleteOne({ _id: oid as never });

  await broadcast({
    username: me.username,
    role: me.role,
    action: 'event.delete',
    verb: VERBS.deleteEvent(existing.name || id),
    audit: true,
    payload: { eventId: id, name: existing.name, type: existing.type },
  });

  return NextResponse.json({ ok: true });
}
