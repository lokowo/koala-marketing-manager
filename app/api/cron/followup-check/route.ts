import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Find due follow-up reminders
    const { data: reminders } = await supabase
      .from('followup_reminders')
      .select('*, outreach_emails(status, professor_id)')
      .eq('status', 'pending')
      .lte('remind_at', new Date().toISOString())
      .limit(50);

    let processed = 0;
    for (const reminder of reminders ?? []) {
      // Skip if already replied
      if (reminder.outreach_emails?.status === 'replied') {
        await supabase
          .from('followup_reminders')
          .update({ status: 'not_needed' })
          .eq('id', reminder.id);
        continue;
      }

      // Mark as reminded
      await supabase
        .from('followup_reminders')
        .update({ status: 'reminded' })
        .eq('id', reminder.id);

      processed++;
    }

    return Response.json({ processed, total: reminders?.length ?? 0 });
  } catch (e) {
    console.error('[Cron followup-check]', e);
    return Response.json({ error: 'Cron failed' }, { status: 500 });
  }
}
