import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { savesCol } from '@/lib/mongo';
import { broadcast, VERBS } from '@/lib/broadcast';
import { FISH_BY_ID } from '@/lib/game-data';
import type { SaveData } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/fish/delete
 * Body: { username, uid }  hoặc  { username, speciesId, all?: true }
 */
export async function POST(req: Request) {
  const me = await getSessionFromRequest(req);
  if (!me) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { username?: string; uid?: string; speciesId?: string; all?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const username = (body.username || '').trim();
  if (!username) {
    return NextResponse.json({ error: 'missing_username' }, { status: 400 });
  }
  if (!body.uid && !body.speciesId) {
    return NextResponse.json({ error: 'missing_uid_or_species' }, { status: 400 });
  }

  try {
    const saves = await savesCol();
    const saveDoc = await saves.findOne({ username });
    if (!saveDoc) {
      return NextResponse.json({ error: 'no_save' }, { status: 404 });
    }
    const sd: SaveData = saveDoc.saveData as SaveData;
    sd.tankFish = sd.tankFish || [];
    sd.fishCaught = sd.fishCaught || {};

    let removed = 0;
    let speciesName = '';
    let emoji = '';

    if (body.uid) {
      const idx = sd.tankFish.findIndex((t) => t.uid === body.uid);
      if (idx < 0) return NextResponse.json({ error: 'uid_not_found' }, { status: 404 });
      const [removedFish] = sd.tankFish.splice(idx, 1);
      removed = 1;
      const species = removedFish.speciesId ? FISH_BY_ID[removedFish.speciesId] : null;
      speciesName = species?.name || removedFish.speciesId || 'cá';
      emoji = species?.emoji || '🐟';
      const rec = sd.fishCaught[removedFish.speciesId];
      if (rec) {
        rec.count = Math.max(0, rec.count - 1);
      }
    } else if (body.speciesId) {
      const before = sd.tankFish.length;
      sd.tankFish = sd.tankFish.filter((t) => t.speciesId !== body.speciesId);
      removed = before - sd.tankFish.length;
      const species = FISH_BY_ID[body.speciesId];
      speciesName = species?.name || body.speciesId;
      emoji = species?.emoji || '🐟';
      if (body.all) {
        delete sd.fishCaught[body.speciesId];
      } else if (sd.fishCaught[body.speciesId]) {
        sd.fishCaught[body.speciesId].count = Math.max(0, (sd.fishCaught[body.speciesId].count || 0) - removed);
      }
    }

    sd.totalCatches = Math.max(0, (sd.totalCatches || 0) - removed);

    await saves.updateOne(
      { username },
      { $set: { saveData: sd, updatedAt: new Date() } }
    );

    await broadcast({
      username: me.username,
      role: me.role,
      action: 'fish.delete',
      verb: VERBS.deleteFish(username, `${emoji} ${speciesName}`),
      audit: true,
      payload: { target: username, uid: body.uid, speciesId: body.speciesId, removed },
    });

    return NextResponse.json({ ok: true, removed, tankSize: sd.tankFish.length });
  } catch (e) {
    return NextResponse.json(
      { error: 'db_error', message: (e as Error).message },
      { status: 500 }
    );
  }
}
