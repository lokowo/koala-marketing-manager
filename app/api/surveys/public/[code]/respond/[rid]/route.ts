import { NextRequest } from 'next/server';
import { saveProgress, completeResponse } from '../../../../../../lib/services/surveyService';

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

    await completeResponse(rid, cleanedAnswers, metadata);

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
