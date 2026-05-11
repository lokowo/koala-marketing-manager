import { NextRequest } from 'next/server';
import { getServerUser, getUserRole } from '../../../../lib/auth';
import { createQRCode, listQRCodes } from '../../../../lib/services/surveyService';
import { supabaseAdmin } from '../../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const role = await getUserRole(user.id);

    const { id } = await params;
    void req;

    const salesId = role === 'sales' ? user.id : undefined;
    const links = await listQRCodes(id, salesId);

    return Response.json({ links });
  } catch (error) {
    console.error('[share-link GET]', error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const role = await getUserRole(user.id);

    if (role !== 'sales') {
      return Response.json({ error: '只有销售可以生成推广二维码' }, { status: 403 });
    }

    const { id } = await params;
    void req;

    const existing = await listQRCodes(id, user.id);
    if (existing.length > 0) {
      return Response.json(existing[0]);
    }

    // Fetch survey to check status and get title
    const { data: survey } = await db.from('surveys')
      .select('id, status, title_zh')
      .eq('id', id)
      .single();
    if (!survey || survey.status !== 'active') {
      return Response.json({ error: '问卷未发布' }, { status: 400 });
    }

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let shortCode = '';
    for (let i = 0; i < 6; i++) shortCode += chars[Math.floor(Math.random() * chars.length)];

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://koalaphd.com';
    const surveyUrl = `${baseUrl}/s/${shortCode}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(surveyUrl)}`;

    const link = await createQRCode({
      survey_id: id,
      sales_id: user.id,
      sales_code: shortCode,
      qr_image_url: qrImageUrl,
    });

    // Sync to sales_qrcodes so it appears in the Sales Dashboard promo list
    const surveyTitle = survey.title_zh || '调研问卷';
    await db.from('sales_qrcodes').upsert({
      sales_user_id: user.id,
      code: shortCode,
      channel: 'survey',
      label: surveyTitle,
      scan_count: 0,
      register_count: 0,
    }, {
      onConflict: 'code',
    });

    return Response.json(link, { status: 201 });
  } catch (error) {
    console.error('[share-link POST]', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Internal error' }, { status: 500 });
  }
}
