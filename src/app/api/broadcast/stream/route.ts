import { getSessionFromRequest } from '@/lib/auth';
import { getBuffered, subscribe } from '@/lib/broadcast';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/broadcast/stream — Server-Sent Events (SSE).
 */
export async function GET(req: Request) {
  const me = await getSessionFromRequest(req);
  if (!me) {
    return new Response('Unauthorized', { status: 401 });
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      let closed = false;

      const send = (data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };

      send({ type: 'hello', at: Date.now(), user: me.username });
      for (const ev of getBuffered().slice(-50)) {
        send({ type: 'broadcast', event: ev });
      }

      const unsub = subscribe((ev) => {
        send({ type: 'broadcast', event: ev });
      });

      const hb = setInterval(() => {
        send({ type: 'ping', at: Date.now() });
      }, 20_000);

      req.signal.addEventListener('abort', () => {
        closed = true;
        clearInterval(hb);
        unsub();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
