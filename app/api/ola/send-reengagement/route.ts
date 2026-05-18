import { supabaseAdmin } from '../../../lib/supabase/server';
import { getResend } from '../../../lib/email/resend';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function POST(req: Request) {
  try {
    const { userId, templateKey } = await req.json();

    if (!userId || !templateKey) {
      return Response.json({ error: 'Missing userId or templateKey' }, { status: 400 });
    }

    const { data: template } = await db
      .from('ola_email_templates')
      .select('*')
      .eq('template_key', templateKey)
      .single();

    if (!template) {
      return Response.json({ error: 'Template not found' }, { status: 404 });
    }

    const { data: profile } = await db
      .from('profiles')
      .select('email, language, full_name')
      .eq('id', userId)
      .single();

    if (!profile?.email) {
      return Response.json({ error: 'no email' }, { status: 400 });
    }

    const isZh = (profile.language || 'zh').startsWith('zh');
    const subject = isZh ? template.subject_zh : template.subject_en;
    const body = isZh ? template.body_zh : template.body_en;

    const resend = getResend();
    await resend.emails.send({
      from: 'Ola AI <noreply@koalaphd.com>',
      to: [profile.email],
      subject,
      html: body,
    });

    await db.from('ola_email_logs').insert({
      user_id: userId,
      template_key: templateKey,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('[send-reengagement]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
