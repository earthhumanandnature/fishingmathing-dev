import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { eventsCol } from '@/lib/mongo';
import { broadcast, VERBS } from '@/lib/broadcast';
import type { AdminEvent } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/events — list event gần nhất.
 */
export async function GET(req: Request) {
  const me = await getSessionFromRequest(req);
  if (!me) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const col = await eventsCol();
  const list = await col
    .find({}, { projection: { _id: 1, name: 1, type: 1, multiplier: 1, startsAt: 1, endsAt: 1, active: 1, createdBy: 1, createdAt: 1 } })
    .sort({ createdAt: -1 })
    .limit(200)
    .toArray();
  const out = list.map((e) => ({ ...e, _id: e._id?.toString() }));
  return NextResponse.json({ events: out });
}

/**
 * POST /api/events — tạo event mới.
 */
export async function POST(req: Request) {
  const me = await getSessionFromRequest(req);
  if (!me) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    name?: string;
    type?: string;
    multiplier?: number;
    startsAt?: string;
    endsAt?: string;
    active?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const name = (body.name || '').trim();
  if (!name) return NextResponse.json({ error: 'missing_name' }, { status: 400 });

  const type = ['bonus_coins', 'luck_boost', 'double_catch', 'ancient_rod', 'custom'].includes(body.type || '')
    ? (body.type as AdminEvent['type'])
    : 'custom';

  const multiplier = typeof body.multiplier === 'number' ? Math.max(0.1, Math.min(10, body.multiplier)) : 1;
  const startsAt = body.startsAt ? new Date(body.startsAt) : new Date();
  const endsAt = body.endsAt
    ? new Date(body.endsAt)
    : new Date(startsAt.getTime() + 24 * 60 * 60 * 1000);
  const active = body.active ?? true;

  if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime())) {
    return NextResponse.json({ error: 'invalid_dates' }, { status: 400 });
  }

  const col = await eventsCol();
  const insert: AdminEvent = {
    name,
    type,
    multiplier,
    startsAt,
    endsAt,
    active,
    createdBy: me.username,
    createdAt: new Date(),
  };
  const result = await col.insertOne(insert);

  await broadcast({
    username: me.username,
    role: me.role,
    action: 'event.create',
    verb: VERBS.createEvent(name),
    audit: true,
    payload: { eventId: result.insertedId?.toString(), name, type, multiplier, startsAt, endsAt, active },
  });

  return NextResponse.json({
    ok: true,
    event: { ...insert, _id: result.insertedId?.toString() },
  });
}
