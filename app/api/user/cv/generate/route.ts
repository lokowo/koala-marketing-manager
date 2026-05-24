import { getServerUser } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase/server';
import { checkUsage, incrementUsage } from '../../../../lib/services/usageTracker';
import { getStudentContext } from '../../../../lib/server/student-context';
import Anthropic from '@anthropic-ai/sdk';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

interface CVInput {
  education?: Array<{
    degree: string;
    university: string;
    gpa?: string;
    dates?: string;
    thesis?: string;
  }>;
  research_experience?: Array<{
    title: string;
    lab?: string;
    supervisor?: string;
    period?: string;
    description?: string;
  }>;
  publications?: Array<{
    title: string;
    journal?: string;
    year?: number;
    authors?: string;
    doi?: string;
  }>;
  skills?: {
    technical?: string[];
    languages?: string[];
    tools?: string[];
  };
  awards?: Array<{
    title: string;
    organization?: string;
    year?: number;
  }>;
  references?: Array<{
    name: string;
    title?: string;
    university?: string;
    email?: string;
    relationship?: string;
  }>;
}

export async function POST(req: Request) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: '请先登录' }, { status: 401 });

    const usage = await checkUsage(supabaseAdmin, user.id, 'cv');
    if (!usage.allowed) {
      return Response.json({
        error: 'CV 生成次数已达上限',
        used: usage.used,
        limit: usage.limit,
      }, { status: 403 });
    }

    const body: CVInput = await req.json();
    const studentCtx = await getStudentContext(user.id);

    if (!studentCtx) {
      return Response.json({ error: '请先完善个人资料' }, { status: 400 });
    }

    const profileData = JSON.stringify({
      name: studentCtx.displayName,
      email: studentCtx.email,
      university: studentCtx.university,
      major: studentCtx.major,
      degree_level: studentCtx.degreeLevel,
      gpa: studentCtx.gpa,
      gpa_scale: studentCtx.gpaScale,
      target_field: studentCtx.targetField,
      english_level: studentCtx.englishLevel,
      research_interests: studentCtx.researchInterests,
      research_description: studentCtx.researchDescription,
      has_research_experience: studentCtx.hasResearchExperience,
      career_goal: studentCtx.careerGoal,
      existing_education: studentCtx.education,
      existing_work: studentCtx.work,
    }, null, 2);

    const supplementary = JSON.stringify(body, null, 2);

    const systemPrompt = `You are a professional academic CV consultant. Generate a polished academic CV in structured JSON format.

Rules:
1. All text output in English (academic CV standard)
2. Use strong action verbs (Led, Developed, Conducted, Published, etc.)
3. Quantify outcomes when possible
4. Do NOT fabricate any data — only polish what the user provides
5. If information is missing, use "[To be added]" placeholder
6. Dates: "YYYY" or "YYYY - YYYY" or "YYYY - Present"
7. GPA: "X.XX/Y.YY" format
8. Merge data from both the user profile and supplementary input, deduplicating by content similarity
9. For research descriptions, expand brief entries into 2-3 professional bullet points
10. Order sections: Education → Research Experience → Publications → Skills → Awards → References

Output strictly this JSON structure (no markdown code blocks):
{
  "personal": {
    "name": "string",
    "email": "string or null",
    "phone": "string or null",
    "linkedin": "string or null"
  },
  "education": [
    {
      "degree": "string",
      "university": "string",
      "gpa": "string or null",
      "dates": "string",
      "thesis": "string or null"
    }
  ],
  "research": [
    {
      "title": "string",
      "lab": "string or null",
      "supervisor": "string or null",
      "period": "string",
      "description": "string (2-3 bullet points joined by newline)"
    }
  ],
  "publications": [
    {
      "title": "string",
      "journal": "string or null",
      "year": number or null,
      "authors": "string or null",
      "doi": "string or null"
    }
  ],
  "skills": {
    "technical": ["string"],
    "languages": ["string"],
    "tools": ["string"]
  },
  "awards": [
    {
      "title": "string",
      "organization": "string or null",
      "year": number or null
    }
  ],
  "references": [
    {
      "name": "string",
      "title": "string or null",
      "university": "string or null",
      "email": "string or null",
      "relationship": "string or null"
    }
  ]
}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: `User profile data:\n${profileData}\n\nSupplementary CV input:\n${supplementary}\n\nGenerate the polished academic CV JSON.`,
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json({ error: 'CV 生成格式错误，请重试' }, { status: 500 });
    }

    let cvContent: Record<string, unknown>;
    try {
      cvContent = JSON.parse(jsonMatch[0]);
    } catch {
      return Response.json({ error: 'CV 解析失败，请重试' }, { status: 500 });
    }

    if (!cvContent.personal || !cvContent.education) {
      return Response.json({ error: 'CV 缺少必要段落，请重试' }, { status: 500 });
    }

    const personal = cvContent.personal as { name?: string };
    const title = `Academic CV — ${personal.name || studentCtx.displayName || 'Untitled'}`;

    const { data: doc, error: insertErr } = await db
      .from('generated_documents')
      .insert({
        user_id: user.id,
        type: 'cv',
        title,
        content: cvContent,
        status: 'draft',
        credits_used: 1,
      })
      .select('id')
      .single();

    if (insertErr) {
      console.error('[cv/generate] save error:', insertErr);
    }

    await incrementUsage(supabaseAdmin, user.id, 'cv');

    return Response.json({
      id: doc?.id ?? null,
      content: cvContent,
      title,
      credits_used: 1,
    });
  } catch (error) {
    console.error('[cv/generate]', error);
    return Response.json({ error: 'CV 生成失败，请稍后再试' }, { status: 500 });
  }
}
