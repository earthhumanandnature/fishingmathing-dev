import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { savesCol, usersCol } from '@/lib/mongo';
import { broadcast, VERBS } from '@/lib/broadcast';
import { FISH_BY_ID } from '@/lib/game-data';
import type { SaveData } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/users/[username] — chi tiết 1 user + save đầy đủ.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ username: string }> }
) {
  const me = await getSessionFromRequest(req);
  if (!me) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { username } = await ctx.params;

  try {
    const users = await usersCol();
    const saves = await savesCol();
    const u = await users.findOne({ username }, { projection: { _id: 0 } });
    const s = await saves.findOne({ username });

    if (!u && !s) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const annotatedTank =
      s?.saveData?.tankFish?.map((t) => ({
        ...t,
        species: t.speciesId ? FISH_BY_ID[t.speciesId] || null : null,
      })) || [];

    return NextResponse.json({
      user: u ? { username: u.username, createdAt: u.createdAt, updatedAt: u.updatedAt } : null,
      save: s
        ? {
            username: s.username,
            updatedAt: s.updatedAt,
            saveData: s.saveData as SaveData,
            tankFishAnnotated: annotatedTank,
          }
        : null,
    });
  } catch (e) {
    return NextResponse.json(
      { error: 'db_error', message: (e as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/[username]?action=reset|delete
 * - action=reset (default): reset save về trạng thái ban đầu.
 * - action=delete: xoá cả user + save khỏi DB.
 */
export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ username: string }> }
) {
  const me = await getSessionFromRequest(req);
  if (!me) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { username } = await ctx.params;
  const url = new URL(req.url);
  const action = url.searchParams.get('action') || 'reset';

  try {
    const users = await usersCol();
    const saves = await savesCol();

    if (action === 'delete') {
      await users.deleteOne({ username });
      await saves.deleteOne({ username });
    } else {
      const fresh: SaveData = {
        version: 1,
        hasStarted: false,
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
      await saves.updateOne(
        { username },
        { $set: { saveData: fresh, updatedAt: new Date() } },
        { upsert: true }
      );
    }

    await broadcast({
      username: me.username,
      role: me.role,
      action: action === 'delete' ? 'user.delete' : 'user.reset',
      verb: action === 'delete' ? VERBS.banUser(username) : VERBS.resetSave(username),
      audit: true,
      payload: { target: username, action },
    });

    return NextResponse.json({ ok: true, action });
  } catch (e) {
    return NextResponse.json(
      { error: 'db_error', message: (e as Error).message },
      { status: 500 }
    );
  }
}
