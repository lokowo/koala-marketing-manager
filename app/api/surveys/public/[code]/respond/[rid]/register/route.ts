import { NextRequest } from 'next/server';
import { registerFromSurvey } from '../../../../../../../lib/services/surveyService';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string; rid: string }> },
) {
  try {
    const { rid } = await params;
    const body = await req.json();
    const { email, password, full_name, phone } = body;

    // Validation
    if (!email) {
      return Response.json({ error: '邮箱不能为空' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return Response.json({ error: '密码不能少于6位' }, { status: 400 });
    }

    const result = await registerFromSurvey(rid, email, password, full_name, phone);

    return Response.json(
      { success: true, user_id: result.userId, credits: result.credits },
      { status: 201 },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal error';
    if (msg.includes('already') || msg.includes('Already') || msg.includes('duplicate')) {
      console.error('[public survey register POST] duplicate email', error);
      return Response.json({ error: '该邮箱已注册' }, { status: 409 });
    }
    console.error('[public survey register POST]', error);
    return Response.json({ error: msg }, { status: 500 });
  }
}
