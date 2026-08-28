import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { weatherCol } from '@/lib/mongo';
import { broadcast, VERBS } from '@/lib/broadcast';
import { MUTATION_BY_ID } from '@/lib/game-data';
import type { AdminWeather } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/weather — list weather + auto-expire.
 */
export async function GET(req: Request) {
  const me = await getSessionFromRequest(req);
  if (!me) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const col = await weatherCol();
  const now = new Date();
  await col.updateMany(
    { active: true, expiresAt: { $lt: now } },
    { $set: { active: false } }
  );

  const list = await col
    .find({}, { projection: { _id: 1, mutationId: 1, multiplier: 1, startsAt: 1, expiresAt: 1, active: 1, createdBy: 1, createdAt: 1 } })
    .sort({ createdAt: -1 })
    .limit(200)
    .toArray();

  const out = list.map((w) => ({
    ...w,
    _id: w._id?.toString(),
    mutation: w.mutationId ? MUTATION_BY_ID[w.mutationId] || null : null,
  }));
  return NextResponse.json({ weathers: out });
}

/**
 * POST /api/weather — kích hoạt weather boost mutation.
 */
export async function POST(req: Request) {
  const me = await getSessionFromRequest(req);
  if (!me) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { mutationId?: string; multiplier?: number; durationMin?: number; startsAt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const mutationId = (body.mutationId || '').trim();
  if (!MUTATION_BY_ID[mutationId]) {
    return NextResponse.json({ error: 'unknown_mutation', available: Object.keys(MUTATION_BY_ID) }, { status: 400 });
  }

  const multiplier = typeof body.multiplier === 'number' ? Math.max(0.01, Math.min(5, body.multiplier)) : 0.3;
  const durationMin = typeof body.durationMin === 'number' ? Math.max(1, Math.min(60 * 24 * 7, body.durationMin)) : 60;
  const startsAt = body.startsAt ? new Date(body.startsAt) : new Date();
  if (isNaN(startsAt.getTime())) return NextResponse.json({ error: 'invalid_start' }, { status: 400 });
  const expiresAt = new Date(startsAt.getTime() + durationMin * 60 * 1000);

  const col = await weatherCol();
  const insert: AdminWeather = {
    mutationId,
    multiplier,
    startsAt,
    expiresAt,
    active: true,
    createdBy: me.username,
    createdAt: new Date(),
  };
  const result = await col.insertOne(insert);

  const m = MUTATION_BY_ID[mutationId];
  await broadcast({
    username: me.username,
    role: me.role,
    action: 'weather.activate',
    verb: VERBS.activateWeather(`${m.emoji} ${m.name}`, multiplier),
    audit: true,
    payload: { weatherId: result.insertedId?.toString(), mutationId, multiplier, startsAt, expiresAt },
  });

  return NextResponse.json({
    ok: true,
    weather: { ...insert, _id: result.insertedId?.toString(), mutation: m },
  });
}
