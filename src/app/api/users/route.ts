import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { savesCol, usersCol } from '@/lib/mongo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/users?search=...&limit=...
 * Trả về danh sách username + thông tin save tóm tắt.
 */
export async function GET(req: Request) {
  const user = await getSessionFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const search = (url.searchParams.get('search') || '').trim();
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 200);

  try {
    const users = await usersCol();
    const saves = await savesCol();

    const filter = search ? { username: { $regex: search, $options: 'i' } } : {};
    const cursor = users
      .find(filter, { projection: { _id: 0, username: 1, createdAt: 1, updatedAt: 1 } })
      .sort({ createdAt: -1 })
      .limit(limit);

    const out: Array<{
      username: string;
      createdAt?: Date;
      updatedAt?: Date;
      save?: {
        coins: number;
        totalCatches: number;
        bestStreak: number;
        fishCaughtCount: number;
        tankFishCount: number;
        scrapIron?: number;
        glass?: number;
        foodBoxes?: Partial<Record<string, number>>;
        ancientRod?: { expiresAt: number; level: number } | null;
        tankLevel?: number;
        tankCapacity?: number;
        updatedAt?: Date;
      } | null;
    }> = [];

    const num = (v: unknown, fallback = 0): number => {
      if (typeof v === 'number' && isFinite(v)) return v;
      return fallback;
    };
    const obj = (v: unknown): Record<string, number> =>
      (v && typeof v === 'object' && !Array.isArray(v))
        ? (v as Record<string, number>)
        : {};
    const rodOr = (v: unknown): { expiresAt: number; level: number } | null => {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        const r = v as { expiresAt?: unknown; level?: unknown };
        const expiresAt = typeof r.expiresAt === 'number' ? r.expiresAt : 0;
        const level = typeof r.level === 'number' ? r.level : 1;
        if (expiresAt > 0) return { expiresAt, level };
      }
      return null;
    };

    for await (const u of cursor) {
      const save = await saves.findOne({ username: u.username });
      out.push({
        username: u.username,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        save: save
          ? {
              // Force numbers (never objects/strings) — phòng React #31 khi render {value}
              coins: num(save.saveData?.coins),
              totalCatches: num(save.saveData?.totalCatches),
              bestStreak: num(save.saveData?.bestStreak),
              fishCaughtCount: save.saveData?.fishCaught
                ? Object.keys(save.saveData.fishCaught).length
                : 0,
              tankFishCount: Array.isArray(save.saveData?.tankFish)
                ? save.saveData.tankFish.length
                : 0,
              scrapIron: num(save.saveData?.scrapIron),
              glass: num(save.saveData?.glass),
              // Defensive: foodBoxes phải là object (không phải number/null)
              foodBoxes: obj(save.saveData?.foodBoxes),
              // Defensive: ancientRod phải là object {expiresAt, level} hoặc null
              ancientRod: rodOr(save.saveData?.ancientRod),
              tankLevel: Math.max(0, Math.min(10, num(save.saveData?.tankLevel))),
              // Capacity = 10 + level*5 (đồng bộ game chính types.ts)
              tankCapacity: 10 + Math.max(0, Math.min(10, num(save.saveData?.tankLevel))) * 5,
              updatedAt: save.updatedAt,
            }
          : null,
      });
    }

    return NextResponse.json({ users: out, total: out.length });
  } catch (e) {
    return NextResponse.json(
      { error: 'db_error', message: (e as Error).message },
      { status: 500 }
    );
  }
}
