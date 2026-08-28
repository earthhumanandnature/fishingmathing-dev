import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { savesCol } from '@/lib/mongo';
import { broadcast, VERBS } from '@/lib/broadcast';
import type { Rarity, SaveData } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/give-item
 * Body: {
 *   username,
 *   item: 'acorns' | 'scrapIron' | 'glass' | 'foodBoxes',
 *   amount: number,
 *   rarity?: 'common'|'uncommon'|'rare'|'epic'|'legendary'|'mythical'  // chỉ dùng cho foodBoxes
 * }
 *
 * amount có thể âm (trừ). Mặc định = 1.
 *
 * Field map:
 *  - acorns      → SaveData.coins (vì coins trong game = hạt sồi)
 *  - scrapIron   → SaveData.scrapIron
 *  - glass       → SaveData.glass
 *  - foodBoxes   → SaveData.foodBoxes[rarity] (OBJECT theo rarity, không phải number!)
 *
 * QUAN TRỌNG: foodBoxes phải là object Partial<Record<Rarity, number>>.
 * Game chính types.ts line 173 định nghĩa như vậy. Nếu admin set foodBoxes = number,
 * game migration (storage.ts line 63) sẽ reset về {} → người chơi mất hộp thức ăn.
 */
export async function POST(req: Request) {
  const me = await getSessionFromRequest(req);
  if (!me) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    username?: string;
    item?: string;
    amount?: number;
    rarity?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const username = (body.username || '').trim();
  const item = (body.item || '').trim();
  const amount = Math.max(-1_000_000, Math.min(1_000_000, Math.trunc(Number(body.amount ?? 1)) || 0));

  if (!username || !item) {
    return NextResponse.json({ error: 'missing_username_or_item' }, { status: 400 });
  }

  const VALID_RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythical'];

  // Field map cho các item dạng scalar
  const SCALAR_FIELDS: Record<string, keyof SaveData> = {
    acorns: 'coins',
    scrapIron: 'scrapIron',
    glass: 'glass',
  };

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
    let after: number | Record<string, number> = 0;
    let before: number | Record<string, number> = 0;

    if (item === 'foodBoxes') {
      // Validate rarity
      const rarity = (body.rarity || 'common') as Rarity;
      if (!VALID_RARITIES.includes(rarity)) {
        return NextResponse.json(
          { error: 'invalid_rarity', validRarities: VALID_RARITIES },
          { status: 400 }
        );
      }
      // Ensure foodBoxes is object (defensive)
      if (!sd.foodBoxes || typeof sd.foodBoxes !== 'object') {
        sd.foodBoxes = {};
      }
      before = sd.foodBoxes[rarity] ?? 0;
      const next = Math.max(0, (sd.foodBoxes[rarity] ?? 0) + amount);
      if (next > 0) {
        sd.foodBoxes[rarity] = next;
      } else {
        delete sd.foodBoxes[rarity];
      }
      after = next;
    } else if (item in SCALAR_FIELDS) {
      const field = SCALAR_FIELDS[item];
      const current = Number((sd as any)[field] ?? 0);
      before = current;
      const next = Math.max(0, current + amount);
      (sd as any)[field] = next;
      after = next;

      // Nếu là acorns (coins), cũng cập nhật coinsEarned để UI leaderboard không lệch
      if (field === 'coins' && amount > 0) {
        sd.coinsEarned = (sd.coinsEarned || 0) + amount;
      }
    } else {
      return NextResponse.json(
        {
          error: 'invalid_item',
          validItems: [...Object.keys(SCALAR_FIELDS), 'foodBoxes'],
        },
        { status: 400 }
      );
    }

    await saves.updateOne(
      { username },
      { $set: { saveData: sd, updatedAt: new Date() } }
    );

    await broadcast({
      username: me.username,
      role: me.role,
      action: 'admin.give_item',
      verb: VERBS.giveItem(username, item, amount),
      audit: true,
      payload: {
        target: username,
        item,
        amount,
        rarity: item === 'foodBoxes' ? body.rarity : undefined,
        before,
        after,
      },
    });

    return NextResponse.json({
      ok: true,
      item,
      rarity: item === 'foodBoxes' ? body.rarity : undefined,
      before,
      amount,
      after,
    });
  } catch (e) {
    return NextResponse.json(
      { error: 'db_error', message: (e as Error).message },
      { status: 500 }
    );
  }
}
