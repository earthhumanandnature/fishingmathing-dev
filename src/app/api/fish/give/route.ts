import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { savesCol } from '@/lib/mongo';
import { broadcast, VERBS } from '@/lib/broadcast';
import { FISH_BY_ID, MUTATIONS } from '@/lib/game-data';
import type { SaveData, TankFish } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/fish/give
 * Body: { username, speciesId, weight?, mutations?: string[], count? }
 */
export async function POST(req: Request) {
  const me = await getSessionFromRequest(req);
  if (!me) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    username?: string;
    speciesId?: string;
    weight?: number;
    mutations?: string[];
    count?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const username = (body.username || '').trim();
  const speciesId = (body.speciesId || '').trim();
  if (!username || !speciesId) {
    return NextResponse.json({ error: 'missing_username_or_species' }, { status: 400 });
  }
  const species = FISH_BY_ID[speciesId];
  if (!species) {
    return NextResponse.json({ error: 'unknown_species' }, { status: 400 });
  }

  const mutIds = (body.mutations || []).filter((m) => MUTATIONS.some((mm) => mm.id === m));
  const count = Math.max(1, Math.min(50, body.count || 1));

  const weight =
    typeof body.weight === 'number' && body.weight > 0
      ? body.weight
      : Math.round((species.minWeight + Math.random() * (species.maxWeight - species.minWeight)) * 100) / 100;

  try {
    const saves = await savesCol();
    let saveDoc = await saves.findOne({ username });
    if (!saveDoc) {
      const fresh: SaveData = {
        version: 1,
        hasStarted: true,
        playerName: username,
        avatar: '',
        character: 'lac',
        coins: 0,
        totalCatches: 0,
        totalFails: 0,
        currentStreak: 0,
        bestStreak: 0,
        difficulty: 'easy',
        soundOn: true,
        fishCaught: {},
        tankFish: [],
        bestCatch: null,
        achievements: [],
        problemsSolved: 0,
        coinsEarned: 0,
      };
      await saves.insertOne({ username, saveData: fresh, updatedAt: new Date() });
      saveDoc = (await saves.findOne({ username }))!;
    }

    const sd: SaveData = saveDoc.saveData as SaveData;
    sd.tankFish = sd.tankFish || [];
    sd.fishCaught = sd.fishCaught || {};

    const now = Date.now();
    for (let i = 0; i < count; i++) {
      const w = count === 1 ? weight : Math.round((species.minWeight + Math.random() * (species.maxWeight - species.minWeight)) * 100) / 100;
      const uid = `admin-${now}-${i}-${Math.random().toString(36).slice(2, 7)}`;
      const tf: TankFish = { uid, speciesId, weight: w, addedAt: now };
      sd.tankFish.push(tf);

      const cur = sd.fishCaught[speciesId] || { count: 0, bestWeight: 0, mutations: [] };
      cur.count += 1;
      if (w > cur.bestWeight) cur.bestWeight = w;
      for (const m of mutIds) {
        if (!cur.mutations.includes(m)) cur.mutations.push(m);
      }
      sd.fishCaught[speciesId] = cur;
    }

    const MAX_TANK = 50;
    if (sd.tankFish.length > MAX_TANK) {
      sd.tankFish = sd.tankFish.slice(-MAX_TANK);
    }

    sd.totalCatches = (sd.totalCatches || 0) + count;

    await saves.updateOne(
      { username },
      { $set: { saveData: sd, updatedAt: new Date() } }
    );

    await broadcast({
      username: me.username,
      role: me.role,
      action: 'fish.give',
      verb: VERBS.giveFish(username, `${species.emoji} ${species.name}`),
      audit: true,
      payload: { target: username, speciesId, weight, mutations: mutIds, count },
    });

    return NextResponse.json({
      ok: true,
      given: { speciesId, weight, mutations: mutIds, count },
      tankSize: sd.tankFish.length,
    });
  } catch (e) {
    return NextResponse.json(
      { error: 'db_error', message: (e as Error).message },
      { status: 500 }
    );
  }
}
