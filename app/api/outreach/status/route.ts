import type { NextRequest } from 'next/server';
import { getServerUser } from '../../../lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json();
    const { emailId, status } = body;

    if (!emailId || !status) {
      return Response.json({ error: 'Missing emailId or status' }, { status: 400 });
    }

    const validStatuses = ['draft', 'sent', 'later', 'abandoned', 'replied'];
    if (!validStatuses.includes(status)) {
      return Response.json({ error: 'Invalid status' }, { status: 400 });
    }

    const { createClient } = await import('@supabase/supabase-js');
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(url, key);

    const updateData: Record<string, unknown> = { status };
    if (status === 'sent') {
      updateData.sent_at = new Date().toISOString();
      // Create follow-up reminder
      await supabase.from('followup_reminders').insert({
        email_id: emailId,
        remind_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
      });
    }

    await supabase.from('outreach_emails').update(updateData).eq('id', emailId);
    return Response.json({ ok: true });
  } catch (e) {
    console.error('[Outreach Status]', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
