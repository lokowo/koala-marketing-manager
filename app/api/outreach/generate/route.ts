import type { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { buildEmailPrompt } from '../../../lib/prompts/email';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function getServerSupabase() {
  const { createClient } = await import('@supabase/supabase-js');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

async function checkCredits(userId: string | null): Promise<{ balance: number; ok: boolean }> {
  if (!userId) return { balance: 1, ok: true }; // Allow anonymous with 1 credit for demo
  try {
    const supabase = await getServerSupabase();
    const { data } = await supabase
      .from('user_credits')
      .select('credit_balance')
      .eq('user_id', userId)
      .single();
    const balance = data?.credit_balance ?? 0;
    return { balance, ok: balance > 0 };
  } catch {
    return { balance: 1, ok: true }; // Fail open in dev
  }
}

async function deductCredit(userId: string): Promise<void> {
  const supabase = await getServerSupabase();
  await supabase.rpc('deduct_credit', { p_user_id: userId });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { professorId, studentProfile, tone = 'professional', purpose = 'PhD', userId } = body;

    if (!professorId) {
      return Response.json({ error: 'Missing professorId' }, { status: 400 });
    }

    // 1. Check credits
    const { balance, ok } = await checkCredits(userId ?? null);
    if (!ok) {
      return Response.json({
        error: 'Insufficient credits',
        message: '积分不足，请购买积分包或升级订阅。',
        remainingCredits: balance,
      }, { status: 402 });
    }

    // 2. Get professor info
    const supabase = await getServerSupabase();
    const { data: prof } = await supabase
      .from('professors')
      .select('name, university, research_areas, email, email_source, position_title')
      .eq('id', professorId)
      .single();

    if (!prof) {
      return Response.json({ error: 'Professor not found' }, { status: 404 });
    }

    // 3. Get professor grants (for context)
    const { data: grants } = await supabase
      .from('grants')
      .select('project_title, arc_project_id')
      .eq('lead_professor_id', professorId)
      .limit(3);

    // 4. Build prompt
    const studentBg = studentProfile
      ? `专业：${studentProfile.major ?? '未知'}，学历：${studentProfile.degreeLevel ?? '未知'}，GPA: ${studentProfile.gpa ?? '未填写'}，研究兴趣：${studentProfile.researchInterests?.join('、') ?? '未知'}`
      : '学生背景未提供，请生成通用版本的套磁信框架。';

    const prompt = buildEmailPrompt({
      professorName: prof.name,
      professorInstitution: prof.university,
      professorResearchAreas: prof.research_areas ?? [],
      professorRecentGrants: grants?.map((g: { project_title: string; arc_project_id?: string }) => `${g.project_title}${g.arc_project_id ? ` (${g.arc_project_id})` : ''}`),
      studentBackground: studentBg,
      purpose,
      tone,
    });

    // 5. Generate with Claude
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find(b => b.type === 'text');
    const rawText = textBlock?.type === 'text' ? textBlock.text : '';

    let emailData: { subjectLine: string; emailBody: string; followupBody: string; riskNote: string };
    try {
      // Claude should return pure JSON per EMAIL_GENERATION_PROMPT
      emailData = JSON.parse(rawText);
    } catch {
      // Fallback: try to extract from markdown blocks
      const match = rawText.match(/```json\n([\s\S]*?)\n```/);
      if (match) {
        try {
          emailData = JSON.parse(match[1]);
        } catch {
          return Response.json({ error: 'Email generation failed', reply: 'AI 生成格式错误，请重试。' }, { status: 500 });
        }
      } else {
        return Response.json({ error: 'Email generation failed' }, { status: 500 });
      }
    }

    // 6. Save to DB
    const { data: savedEmail } = await supabase
      .from('outreach_emails')
      .insert({
        professor_id: professorId,
        user_id: userId ?? null,
        subject_line: emailData.subjectLine,
        email_body: emailData.emailBody,
        followup_body: emailData.followupBody,
        risk_note: emailData.riskNote,
        tone,
        purpose,
        status: 'draft',
        credits_used: 1,
        was_free: balance >= 10, // first email is free (balance starts at 10 for new users)
      })
      .select('id')
      .single();

    // 7. Deduct credit if user is logged in
    if (userId) {
      await deductCredit(userId).catch(() => {});
    }

    return Response.json({
      emailId: savedEmail?.id ?? null,
      subjectLine: emailData.subjectLine,
      emailBody: emailData.emailBody,
      followupBody: emailData.followupBody,
      riskNote: emailData.riskNote,
      professorName: prof.name,
      professorInstitution: prof.university,
      professorEmail: prof.email ?? null,
      emailSource: prof.email_source ?? null,
      creditsUsed: 1,
      remainingCredits: balance - 1,
    });
  } catch (e) {
    console.error('[Outreach Generate]', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
