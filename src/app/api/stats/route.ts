import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { eventsCol, messagesCol, pingDb, savesCol, usersCol, weatherCol } from '@/lib/mongo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/stats — global overview cho dashboard.
 */
export async function GET(req: Request) {
  const me = await getSessionFromRequest(req);
  if (!me) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const ping = await pingDb();
  if (!ping.ok) {
    return NextResponse.json(
      { ok: false, db: ping, error: ping.err },
      { status: 500 }
    );
  }

  try {
    const [users, saves, events, weathers, messages] = await Promise.all([
      usersCol(),
      savesCol(),
      eventsCol(),
      weatherCol(),
      messagesCol(),
    ]);

    const now = new Date();
    const [totalUsers, totalSaves, activeEvents, activeWeathers, totalMessages] = await Promise.all([
      users.estimatedDocumentCount(),
      saves.estimatedDocumentCount(),
      events.countDocuments({ active: true, startsAt: { $lte: now }, endsAt: { $gte: now } }),
      weathers.countDocuments({ active: true, expiresAt: { $gte: now } }),
      messages.estimatedDocumentCount(),
    ]);

    const topByCoins = await saves
      .find({}, { projection: { _id: 0, username: 1, 'saveData.coins': 1, 'saveData.totalCatches': 1, 'saveData.bestStreak': 1 } })
      .sort({ 'saveData.coins': -1 })
      .limit(10)
      .toArray();

    const top = topByCoins.map((s) => ({
      username: s.username,
      coins: (s.saveData as { coins?: number })?.coins ?? 0,
      totalCatches: (s.saveData as { totalCatches?: number })?.totalCatches ?? 0,
      bestStreak: (s.saveData as { bestStreak?: number })?.bestStreak ?? 0,
    }));

    return NextResponse.json({
      ok: true,
      db: ping,
      counts: {
        users: totalUsers,
        saves: totalSaves,
        activeEvents,
        activeWeathers,
        messages: totalMessages,
      },
      top,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, db: ping, error: (e as Error).message },
      { status: 500 }
    );
  }
}
