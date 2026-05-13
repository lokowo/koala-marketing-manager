import { supabaseAdmin } from '../../../../lib/supabase/server';
import { requireAdmin } from '../../../../lib/auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const days = 30;
    const data: { date: string; chats: number; outreach: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).toISOString();
      const label = `${d.getMonth() + 1}/${d.getDate()}`;

      const [chatRes, outreachRes] = await Promise.all([
        db.from('ai_conversations')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', dayStart)
          .lt('created_at', dayEnd)
          .then((r: { count: number | null }) => r.count ?? 0)
          .catch(() => 0),
        db.from('outreach_emails')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', dayStart)
          .lt('created_at', dayEnd)
          .then((r: { count: number | null }) => r.count ?? 0)
          .catch(() => 0),
      ]);

      data.push({ date: label, chats: chatRes, outreach: outreachRes });
    }

    return Response.json({ data });
  } catch (error) {
    console.error('[admin/stats/trend]', error);
    return Response.json({ data: [] });
  }
}
