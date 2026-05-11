import { NextRequest } from 'next/server';
import { getServerUser, getUserRole } from '../../../lib/auth';
import { addQuestion, updateQuestion, deleteQuestion, reorderQuestions } from '../../../lib/services/surveyService';
import { logWork } from '../../../lib/worklog';

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const role = await getUserRole(user.id);
    if (!role || !['super_admin', 'admin', 'sales'].includes(role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { survey_id, ...questionData } = body;
    if (!survey_id) return Response.json({ error: 'survey_id required' }, { status: 400 });

    const question = await addQuestion(survey_id, questionData);

    await logWork({
      userId: user.id,
      role: role === 'super_admin' ? 'admin' : role as 'admin',
      action: '添加问题',
      actionCategory: 'survey',
      targetType: 'survey_question',
      targetId: question.id,
      targetName: question.title,
      details: { survey_id },
    });

    return Response.json(question, { status: 201 });
  } catch (error) {
    console.error('[questions POST]', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Internal error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const role = await getUserRole(user.id);
    if (!role || !['super_admin', 'admin', 'sales'].includes(role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();

    if (body.reorder && body.survey_id && body.question_ids) {
      await reorderQuestions(body.survey_id, body.question_ids);
      return Response.json({ success: true });
    }

    const { id, ...updates } = body;
    if (!id) return Response.json({ error: 'id required' }, { status: 400 });

    const question = await updateQuestion(id, updates);
    return Response.json(question);
  } catch (error) {
    console.error('[questions PUT]', error);
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

    await deleteQuestion(id);
    return Response.json({ success: true });
  } catch (error) {
    console.error('[questions DELETE]', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Internal error' }, { status: 500 });
  }
}
