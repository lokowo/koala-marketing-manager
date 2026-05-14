import { NextRequest } from 'next/server';
import { saveProgress, completeResponse } from '../../../../../../lib/services/surveyService';
import { surveySubmitLimiter } from '../../../../../../lib/ratelimit';
import { sendSurveyThankYouEmail } from '../../../../../../lib/services/emailService';
import { supabaseAdmin } from '../../../../../../lib/supabase/server';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ code: string; rid: string }> },
) {
  try {
    const { rid } = await params;
    const body = await req.json();
    const { answers, current_page } = body;

    await saveProgress(rid, answers || {}, current_page || 0);

    return Response.json({ success: true });
  } catch (error) {
    console.error('[public survey respond [rid] PUT]', error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string; rid: string }> },
) {
  try {
    if (surveySubmitLimiter) {
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
      const { success } = await surveySubmitLimiter.limit(ip);
      if (!success) return Response.json({ error: '提交过于频繁，请稍后再试' }, { status: 429 });
    }

    const { rid } = await params;
    const body = await req.json();
    const { answers } = body;

    const contactFields: Record<string, string> = {};
    const cleanedAnswers: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(answers || {})) {
      if (key.startsWith('__contact_')) {
        const contactKey = key.replace('__contact_', '');
        contactFields[contactKey] = String(value);
      } else if (!key.startsWith('__')) {
        cleanedAnswers[key] = value;
      }
    }

    const metadata: Record<string, unknown> = {};
    if (contactFields.name) metadata.contact_name = contactFields.name;
    if (contactFields.phone) metadata.contact_phone = contactFields.phone;
    if (contactFields.email) metadata.contact_email = contactFields.email;
    if (contactFields.wechat) metadata.contact_wechat = contactFields.wechat;

    const emailValid = contactFields.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactFields.email);
    if (contactFields.email && !emailValid) {
      metadata.email_status = 'invalid';
    } else if (emailValid) {
      metadata.email_status = 'pending';
    }
    if (contactFields.phone && contactFields.phone.replace(/\D/g, '').length < 8) {
      metadata.phone_status = 'invalid';
    }

    await completeResponse(rid, cleanedAnswers, metadata);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabaseAdmin as any;

    if (emailValid) {
      sendSurveyThankYouEmail({
        to: contactFields.email,
        name: contactFields.name,
        responseId: rid,
      }).then(({ emailId }) => {
        if (emailId) {
          db.from('survey_responses')
            .update({ metadata: { ...metadata, email_status: 'pending', resend_email_id: emailId } })
            .eq('id', rid)
            .then(() => {});
        }
      }).catch(() => {});
    }

    return Response.json({ success: true, response_id: rid }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal error';
    const status = msg.includes('Already submitted') ? 409
      : msg.includes('not active') || msg.includes('has ended') || msg.includes('maximum') ? 400
      : 500;
    console.error('[public survey respond [rid] POST]', error);
    return Response.json({ error: msg }, { status });
  }
}
