import { type NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getServerUser } from '../../../lib/auth';
import { getProfessor } from '../../../lib/services/professorService';
import { supabaseAdmin } from '../../../lib/supabase/server';
import { buildStudentSummary, buildProfessorSummary } from '../../../lib/services/coldEmailService';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

interface InterviewTopic {
  topic: string;
  why: string;
  howToAnswer: string;
}

interface ApplicationPackage {
  cvAdvice: string;
  coldEmail: { subject: string; body: string };
  researchSummary: string;
  interviewTopics: InterviewTopic[];
}

async function callClaude(system: string, prompt: string): Promise<string> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system,
    messages: [{ role: 'user', content: prompt }],
  });
  return (response.content[0] as { type: 'text'; text: string }).text.trim();
}

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

    const professor = await getProfessor(professorId);
    if (!professor) {
      return Response.json({ error: '教授不存在' }, { status: 404 });
    }

    const { data: profile } = await db
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return Response.json({ error: '请先完善个人画像' }, { status: 400 });
    }

    const [papersRes, grantsRes] = await Promise.all([
      db.from('papers').select('title, year, citation_count, journal, doi_url, abstract').eq('professor_id', professorId).order('year', { ascending: false }).limit(5),
      db.from('grants').select('project_title, funding_body, year, amount').eq('lead_professor_id', professorId).order('year', { ascending: false }).limit(3),
    ]);
    const papers = papersRes.data ?? [];
    const grants = grantsRes.data ?? [];

    const studentInfo = buildStudentSummary(profile);
    const professorInfo = buildProfessorSummary(professor, papers, grants);

    const [cvAdvice, coldEmailRaw, researchSummary, interviewTopicsRaw] = await Promise.all([
      callClaude(
        'You are a PhD application CV advisor. Respond in Chinese (中文). Be specific and actionable.',
        `根据以下教授的研究方向和招生偏好，为学生提供 CV 定制建议。

## 教授信息
${professorInfo}

## 学生信息
${studentInfo}

请以下面格式回复（纯文本，不用 JSON）：
1. 应该突出的部分（列出 3-5 条，每条说清楚为什么这个教授会关注）
2. 可以弱化的部分（列出 1-3 条，说明为什么对这个教授不重要）
3. 建议补充的内容（如果学生缺少某些关键信息）
4. CV 格式建议（针对澳洲学术申请的具体建议）`,
      ),

      callClaude(
        'You are a PhD application email expert. Output only valid JSON, no markdown code fences.',
        `Generate a professional cold email from a prospective PhD student to an Australian professor.

## Student Profile
${studentInfo}

## Professor Profile
${professorInfo}

## Requirements
1. First paragraph: brief self-introduction based on the student profile
2. Second paragraph: reference at least one specific recent paper from the professor's publication list. Mention the paper title and explain why it interests the student.
3. Third paragraph: identify research intersections between the student's interests and the professor's research areas. Be specific.
4. Closing: express interest in PhD supervision, mention attaching CV, and propose a brief meeting.
5. Total length: 250-350 words in English.
6. Tone: professional but personable.
7. Subject line: specific, referencing the research area.

Return a valid JSON object:
{
  "subject": "Email subject line",
  "body": "Full email body text"
}`,
      ),

      callClaude(
        'You are a research analyst. Respond in Chinese (中文). Be informative and structured.',
        `根据以下教授的完整信息，生成一份约 300 字的研究概要（中文）。

## 教授信息
${professorInfo}

请包含以下内容：
1. 主要研究方向（用通俗语言解释）
2. 代表性研究成果（引用具体论文或项目）
3. 当前活跃项目或基金（如果有）
4. 适合什么样的学生（基于教授的研究方向和招生偏好）

输出纯文本，不要用 JSON 格式。`,
      ),

      callClaude(
        'You are a PhD interview preparation coach. Output only valid JSON, no markdown code fences.',
        `根据教授的研究方向和学生的背景，生成 5 个可能的面试话题。

## 教授信息
${professorInfo}

## 学生信息
${studentInfo}

对每个话题，用中文提供：
1. 话题名称
2. 为什么教授关心这个话题（结合教授的具体研究）
3. 学生可以怎么回答（用 STAR 格式提示：Situation-Task-Action-Result）

Return a valid JSON array:
[
  {
    "topic": "话题名称",
    "why": "教授为什么关心这个",
    "howToAnswer": "STAR 格式回答建议"
  }
]`,
      ),
    ]);

    let coldEmail: { subject: string; body: string };
    try {
      coldEmail = JSON.parse(coldEmailRaw.replace(/```json|```/g, ''));
    } catch {
      coldEmail = { subject: 'PhD Application Inquiry', body: coldEmailRaw };
    }

    let interviewTopics: InterviewTopic[];
    try {
      interviewTopics = JSON.parse(interviewTopicsRaw.replace(/```json|```/g, ''));
    } catch {
      interviewTopics = [{ topic: '研究方向讨论', why: '了解你的学术兴趣', howToAnswer: '用 STAR 格式描述你的研究经历' }];
    }

    const result: ApplicationPackage = {
      cvAdvice,
      coldEmail,
      researchSummary,
      interviewTopics,
    };

    return Response.json({
      professor: {
        id: professor.id,
        name: professor.name,
        university: professor.university,
        faculty: professor.faculty,
        researchAreas: professor.researchAreas,
        email: professor.email,
      },
      package: result,
    });
  } catch (error) {
    console.error('[application-package]', error);
    return Response.json(
      { error: '申请包生成失败，请稍后再试' },
      { status: 500 },
    );
  }
}
