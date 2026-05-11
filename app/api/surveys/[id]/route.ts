import { NextRequest } from 'next/server';
import { getServerUser, getUserRole } from '../../../lib/auth';
import { getSurvey, updateSurvey } from '../../../lib/services/surveyService';
import { logWork } from '../../../lib/worklog';
import { notifyAdmins } from '../../../lib/notifications';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const role = await getUserRole(user.id);
    if (!role || role === 'viewer') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const survey = await getSurvey(id);
    if (!survey) return Response.json({ error: 'Not found' }, { status: 404 });

    return Response.json(survey);
  } catch (error) {
    void req;
    console.error('[survey GET]', error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const role = await getUserRole(user.id);
    if (!role || !['super_admin', 'admin', 'sales'].includes(role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const survey = await updateSurvey(id, body);

    const actionMap: Record<string, string> = {
      active: '发布问卷',
      paused: '暂停问卷',
      closed: '关闭问卷',
    };

    if (body.status && actionMap[body.status]) {
      await logWork({
        userId: user.id,
        role: role === 'super_admin' ? 'admin' : role as 'admin',
        action: actionMap[body.status],
        actionCategory: 'survey',
        targetType: 'survey',
        targetId: id,
        targetName: survey.title,
      });

      if (body.status === 'active') {
        await notifyAdmins('问卷已发布', `问卷「${survey.title}」已上线`, 'info', `/dashboard/koala/surveys`);
      }
    } else {
      await logWork({
        userId: user.id,
        role: role === 'super_admin' ? 'admin' : role as 'admin',
        action: '更新问卷',
        actionCategory: 'survey',
        targetType: 'survey',
        targetId: id,
        targetName: survey.title,
      });
    }

    return Response.json(survey);
  } catch (error) {
    console.error('[survey PUT]', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Internal error' }, { status: 500 });
  }
}
