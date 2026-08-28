import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { messagesCol } from '@/lib/mongo';
import { broadcast } from '@/lib/broadcast';
import type { AdminMessage } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/messages — list 100 messages gần nhất.
 */
export async function GET(req: Request) {
  const me = await getSessionFromRequest(req);
  if (!me) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const col = await messagesCol();
  const list = await col
    .find({}, { projection: { _id: 1, username: 1, role: 1, message: 1, createdAt: 1 } })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();
  const out = list.map((m) => ({ ...m, _id: m._id?.toString() }));
  return NextResponse.json({ messages: out });
}

/**
 * POST /api/messages — gửi global message.
 */
export async function POST(req: Request) {
  const me = await getSessionFromRequest(req);
  if (!me) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const message = (body.message || '').trim();
  if (!message) {
    return NextResponse.json({ error: 'empty_message' }, { status: 400 });
  }
  if (message.length > 500) {
    return NextResponse.json({ error: 'too_long' }, { status: 400 });
  }

  const col = await messagesCol();
  const insert: AdminMessage = {
    username: me.username,
    role: me.role,
    message,
    createdAt: new Date(),
  };
  const result = await col.insertOne(insert);

  await broadcast({
    username: me.username,
    role: me.role,
    action: 'global.message',
    message,
    audit: true,
    payload: { messageId: result.insertedId?.toString(), message },
  });

  return NextResponse.json({ ok: true, message: { ...insert, _id: result.insertedId?.toString() } });
}
