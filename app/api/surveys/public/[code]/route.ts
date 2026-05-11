import { NextRequest } from 'next/server';
import { resolveShareCode } from '../../../../lib/services/surveyService';
import { questionsToSurveyJson } from '../../../../lib/services/surveyJsonBuilder';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    void req;

    const result = await resolveShareCode(code);
    if (!result) {
      return Response.json({ error: '链接不存在或已失效' }, { status: 404 });
    }

    const { survey, questions, salesUserId, shareLinkId } = result;

    // Check survey status
    const status = survey.status as string;
    if (status === 'draft') {
      return Response.json({ error: '问卷尚未发布' }, { status: 400 });
    }
    if (status === 'deleted') {
      return Response.json({ error: '链接不存在或已失效' }, { status: 404 });
    }
    if (status === 'closed') {
      return Response.json({ error: '问卷已结束' }, { status: 400 });
    }
    if (status === 'paused') {
      return Response.json({ error: '问卷已暂停' }, { status: 400 });
    }
    if (status !== 'active') {
      return Response.json({ error: '问卷不可用' }, { status: 400 });
    }

    // Check if survey has ended by date
    const settings = (survey.settings || {}) as Record<string, unknown>;
    const endAt = settings.auto_end_date || survey.ended_at;
    if (endAt && new Date(endAt as string) < new Date()) {
      return Response.json({ error: '问卷已结束' }, { status: 400 });
    }

    // Build survey_json — use stored value or generate from questions as fallback
    const mappedQuestions = (questions || []).map((q: Record<string, unknown>) => ({
      ...q,
      title: q.title_zh || q.title || '',
      description: q.description_zh || q.description || undefined,
      config: (q.condition || q.validation)
        ? { condition: q.condition, validation: q.validation }
        : undefined,
    }));

    const surveyTitle = survey.title_zh || '';
    const surveyDescription = survey.description_zh || undefined;
    const welcomeMessage = settings.welcome_message_zh || undefined;
    const brandColor = settings.brand_color || undefined;
    const coverImage = survey.share_image_url || undefined;

    let surveyJson = survey.survey_json;
    if (!surveyJson) {
      surveyJson = questionsToSurveyJson(
        {
          title: surveyTitle,
          description: surveyDescription as string | undefined,
          welcome_message: welcomeMessage as string | undefined,
          brand_color: brandColor as string | undefined,
        },
        mappedQuestions.map((q: Record<string, unknown>) => ({
          id: q.id as string,
          type: q.type as string,
          title: q.title as string,
          description: q.description as string | undefined,
          options: q.options as string[] | undefined,
          required: (q.required ?? true) as boolean,
          order_index: (q.order_index ?? 0) as number,
          config: q.config as Record<string, unknown> | undefined,
        })),
      );
    }

    return Response.json({
      survey_id: survey.id,
      title: surveyTitle,
      description: surveyDescription,
      welcome_message: welcomeMessage,
      brand_color: brandColor,
      cover_image: coverImage,
      survey_json: surveyJson,
      sales_user_id: salesUserId,
      share_link_id: shareLinkId,
      questions: mappedQuestions,
    });
  } catch (error) {
    console.error('[public survey [code] GET]', error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
