import { getServerUser } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';
import { checkUsage } from '../../../lib/services/usageTracker';
import { generateColdEmailForProfessor } from '../../../lib/services/coldEmailService';
import { upsertApplicationForEmail } from '../../../lib/services/applicationSync';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function POST(request: Request) {
  const user = await getServerUser();
  if (!user) {
    return Response.json({ error: '请先登录' }, { status: 401 });
  }

  const body = await request.json();
  const { professorIds } = body as { professorIds?: string[] };

  if (!professorIds || !Array.isArray(professorIds) || professorIds.length === 0) {
    return Response.json({ error: 'Missing professorIds' }, { status: 400 });
  }

  if (professorIds.length > 10) {
    return Response.json({ error: '单次最多批量生成 10 封' }, { status: 400 });
  }

  const usage = await checkUsage(supabaseAdmin, user.id, 'email');
  if (!usage.allowed) {
    return Response.json(
      { error: '今日套磁信生成次数已用完', used: usage.used, limit: usage.limit },
      { status: 403 },
    );
  }

  const { data: profile } = await db
    .from('user_profiles')
    .select('credits_remaining')
    .eq('id', user.id)
    .single();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      send('start', { total: professorIds.length, creditsRemaining: profile?.credits_remaining ?? 0 });

      let generated = 0;
      let failed = 0;

      for (let i = 0; i < professorIds.length; i++) {
        const professorId = professorIds[i];
        send('progress', { current: i + 1, total: professorIds.length, professorId });

        try {
          const result = await generateColdEmailForProfessor(
            user.id,
            user.email ?? '',
            professorId,
          );

          if (result.error) {
            send('email_error', {
              professorId,
              professorName: result.professorName,
              error: result.error,
              current: i + 1,
              total: professorIds.length,
            });
            failed++;
          } else {
            if (result.id) {
              upsertApplicationForEmail(user.id, professorId, result.id, result.professorUniversity);
            }
            generated++;
            send('email_done', {
              current: i + 1,
              total: professorIds.length,
              result: {
                id: result.id,
                subject: result.subject,
                body: result.body,
                highlights: result.highlights,
                matchScores: result.matchScores,
                creditsUsed: result.creditsUsed,
                creditsRemaining: result.creditsRemaining,
                professorId: result.professorId,
                professorName: result.professorName,
                professorUniversity: result.professorUniversity,
              },
            });
          }
        } catch (err) {
          failed++;
          send('email_error', {
            professorId,
            professorName: 'Unknown',
            error: err instanceof Error ? err.message : '生成失败',
            current: i + 1,
            total: professorIds.length,
          });
        }
      }

      send('done', { totalGenerated: generated, totalFailed: failed });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
