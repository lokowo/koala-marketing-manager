import { NextRequest } from 'next/server';
import { getServerUser, getUserRole } from '../../../lib/auth';
import { duplicateSurvey } from '../../../lib/services/surveyService';
import { logWork } from '../../../lib/worklog';

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const role = await getUserRole(user.id);
    if (!role || !['super_admin', 'admin', 'sales'].includes(role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await req.json();
    if (!id) return Response.json({ error: 'id required' }, { status: 400 });

    const copy = await duplicateSurvey(id, user.id);

    await logWork({
      userId: user.id,
      role: role === 'super_admin' ? 'admin' : role as 'admin' | 'sales',
      action: '复制问卷',
      actionCategory: 'survey',
      targetType: 'survey',
      targetId: copy.id,
      targetName: copy.title,
      details: { original_id: id },
    });

    return Response.json(copy, { status: 201 });
  } catch (error) {
    console.error('[duplicate POST]', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Internal error' }, { status: 500 });
  }
}
