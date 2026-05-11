import { NextRequest } from 'next/server';
import { getSurveyByCode, submitResponse, incrementQRScan, incrementQRResponse } from '../../../lib/services/surveyService';
import { notifyAdmins } from '../../../lib/notifications';

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code');
    if (!code) return Response.json({ error: 'code required' }, { status: 400 });

    const ref = req.nextUrl.searchParams.get('ref');

    const survey = await getSurveyByCode(code);
    if (!survey) return Response.json({ error: '链接不存在或已失效' }, { status: 404 });
    if (survey.status === 'draft') return Response.json({ error: '问卷尚未发布' }, { status: 400 });
    if (survey.status === 'closed') return Response.json({ error: '问卷已结束' }, { status: 400 });
    if (survey.status === 'paused') return Response.json({ error: '问卷已暂停' }, { status: 400 });
    if (survey.end_at && new Date(survey.end_at) < new Date()) {
      return Response.json({ error: '问卷已结束' }, { status: 400 });
    }

    if (ref) {
      await incrementQRScan(ref).catch(() => {});
    }

    return Response.json({
      id: survey.id,
      title: survey.title,
      description: survey.description,
      welcome_message: survey.welcome_message,
      brand_color: survey.brand_color,
      cover_image: survey.cover_image,
      questions: survey.questions,
      require_login: survey.require_login,
      allow_anonymous: survey.allow_anonymous,
    });
  } catch (error) {
    console.error('[public survey GET]', error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { survey_id, answers, device_fingerprint, metadata, sales_code } = body;

    if (!survey_id || !answers) {
      return Response.json({ error: 'survey_id and answers required' }, { status: 400 });
    }

    const response = await submitResponse({
      survey_id,
      device_fingerprint,
      answers,
      metadata,
      source: sales_code ? 'qrcode' : 'direct',
      sales_code,
    });

    if (sales_code) {
      await incrementQRResponse(sales_code).catch(() => {});
    }

    await notifyAdmins(
      '新问卷回复',
      `问卷收到新回复${sales_code ? `（来源: ${sales_code}）` : ''}`,
      'info',
      `/dashboard/koala/surveys/responses?survey_id=${survey_id}`
    ).catch(() => {});

    return Response.json({ id: response.id, success: true }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal error';
    const status = msg.includes('Already submitted') ? 409
      : msg.includes('not active') || msg.includes('has ended') || msg.includes('maximum') ? 400
      : 500;
    return Response.json({ error: msg }, { status });
  }
}
