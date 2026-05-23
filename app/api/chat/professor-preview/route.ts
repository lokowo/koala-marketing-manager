import { type NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '../../../lib/supabase/server';
import { getServerUser } from '../../../lib/auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface ProfessorPreviewResult {
  firstImpression: number;
  wouldReply: 'yes' | 'maybe' | 'no';
  wouldReplyReason: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  professorName: string;
  university: string;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await db
      .from('user_profiles')
      .select('plan_type')
      .eq('id', user.id)
      .single();

    if (profile?.plan_type !== 'elite') {
      return Response.json({ error: 'Elite plan required', requiresUpgrade: true }, { status: 403 });
    }

    const body = await request.json();
    const { coldEmailId, subject, body: emailBody, professorId } = body as {
      coldEmailId?: string;
      subject?: string;
      body?: string;
      professorId?: string;
    };

    let finalSubject: string;
    let finalBody: string;
    let profId: string;

    if (coldEmailId) {
      const { data: email } = await db
        .from('cold_emails')
        .select('subject, body, professor_id')
        .eq('id', coldEmailId)
        .eq('user_id', user.id)
        .single();

      if (!email) {
        return Response.json({ error: 'Email not found' }, { status: 404 });
      }
      finalSubject = email.subject;
      finalBody = email.body;
      profId = email.professor_id;
    } else if (subject && emailBody && professorId) {
      finalSubject = subject;
      finalBody = emailBody;
      profId = professorId;
    } else {
      return Response.json({ error: 'Provide coldEmailId or {subject, body, professorId}' }, { status: 400 });
    }

    const [profResult, papersResult] = await Promise.all([
      db.from('professors')
        .select('name, university, faculty, position_title, research_areas, h_index, looking_for')
        .eq('id', profId)
        .single(),
      db.from('papers')
        .select('title, journal, year')
        .eq('professor_id', profId)
        .order('year', { ascending: false })
        .limit(5),
    ]);

    const prof = profResult.data;
    if (!prof) {
      return Response.json({ error: 'Professor not found' }, { status: 404 });
    }

    const papers = papersResult.data ?? [];
    const recentPapers = papers
      .map((p: { title: string; journal: string | null; year: number | null }) =>
        `${p.title}${p.journal ? ` (${p.journal})` : ''}${p.year ? `, ${p.year}` : ''}`
      )
      .join('\n  - ');

    const prompt = `你是 ${prof.name}，${prof.university}${prof.faculty ? ` ${prof.faculty}` : ''} 的${prof.position_title || '教授'}。
你的 H-index 是 ${prof.h_index ?? '未知'}。
你目前的研究方向：${(prof.research_areas ?? []).join('、')}。
${prof.looking_for ? `你目前想要的学生类型：${prof.looking_for}` : ''}
${recentPapers ? `你最近发表的论文：\n  - ${recentPapers}` : ''}

你收到了以下套磁信（Cold Email），请完全从教授视角评价：

Subject: ${finalSubject}

${finalBody}

请用 JSON 格式回复（不要 markdown 代码块），包含：
{
  "firstImpression": <1-10 的整数，1=直接删除 10=立刻想回复>,
  "wouldReply": "<yes/maybe/no>",
  "wouldReplyReason": "<一句话解释为什么会/不会回复>",
  "strengths": ["<打动你的地方，2-4条>"],
  "weaknesses": ["<觉得 generic 或不够 specific 的地方，1-3条>"],
  "suggestions": ["<具体的改进建议，2-4条>"]
}

注意：
- 从真实教授的角度思考，你每天收到很多套磁信
- 关注学生是否真的了解你的研究、是否 specific、是否有独特价值
- strengths 和 weaknesses 要引用信中的具体内容
- suggestions 要可操作，不要泛泛的 "be more specific"`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      system: 'You are simulating a real university professor reading a cold email. Output only valid JSON, no markdown code fences.',
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = (response.content[0] as { type: 'text'; text: string }).text.trim();

    let parsed: ProfessorPreviewResult;
    try {
      const cleaned = raw.replace(/```json|```/g, '');
      const data = JSON.parse(cleaned);
      parsed = {
        firstImpression: Math.max(1, Math.min(10, Math.round(data.firstImpression ?? 5))),
        wouldReply: ['yes', 'maybe', 'no'].includes(data.wouldReply) ? data.wouldReply : 'maybe',
        wouldReplyReason: data.wouldReplyReason ?? '',
        strengths: Array.isArray(data.strengths) ? data.strengths.slice(0, 4) : [],
        weaknesses: Array.isArray(data.weaknesses) ? data.weaknesses.slice(0, 3) : [],
        suggestions: Array.isArray(data.suggestions) ? data.suggestions.slice(0, 4) : [],
        professorName: prof.name,
        university: prof.university,
      };
    } catch {
      return Response.json({ error: 'AI response parse error' }, { status: 500 });
    }

    return Response.json(parsed);
  } catch (e) {
    console.error('[professor-preview]', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
