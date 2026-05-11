import { NextRequest } from 'next/server';
import { getServerUser, getUserRole } from '../../../lib/auth';
import { getSurveyAnalytics } from '../../../lib/services/surveyService';

export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const role = await getUserRole(user.id);
    if (!role || role === 'viewer') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const surveyId = req.nextUrl.searchParams.get('survey_id');
    if (!surveyId) return Response.json({ error: 'survey_id required' }, { status: 400 });

    const salesCode = role === 'sales' ? req.nextUrl.searchParams.get('sales_code') || undefined : undefined;

    const analytics = await getSurveyAnalytics(surveyId, salesCode);
    return Response.json(analytics);
  } catch (error) {
    console.error('[analytics GET]', error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
