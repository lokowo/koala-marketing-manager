import { NextRequest } from 'next/server';
import QRCode from 'qrcode';
import { getServerUser, getUserRole } from '../../../lib/auth';
import { createQRCode, listQRCodes, getSurvey } from '../../../lib/services/surveyService';
import { supabaseAdmin } from '../../../lib/supabase/server';
import { logWork } from '../../../lib/worklog';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const role = await getUserRole(user.id);
    if (!role || role === 'viewer') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const surveyId = req.nextUrl.searchParams.get('survey_id');
    if (!surveyId) return Response.json({ error: 'survey_id required' }, { status: 400 });

    const salesId = role === 'sales' ? user.id : undefined;
    const qrcodes = await listQRCodes(surveyId, salesId);
    return Response.json({ qrcodes });
  } catch (error) {
    console.error('[qrcodes GET]', error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const role = await getUserRole(user.id);
    if (role !== 'sales') {
      return Response.json({ error: 'Only sales can generate QR codes' }, { status: 403 });
    }

    const { survey_id, label } = await req.json();
    if (!survey_id) return Response.json({ error: 'survey_id required' }, { status: 400 });

    const survey = await getSurvey(survey_id);
    if (!survey) return Response.json({ error: 'Survey not found' }, { status: 404 });
    if (survey.status !== 'active') {
      return Response.json({ error: 'Survey must be active to generate QR codes' }, { status: 400 });
    }

    const salesCode = `s_${user.id.slice(0, 8)}_${Date.now().toString(36)}`;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://koalastudy.net';
    const surveyUrl = `${baseUrl}/s/${salesCode}`;

    const qrDataUrl = await QRCode.toDataURL(surveyUrl, {
      width: 512,
      margin: 2,
      color: { dark: '#080C10', light: '#FFFFFF' },
    });

    let qrImageUrl: string | undefined;
    try {
      const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const fileName = `qrcodes/${survey_id}/${salesCode}.png`;

      const { error: uploadErr } = await db.storage
        .from('survey-qrcodes')
        .upload(fileName, buffer, { contentType: 'image/png', upsert: true });

      if (!uploadErr) {
        const { data: urlData } = db.storage.from('survey-qrcodes').getPublicUrl(fileName);
        qrImageUrl = urlData?.publicUrl;
      }
    } catch {
      // Storage upload failed — fall through to free API fallback
    }

    if (!qrImageUrl) {
      qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(surveyUrl)}`;
    }

    const qrcode = await createQRCode({
      survey_id,
      sales_id: user.id,
      sales_code: salesCode,
      label: label || undefined,
      qr_image_url: qrImageUrl,
    });

    await logWork({
      userId: user.id,
      role: 'sales',
      action: '生成问卷二维码',
      actionCategory: 'survey',
      targetType: 'survey_qrcode',
      targetId: qrcode.id,
      targetName: label || survey.title,
      details: { survey_id, sales_code: salesCode },
    });

    return Response.json({ qrcode, qr_data_url: qrDataUrl, survey_url: surveyUrl }, { status: 201 });
  } catch (error) {
    console.error('[qrcodes POST]', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Internal error' }, { status: 500 });
  }
}
