import { NextRequest } from 'next/server';
import { getServerUser, getUserRole } from '../../lib/auth';
import { createSurvey, listSurveys, deleteSurvey, getSurvey } from '../../lib/services/surveyService';
import { logWork } from '../../lib/worklog';
import { notifyAdmins } from '../../lib/notifications';

export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const role = await getUserRole(user.id);
    if (!role || role === 'viewer') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = req.nextUrl;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') as 'draft' | 'active' | 'paused' | 'closed' | undefined;
    const search = searchParams.get('search') || undefined;

    const result = await listSurveys({ page, limit, status: status || undefined, search });
    return Response.json(result);
  } catch (error) {
    console.error('[surveys GET]', error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const role = await getUserRole(user.id);
    if (!role || !['super_admin', 'admin', 'sales'].includes(role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const survey = await createSurvey({ ...body, created_by: user.id });

    await logWork({
      userId: user.id,
      role: role === 'super_admin' ? 'admin' : role as 'admin' | 'sales',
      action: '创建问卷',
      actionCategory: 'survey',
      targetType: 'survey',
      targetId: survey.id,
      targetName: survey.title,
    });

    return Response.json(survey, { status: 201 });
  } catch (error) {
    console.error('[surveys POST]', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const role = await getUserRole(user.id);
    if (!role || !['super_admin', 'admin', 'sales'].includes(role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await req.json();
    if (!id) return Response.json({ error: 'id required' }, { status: 400 });

    // Fetch the survey to check ownership and status
    const survey = await getSurvey(id);
    if (!survey) return Response.json({ error: 'Not found' }, { status: 404 });

    // Super admin can delete any draft
    // Others can only delete their own drafts
    if (role !== 'super_admin' && survey.created_by !== user.id) {
      return Response.json({ error: '只能删除自己创建的问卷' }, { status: 403 });
    }

    if (survey.status !== 'draft') {
      return Response.json({ error: '只有草稿状态的问卷可以删除，已发布的问卷请使用「结束」功能' }, { status: 400 });
    }

    await deleteSurvey(id);

    await logWork({
      userId: user.id,
      role: role === 'super_admin' ? 'admin' : role as 'admin' | 'sales',
      action: '删除问卷',
      actionCategory: 'survey',
      targetType: 'survey',
      targetId: id,
      targetName: survey.title,
    });

    if (role === 'super_admin') {
      await notifyAdmins('问卷已删除', `超级管理员删除了问卷「${survey.title}」`, 'warning');
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[surveys DELETE]', error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
