import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { savesCol } from '@/lib/mongo';
import { broadcast, VERBS } from '@/lib/broadcast';
import type { SaveData } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/tank
 * Body: { username, action: 'upgrade' | 'downgrade' | 'set', level?: number }
 *
 * Game chính types.ts:
 *   TANK_CAPACITY = 10  (bể cấp 0 chứa 10 con)
 *   TANK_MAX_LEVEL = 10 (tối đa cấp 10)
 *   tankCapacityForLevel(level) = 10 + level * 5  (cấp 1 = 15, cấp 10 = 60)
 *
 * - action=upgrade   → tăng 1 cấp (tối đa 10)
 * - action=downgrade → giảm 1 cấp (tối thiểu 0)
 * - action=set       → set trực tiếp = body.level (0..10)
 *
 * QUAN TRỌNG: Không set tankCapacity — game chính tự tính bằng helper
 * `tankCapacity(save) = tankCapacityForLevel(save.tankLevel)`.
 */
export async function POST(req: Request) {
  const me = await getSessionFromRequest(req);
  if (!me) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { username?: string; action?: string; level?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const username = (body.username || '').trim();
  const action = (body.action || 'upgrade').trim();
  if (!username) {
    return NextResponse.json({ error: 'missing_username' }, { status: 400 });
  }

  const TANK_CAPACITY = 10;
  const TANK_MAX_LEVEL = 10;

  function capacityFor(level: number): number {
    return TANK_CAPACITY + Math.max(0, level) * 5;
  }

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
        shells: 0,
        ancientRod: null,
        scrapIron: 0,
        glass: 0,
        tankLevel: 0,
        foodBoxes: {},
      };
      await saves.insertOne({ username, saveData: fresh, updatedAt: new Date() });
      saveDoc = (await saves.findOne({ username }))!;
    }

    const sd: SaveData = saveDoc.saveData as SaveData;
    const curLevel = Math.max(0, Math.min(TANK_MAX_LEVEL, sd.tankLevel ?? 0));
    let nextLevel = curLevel;

    if (action === 'upgrade') {
      nextLevel = Math.min(TANK_MAX_LEVEL, curLevel + 1);
    } else if (action === 'downgrade') {
      nextLevel = Math.max(0, curLevel - 1);
    } else if (action === 'set') {
      const requested = Math.max(0, Math.min(TANK_MAX_LEVEL, Math.trunc(Number(body.level ?? curLevel)) || curLevel));
      nextLevel = requested;
    } else {
      return NextResponse.json({ error: 'invalid_action' }, { status: 400 });
    }

    sd.tankLevel = nextLevel;
    // KHÔNG set tankCapacity — game chính tự tính

    await saves.updateOne(
      { username },
      { $set: { saveData: sd, updatedAt: new Date() } }
    );

    await broadcast({
      username: me.username,
      role: me.role,
      action: 'admin.tank',
      verb: VERBS.upgradeTank(username, nextLevel),
      audit: true,
      payload: {
        target: username,
        before: curLevel,
        after: nextLevel,
        capacity: capacityFor(nextLevel),
      },
    });

    return NextResponse.json({
      ok: true,
      before: curLevel,
      after: nextLevel,
      capacity: capacityFor(nextLevel),
      maxLevel: TANK_MAX_LEVEL,
    });
  } catch (e) {
    return NextResponse.json(
      { error: 'db_error', message: (e as Error).message },
      { status: 500 }
    );
  }
}
