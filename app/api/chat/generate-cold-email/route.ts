import { type NextRequest } from 'next/server';
import { getServerUser } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';
import { checkUsage } from '../../../lib/services/usageTracker';
import { generateColdEmailForProfessor } from '../../../lib/services/coldEmailService';
import { upsertApplicationForEmail } from '../../../lib/services/applicationSync';

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return Response.json({ error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const { professorId } = body as { professorId?: string };

    if (!professorId) {
      return Response.json({ error: 'Missing professorId' }, { status: 400 });
    }

    const usage = await checkUsage(supabaseAdmin, user.id, 'email');
    if (!usage.allowed) {
      return Response.json(
        {
          error: '今日套磁信生成次数已用完',
          used: usage.used,
          limit: usage.limit,
        },
        { status: 403 },
      );
    }

    const result = await generateColdEmailForProfessor(
      user.id,
      user.email ?? '',
      professorId,
    );

    if (result.error) {
      const status = result.error === '教授不存在' ? 404 : 400;
      return Response.json({ error: result.error }, { status });
    }

    if (result.id) {
      upsertApplicationForEmail(user.id, professorId, result.id, result.professorUniversity);
    }

    return Response.json({
      id: result.id,
      subject: result.subject,
      body: result.body,
      highlights: result.highlights,
      matchScores: result.matchScores,
      creditsUsed: result.creditsUsed,
      creditsRemaining: result.creditsRemaining,
    });
  } catch (e) {
    console.error('[generate-cold-email]', e);
    return Response.json(
      { error: '套磁信生成失败，请稍后再试' },
      { status: 500 },
    );
  }
}
