import { markSessionLeft } from '../../../lib/services/olaConversationLogger';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sessionId = body.sessionId as string | undefined;

    if (!sessionId) {
      return Response.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    await markSessionLeft(sessionId);
    return Response.json({ ok: true });
  } catch (error) {
    console.error('[session-end]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
