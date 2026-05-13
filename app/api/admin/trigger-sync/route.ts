import { requireAdmin } from '../../../lib/auth';

export async function POST(req: Request) {
  try { await requireAdmin(); } catch { return Response.json({ error: 'Forbidden' }, { status: 403 }); }

  const secret = process.env.CRON_SECRET || 'dev';
  const baseUrl = req.headers.get('host') ? `${req.headers.get('x-forwarded-proto') || 'http'}://${req.headers.get('host')}` : 'http://localhost:3000';

  const resp = await fetch(`${baseUrl}/api/cron/sync-professors`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}` },
  });

  const data = await resp.json();
  return Response.json(data, { status: resp.status });
}
