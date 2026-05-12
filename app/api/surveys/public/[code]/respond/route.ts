import { NextRequest } from 'next/server';
import { startResponse } from '../../../../../lib/services/surveyService';
import { supabaseAdmin } from '../../../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    const body = await req.json();
    const { device_fingerprint } = body;

    // Look up share link without incrementing scan_count (GET already did that)
    const { data: link } = await db.from('survey_share_links')
      .select('id, survey_id, sales_user_id')
      .eq('short_code', code)
      .single();
    if (!link) {
      return Response.json({ error: '链接不存在或已失效' }, { status: 404 });
    }

    const { data: survey } = await db.from('surveys')
      .select('id, status, settings, ended_at')
      .eq('id', link.survey_id)
      .single();
    if (!survey) {
      return Response.json({ error: '问卷不存在' }, { status: 404 });
    }

    if (survey.status !== 'active') {
      return Response.json({ error: '问卷不可用' }, { status: 400 });
    }

    const settings = (survey.settings || {}) as Record<string, unknown>;
    const endAt = settings.auto_end_date || survey.ended_at;
    if (endAt && new Date(endAt as string) < new Date()) {
      return Response.json({ error: '问卷已结束' }, { status: 400 });
    }

    const row = await startResponse(
      survey.id,
      link.sales_user_id,
      link.id,
      device_fingerprint,
    );

    return Response.json({ response_id: row.id }, { status: 201 });
  } catch (error) {
    console.error('[public survey respond POST]', error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
