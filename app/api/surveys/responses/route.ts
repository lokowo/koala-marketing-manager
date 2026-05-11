import { NextRequest } from 'next/server';
import { getServerUser, getUserRole } from '../../../lib/auth';
import { listResponses, getResponseById, deleteResponse } from '../../../lib/services/surveyService';

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
      const response = await getResponseById(responseId);
      if (!response) return Response.json({ error: 'Not found' }, { status: 404 });
      return Response.json(response);
    }

    if (!surveyId) return Response.json({ error: 'survey_id required' }, { status: 400 });

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const salesCode = role === 'sales' ? searchParams.get('sales_code') || undefined : undefined;

    const result = await listResponses(surveyId, { page, limit, sales_code: salesCode });
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
