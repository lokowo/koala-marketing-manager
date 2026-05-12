import { NextRequest } from 'next/server';
import { getServerUser, getUserRole } from '../../../lib/auth';
import { getSurvey, updateSurvey } from '../../../lib/services/surveyService';
import { logWork } from '../../../lib/worklog';
import { notifyAdmins, notifyUser } from '../../../lib/notifications';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

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

    // Fetch current survey to check ownership for end/close operations
    const current = await getSurvey(id);
    if (!current) return Response.json({ error: 'Not found' }, { status: 404 });

    // Sales cannot edit other people's drafts
    if (role === 'sales' && current.status === 'draft' && current.created_by !== user.id) {
      return Response.json({ error: '不能修改别人的草稿问卷' }, { status: 403 });
    }

    // End/close: only creator or super_admin
    if (body.status === 'closed' || body.status === 'ended') {
      if (role !== 'super_admin' && current.created_by !== user.id) {
        return Response.json({ error: '只有问卷创建者或超级管理员可以结束问卷' }, { status: 403 });
      }
    }

    const survey = await updateSurvey(id, body);

    const actionMap: Record<string, string> = {
      active: '发布问卷',
      paused: '暂停问卷',
      closed: '关闭问卷',
    };

    const logRole = role === 'super_admin' ? 'admin' : role as 'admin' | 'sales';

    if (body.status && actionMap[body.status]) {
      await logWork({
        userId: user.id,
        role: logRole,
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
        role: logRole,
        action: '更新问卷',
        actionCategory: 'survey',
        targetType: 'survey',
        targetId: id,
        targetName: survey.title,
      });

      // Notify creator + other promoters when a different user edits the survey
      if (current.created_by && current.created_by !== user.id) {
        const { data: editorProfile } = await db
          .from('user_profiles')
          .select('display_name')
          .eq('user_id', user.id)
          .single();
        const editorName = editorProfile?.display_name || '同事';

        await notifyUser(
          current.created_by,
          '问卷被修改',
          `${editorName} 修改了你创建的问卷「${survey.title}」`,
          'info',
          `/dashboard/koala/surveys/${id}/edit`,
        );

        // Notify other sales who are promoting this survey
        const { data: shareLinks } = await db
          .from('survey_share_links')
          .select('sales_user_id')
          .eq('survey_id', id);
        const promoterIds = [...new Set(
          (shareLinks ?? [])
            .map((l: { sales_user_id: string }) => l.sales_user_id)
            .filter((sid: string) => sid !== user.id && sid !== current.created_by),
        )] as string[];
        for (const pid of promoterIds) {
          await notifyUser(
            pid,
            '推广问卷被修改',
            `${editorName} 修改了问卷「${survey.title}」的内容`,
            'info',
          );
        }
      }
    }

    return Response.json(survey);
  } catch (error) {
    console.error('[survey PUT]', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Internal error' }, { status: 500 });
  }
}
