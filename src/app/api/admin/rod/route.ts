import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { savesCol } from '@/lib/mongo';
import { broadcast, VERBS } from '@/lib/broadcast';
import type { AncientRodState, SaveData } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/rod
 * Body: { username, has: boolean, level?: number, durationMs?: number }
 *
 * - has=true  → set ancientRod = { expiresAt: now+durationMs, level }
 *   • level mặc định = 1 (cho rod hoạt động ngay, vì level 0 = rod không có hiệu lực)
 *   • durationMs mặc định = 7 ngày
 * - has=false → set ancientRod = null (thu hồi)
 *
 * QUAN TRỌNG: ancientRod phải là OBJECT (AncientRodState) hoặc null.
 * Game chính types.ts định nghĩa `ancientRod: AncientRodState | null` — nếu admin set
 * boolean true, game migration sẽ reset về null (xem storage.ts line 58).
 */
export async function POST(req: Request) {
  const me = await getSessionFromRequest(req);
  if (!me) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { username?: string; has?: boolean; level?: number; durationMs?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const username = (body.username || '').trim();
  const has = !!body.has;
  if (!username) {
    return NextResponse.json({ error: 'missing_username' }, { status: 400 });
  }

  const ROD_MAX_LEVEL = 10;
  const DAY = 24 * 60 * 60 * 1000;
  const level = Math.max(0, Math.min(ROD_MAX_LEVEL, Math.trunc(Number(body.level ?? 1)) || 1));
  const durationMs = Math.max(60_000, Math.min(365 * DAY, Number(body.durationMs ?? 7 * DAY)));

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
        ancientRod: has ? { expiresAt: Date.now() + durationMs, level } : null,
        scrapIron: 0,
        glass: 0,
        tankLevel: 0,
        foodBoxes: {},
      };
      await saves.insertOne({ username, saveData: fresh, updatedAt: new Date() });
    } else {
      const sd: SaveData = saveDoc.saveData as SaveData;
      if (has) {
        const rod: AncientRodState = {
          expiresAt: Date.now() + durationMs,
          level,
        };
        sd.ancientRod = rod;
      } else {
        sd.ancientRod = null;
      }
      await saves.updateOne(
        { username },
        { $set: { saveData: sd, updatedAt: new Date() } }
      );
    }

    await broadcast({
      username: me.username,
      role: me.role,
      action: 'admin.give_rod',
      verb: VERBS.giveRod(username, has),
      audit: true,
      payload: { target: username, has, level, durationMs },
    });

    return NextResponse.json({
      ok: true,
      has,
      ancientRod: has ? { expiresAt: Date.now() + durationMs, level } : null,
    });
  } catch (e) {
    return NextResponse.json(
      { error: 'db_error', message: (e as Error).message },
      { status: 500 }
    );
  }
}
