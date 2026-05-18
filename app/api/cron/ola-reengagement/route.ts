import { supabaseAdmin } from '../../../lib/supabase/server';
import { getResend } from '../../../lib/email/resend';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

async function getEligibleUsers(templateKey: string, condition: Record<string, unknown>) {
  const now = new Date();
  const cooldownDate = new Date(now.getTime() - 30 * 86400000).toISOString();

  const { data: recentLogs } = await db
    .from('ola_email_logs')
    .select('user_id')
    .eq('template_key', templateKey)
    .gte('sent_at', cooldownDate);

  const cooldownUserIds = new Set((recentLogs ?? []).map((l: { user_id: string }) => l.user_id));

  const { data: todayLogs } = await db
    .from('ola_email_logs')
    .select('user_id')
    .gte('sent_at', new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString());

  const todayUserIds = new Set((todayLogs ?? []).map((l: { user_id: string }) => l.user_id));

  let users: Array<{ id: string; email: string; language: string }> = [];

  if (condition.type === 'inactive_days') {
    const daysAgo = new Date(now.getTime() - (condition.days as number) * 86400000).toISOString();
    const { data: profiles } = await db
      .from('profiles')
      .select('id, email, language')
      .not('email', 'is', null)
      .lte('created_at', daysAgo);

    for (const p of profiles ?? []) {
      if (condition.requires_no_sessions) {
        const { count } = await db
          .from('ola_sessions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', p.id);
        if ((count ?? 0) > 0) continue;
      }
      users.push(p);
    }
  } else if (condition.type === 'dormant_days') {
    const daysAgo = new Date(now.getTime() - (condition.days as number) * 86400000).toISOString();
    const { data: profiles } = await db
      .from('profiles')
      .select('id, email, language, last_sign_in_at')
      .not('email', 'is', null)
      .lte('last_sign_in_at', daysAgo);
    users = profiles ?? [];
  } else if (condition.type === 'deadline_approaching') {
    const targetDate = new Date(now.getTime() + (condition.days as number) * 86400000);
    const targetStr = targetDate.toISOString().split('T')[0];
    const todayStr = now.toISOString().split('T')[0];

    const { data: deadlines } = await db
      .from('university_deadlines')
      .select('university')
      .gte('deadline_date', todayStr)
      .lte('deadline_date', targetStr);

    if (deadlines && deadlines.length > 0) {
      const unis = deadlines.map((d: { university: string }) => d.university);
      const { data: profiles } = await db
        .from('profiles')
        .select('id, email, language, target_universities')
        .not('email', 'is', null)
        .not('target_universities', 'is', null);

      for (const p of profiles ?? []) {
        const targets = p.target_universities as string[] | null;
        if (targets?.some((t: string) => unis.some((u: string) => t.toLowerCase().includes(u.toLowerCase()) || u.toLowerCase().includes(t.toLowerCase())))) {
          users.push(p);
        }
      }
    }
  }

  return users.filter(u => u.email && !cooldownUserIds.has(u.id) && !todayUserIds.has(u.id));
}

export async function POST() {
  try {
    const { data: templates } = await db
      .from('ola_email_templates')
      .select('*')
      .eq('enabled', true);

    if (!templates || templates.length === 0) {
      return Response.json({ message: 'No enabled templates', sent: 0 });
    }

    const resend = getResend();
    let totalSent = 0;
    const results: Array<{ template: string; sent: number; errors: number }> = [];

    for (const template of templates) {
      let sent = 0;
      let errors = 0;

      try {
        const users = await getEligibleUsers(template.template_key, template.trigger_condition);

        for (const user of users) {
          try {
            const isZh = (user.language || 'zh').startsWith('zh');
            await resend.emails.send({
              from: 'Ola AI <noreply@koalaphd.com>',
              to: [user.email],
              subject: isZh ? template.subject_zh : template.subject_en,
              html: isZh ? template.body_zh : template.body_en,
            });

            await db.from('ola_email_logs').insert({
              user_id: user.id,
              template_key: template.template_key,
            });

            sent++;
            totalSent++;
          } catch (err) {
            console.error(`[ola-reengagement] Failed to send ${template.template_key} to ${user.id}:`, err);
            errors++;
          }
        }
      } catch (err) {
        console.error(`[ola-reengagement] Failed to process template ${template.template_key}:`, err);
        errors++;
      }

      results.push({ template: template.template_key, sent, errors });
    }

    return Response.json({ message: `Sent ${totalSent} emails`, sent: totalSent, results });
  } catch (error) {
    console.error('[ola-reengagement cron]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
