import { NextRequest } from 'next/server';
import { resolveShareCode, startResponse } from '../../../../../lib/services/surveyService';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    const body = await req.json();
    const { device_fingerprint } = body;

    const result = await resolveShareCode(code);
    if (!result) {
      return Response.json({ error: '链接不存在或已失效' }, { status: 404 });
    }

    const { survey, salesUserId, shareLinkId } = result;

    // Validate survey is active
    if (survey.status !== 'active') {
      return Response.json({ error: '问卷不可用' }, { status: 400 });
    }

    // Check if survey has ended by date
    const settings = (survey.settings || {}) as Record<string, unknown>;
    const endAt = settings.auto_end_date || survey.ended_at;
    if (endAt && new Date(endAt as string) < new Date()) {
      return Response.json({ error: '问卷已结束' }, { status: 400 });
    }

    const row = await startResponse(
      survey.id,
      salesUserId,
      shareLinkId,
      device_fingerprint,
    );

    return Response.json({ response_id: row.id }, { status: 201 });
  } catch (error) {
    console.error('[public survey respond POST]', error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
