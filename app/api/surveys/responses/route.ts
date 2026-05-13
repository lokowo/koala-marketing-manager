import { NextRequest } from 'next/server';
import { getServerUser, getUserRole } from '../../../lib/auth';
import { listResponses, getResponseById, deleteResponse } from '../../../lib/services/surveyService';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

function stripPii(response: Record<string, unknown>): Record<string, unknown> {
  const cleaned = { ...response };
  if (cleaned.metadata && typeof cleaned.metadata === 'object') {
    const { respondent_name, respondent_email, respondent_phone, respondent_wechat, ...rest } =
      cleaned.metadata as Record<string, unknown>;
    void respondent_name; void respondent_email; void respondent_phone; void respondent_wechat;
    cleaned.metadata = rest;
  }
  return cleaned;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const role = await getUserRole(user.id);
    if (!role || role === 'viewer') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = req.nextUrl;
    const surveyId = searchParams.get('survey_id');
    const responseId = searchParams.get('id');

    if (responseId) {
      if (role === 'sales') {
        const { data: resp } = await db.from('survey_responses')
          .select('share_link_id').eq('id', responseId).single();
        if (resp?.share_link_id) {
          const { data: link } = await db.from('survey_share_links')
            .select('sales_user_id').eq('id', resp.share_link_id).single();
          if (!link || link.sales_user_id !== user.id) {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
          }
        } else {
          return Response.json({ error: 'Forbidden' }, { status: 403 });
        }
      }

      const response = await getResponseById(responseId);
      if (!response) return Response.json({ error: 'Not found' }, { status: 404 });

      if (role === 'admin') {
        return Response.json(stripPii(response as unknown as Record<string, unknown>));
      }
      return Response.json(response);
    }

    if (!surveyId) return Response.json({ error: 'survey_id required' }, { status: 400 });

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    let salesUserId: string | undefined;
    if (role === 'sales') {
      const { data: surveyData } = await db.from('surveys')
        .select('created_by').eq('id', surveyId).single();
      if (!surveyData || surveyData.created_by !== user.id) {
        salesUserId = user.id;
      }
    }

    const result = await listResponses(surveyId, {
      page,
      limit,
      sales_user_id: salesUserId,
    });

    if (role === 'admin') {
      return Response.json({
        ...result,
        responses: result.responses.map(r => stripPii(r as unknown as Record<string, unknown>)),
      });
    }

    return Response.json(result);
  } catch (error) {
    console.error('[responses GET]', error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const role = await getUserRole(user.id);
    if (role !== 'super_admin') {
      return Response.json({ error: 'Only super admins can delete responses' }, { status: 403 });
    }

    const { id } = await req.json();
    if (!id) return Response.json({ error: 'id required' }, { status: 400 });

    await deleteResponse(id);
    return Response.json({ success: true });
  } catch (error) {
    console.error('[responses DELETE]', error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
