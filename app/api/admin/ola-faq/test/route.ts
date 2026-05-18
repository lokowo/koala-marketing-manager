import { requireAdmin } from '../../../../lib/auth';
import { matchFAQ } from '../../../../lib/ola/ola-faq';

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { message } = await req.json();
    if (!message || typeof message !== 'string') {
      return Response.json({ error: 'Missing message field' }, { status: 400 });
    }

    const result = await matchFAQ(message);

    if (result) {
      return Response.json({ match: result });
    }

    return Response.json({ match: null });
  } catch (error) {
    console.error('[ola-faq test]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
