import type { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { buildEmailPrompt } from '../../../lib/prompts/email';
import { getStudentContext, buildStudentBackgroundForEmail } from '../../../lib/server/student-context';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function getDb() {
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  ) as ReturnType<typeof createClient> & Record<string, unknown>;
}

interface BatchGenerateBody {
  professorIds: string[];
  studentProfile?: {
    major?: string;
    degreeLevel?: string;
    gpa?: string;
    researchInterests?: string[];
    university?: string;
  };
  tone?: string;
  purpose?: string;
  userId?: string;
}

interface EmailResult {
  professorId: string;
  professorName: string;
  professorInstitution: string;
  subjectLine: string;
  emailBody: string;
  followupBody: string;
  riskNote: string;
  emailId?: string;
  error?: string;
}

function sendEvent(controller: ReadableStreamDefaultController, data: object) {
  const encoder = new TextEncoder();
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
}

export async function POST(request: NextRequest) {
  const body: BatchGenerateBody = await request.json();
  const { professorIds, studentProfile, tone = 'professional', purpose = 'PhD', userId } = body;

  if (!professorIds?.length) {
    return Response.json({ error: 'Missing professorIds' }, { status: 400 });
  }

  const count = professorIds.length;
  const db = await getDb();

  // Credit check upfront
  let creditBalance = count; // fail-open for anonymous
  if (userId) {
    const { data: creditRow } = await (db as any)
      .from('user_credits')
      .select('credit_balance')
      .eq('user_id', userId)
      .single();
    creditBalance = creditRow?.credit_balance ?? 0;
    if (creditBalance < count) {
      return Response.json({
        error: 'Insufficient credits',
        message: `积分不足。需要 ${count} 积分，剩余 ${creditBalance} 积分。`,
        required: count,
        remaining: creditBalance,
      }, { status: 402 });
    }
  }

  // Load full student profile from DB when available
  let studentBg: string;
  if (userId) {
    const ctx = await getStudentContext(userId);
    if (ctx && ctx.profileCompleteness > 20) {
      studentBg = buildStudentBackgroundForEmail(ctx);
    } else if (studentProfile) {
      studentBg = [
        studentProfile.major ? `专业：${studentProfile.major}` : '',
        studentProfile.degreeLevel ? `学历：${studentProfile.degreeLevel}` : '',
        studentProfile.gpa ? `GPA：${studentProfile.gpa}` : '',
        studentProfile.university ? `学校：${studentProfile.university}` : '',
        studentProfile.researchInterests?.length ? `研究兴趣：${studentProfile.researchInterests.join('、')}` : '',
      ].filter(Boolean).join('，');
    } else {
      studentBg = '学生背景未提供，生成通用版本申请信框架。';
    }
  } else if (studentProfile) {
    studentBg = [
      studentProfile.major ? `专业：${studentProfile.major}` : '',
      studentProfile.degreeLevel ? `学历：${studentProfile.degreeLevel}` : '',
      studentProfile.gpa ? `GPA：${studentProfile.gpa}` : '',
      studentProfile.university ? `学校：${studentProfile.university}` : '',
      studentProfile.researchInterests?.length ? `研究兴趣：${studentProfile.researchInterests.join('、')}` : '',
    ].filter(Boolean).join('，');
  } else {
    studentBg = '学生背景未提供，生成通用版本申请信框架。';
  }

  const stream = new ReadableStream({
    async start(controller) {
      sendEvent(controller, { type: 'start', total: count });

      const results: EmailResult[] = [];

      for (let i = 0; i < professorIds.length; i++) {
        const profId = professorIds[i];
        sendEvent(controller, { type: 'progress', current: i + 1, total: count, professorId: profId });

        try {
          const { data: prof } = await (db as any)
            .from('professors')
            .select('name, university, research_areas, email, email_source, position_title')
            .eq('id', profId)
            .single();

          if (!prof) {
            results.push({ professorId: profId, professorName: '未知', professorInstitution: '', subjectLine: '', emailBody: '', followupBody: '', riskNote: '', error: '教授信息未找到' });
            sendEvent(controller, { type: 'email_error', professorId: profId, index: i, error: '教授信息未找到' });
            continue;
          }

          const { data: grants } = await (db as any)
            .from('grants')
            .select('project_title, arc_project_id')
            .eq('lead_professor_id', profId)
            .limit(3);

          const prompt = buildEmailPrompt({
            professorName: prof.name,
            professorInstitution: prof.university,
            professorResearchAreas: prof.research_areas ?? [],
            professorRecentGrants: grants?.map((g: { project_title: string; arc_project_id?: string }) =>
              `${g.project_title}${g.arc_project_id ? ` (${g.arc_project_id})` : ''}`
            ),
            studentBackground: studentBg,
            purpose,
            tone,
          });

          const response = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 1500,
            messages: [{ role: 'user', content: prompt }],
          });

          const textBlock = response.content.find(b => b.type === 'text');
          const rawText = textBlock?.type === 'text' ? textBlock.text : '';

          let emailData: { subjectLine: string; emailBody: string; followupBody: string; riskNote: string };
          try {
            emailData = JSON.parse(rawText);
          } catch {
            const match = rawText.match(/```json\n([\s\S]*?)\n```/);
            emailData = match ? JSON.parse(match[1]) : { subjectLine: 'PhD Application Inquiry', emailBody: rawText, followupBody: '', riskNote: '解析失败，请手动确认格式' };
          }

          // Save to DB
          let emailId: string | undefined;
          const { data: saved } = await (db as any)
            .from('outreach_emails')
            .insert({
              professor_id: profId,
              user_id: userId ?? null,
              subject_line: emailData.subjectLine,
              email_body: emailData.emailBody,
              followup_body: emailData.followupBody,
              risk_note: emailData.riskNote,
              tone,
              purpose,
              status: 'draft',
              credits_used: 1,
            })
            .select('id')
            .single();
          emailId = saved?.id;

          const result: EmailResult = {
            professorId: profId,
            professorName: prof.name,
            professorInstitution: prof.university,
            subjectLine: emailData.subjectLine,
            emailBody: emailData.emailBody,
            followupBody: emailData.followupBody,
            riskNote: emailData.riskNote,
            emailId,
          };
          results.push(result);
          sendEvent(controller, { type: 'email_done', index: i, result });

          // Deduct credit per email
          if (userId) {
            await (db as any).rpc('deduct_credit', { p_user_id: userId }).catch(() => {});
          }
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : '生成失败';
          results.push({ professorId: profId, professorName: '未知', professorInstitution: '', subjectLine: '', emailBody: '', followupBody: '', riskNote: '', error: errMsg });
          sendEvent(controller, { type: 'email_error', professorId: profId, index: i, error: errMsg });
        }

        // Rate limiting: small pause between calls
        if (i < professorIds.length - 1) {
          await new Promise(r => setTimeout(r, 300));
        }
      }

      sendEvent(controller, { type: 'done', results, totalGenerated: results.filter(r => !r.error).length });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
