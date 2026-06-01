import { getServerUser } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase/server';
import { checkUsage, incrementUsage } from '../../../../lib/services/usageTracker';
import { getStudentContext } from '../../../../lib/server/student-context';
import Anthropic from '@anthropic-ai/sdk';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

interface CVInput {
  professorId?: string;
  // ⚠️ CV 主人的身份信息 —— 只从此处取，绝不回填登录用户 profile
  personal?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
  };
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
    const { professorId } = body;

    const { count } = await db.from('education_history')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (count === 0) {
      return Response.json({
        needsInfo: true,
        message: '我需要先了解你的背景才能帮你定制CV～先告诉我：你本科/硕士是哪个学校、什么专业、什么时候读的？',
        missingFields: ['education'],
      });
    }

    const studentCtx = await getStudentContext(user.id);

    if (!studentCtx) {
      return Response.json({ error: '请先完善个人资料' }, { status: 400 });
    }

    let profContext = '';
    let profName = '';
    if (professorId) {
      const [profRes, papersRes] = await Promise.all([
        db.from('professors')
          .select('name, university, research_areas, ai_bio_zh, looking_for')
          .eq('id', professorId)
          .maybeSingle(),
        db.from('papers')
          .select('title, year, abstract')
          .eq('professor_id', professorId)
          .order('year', { ascending: false })
          .limit(3),
      ]);
      const prof = profRes.data;
      const papers = papersRes.data ?? [];
      if (prof) {
        profName = prof.name;
        const areas = (prof.research_areas ?? []).join('、');
        const paperTitles = papers.map((p: { title: string; year: number | null }) => `"${p.title}" (${p.year ?? 'n/a'})`).join('; ');
        profContext = `\n\n【定制目标】这份 CV 用于申请 ${prof.name}（${prof.university}）的 PhD。
该教授研究方向：${areas}。${papers.length > 0 ? `最新论文主题：${paperTitles}。` : ''}${prof.looking_for ? `教授正在寻找：${prof.looking_for}。` : ''}
请在不捏造的前提下，突出与该教授方向最相关的经历、课程、技能；弱化无关内容。研究经历的措辞要呼应教授的研究领域。`;
      }
    }

    // ⚠️ 反串号铁律:
    // profileData 仅作为"语气/方向参考的元数据",绝不放任何会被复制进 CV 输出的身份字段。
    // 已删除: email / existing_education / existing_work —— 这些字段在登录用户 ≠ CV 主人时会污染输出。
    // CV 的所有正文内容(name/email/phone/education/work/...)只能从 supplementary 取。
    const profileData = JSON.stringify({
      target_field: studentCtx.targetField,
      english_level: studentCtx.englishLevel,
      research_interests: studentCtx.researchInterests,
      research_description: studentCtx.researchDescription,
      has_research_experience: studentCtx.hasResearchExperience,
      career_goal: studentCtx.careerGoal,
    }, null, 2);

    const supplementary = JSON.stringify(body, null, 2);

    const systemPrompt = `You are a professional academic CV consultant. Generate a polished academic CV in structured JSON format.

Rules:
1. All text output in English (academic CV standard)
2. Use strong action verbs (Led, Developed, Conducted, Published, etc.)
3. Quantify outcomes when possible
4. Do NOT fabricate any data — only polish what the user provides
5. If information is missing, use "[To be added]" placeholder
6. CRITICAL: If the user has no publications (has_publications is false, or publications array is empty/missing), do NOT generate a publications section at all. Never invent papers, journal names, or DOIs.
7. Dates: "YYYY" or "YYYY - YYYY" or "YYYY - Present"
8. GPA: "X.XX/Y.YY" format
9. ⚠️ DATA SOURCE RULE (critical): Use ONLY the supplementary input for all CV content fields (name / email / phone / location / education / work / publications / skills / awards / references). The "user profile" block is metadata for tone alignment ONLY — do NOT copy any profile field into the output. If a field is absent from supplementary, output null (for personal.email/phone/location) or "[To be added]" (for free-text fields), never backfill from the user profile.
10. For research descriptions, expand brief entries into 2-3 professional bullet points
11. Order sections: Education → Research Experience → Publications (only if provided) → Skills → Awards → References

=== ENHANCEMENT METHODOLOGY (apply to all descriptions) ===

A. STAR-structured experience bullets:
   For each research/work entry, structure description bullets to show causality:
   - What was the context/problem (brief)
   - What action YOU took (strong verb: Designed, Implemented, Analyzed, Optimized...)
   - What was the measurable result
   Each bullet should contain at least one action→outcome chain.

B. Quantification (be specific, never fabricate):
   When the user's data contains numbers, surface them. Quantify along these dimensions when data exists:
   - Scale: dataset size, team size, number of experiments/samples
   - Efficiency: time reduced, performance improved (use % only if user provided it)
   - Impact: citations, adoption, awards, grades
   CRITICAL: If no real number exists, use qualitative strength words (significantly, substantially) or scope descriptions. NEVER invent specific numbers, percentages, or metrics.

C. Target-relevance weighting (when【定制目标】profContext is present):
   - Within each section, order the most professor-relevant entries FIRST
   - Align skill keywords with the professor's research_areas terminology
   - Phrase research descriptions to echo the professor's research themes and paper topics
   - This is reorganization/emphasis of REAL content, not fabrication

D. Gap handling (honest, not inflated):
   For weak or missing areas, use transferable skills and learning trajectory framing:
   - No direct research experience → highlight research methods training in coursework/projects
   - Career changer → frame prior experience as transferable strengths
   Never leave awkward blanks, never exaggerate. Honest positive framing only.

ABSOLUTE BOTTOM LINE: All enhancements ORGANIZE real information better. They do NOT create information. If the user lacks data for a section, use "[To be added]" — do not fabricate.

=== END METHODOLOGY ===
${profContext}
Output strictly this JSON structure (no markdown code blocks):
{
  "personal": {
    "name": "string",
    "email": "string or null",
    "phone": "string or null",
    "location": "string or null",
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

    // Normalize variant keys the LLM may produce
    if (Array.isArray(cvContent.awards)) {
      for (const a of cvContent.awards as Record<string, unknown>[]) {
        if (!a.organization && a.issuer) { a.organization = a.issuer; delete a.issuer; }
      }
    }
    if (Array.isArray(cvContent.references)) {
      for (const r of cvContent.references as Record<string, unknown>[]) {
        if (!r.university && r.institution) { r.university = r.institution; delete r.institution; }
      }
    }

    const personal = cvContent.personal as { name?: string };
    const title = professorId && profName
      ? `CV for ${profName}`
      : `Academic CV — ${personal.name || studentCtx.displayName || 'Untitled'}`;

    const { data: doc, error: insertErr } = await db
      .from('generated_documents')
      .insert({
        user_id: user.id,
        type: 'cv',
        title,
        content: cvContent,
        status: 'draft',
        credits_used: 1,
        professor_id: professorId ?? null,
        schema_version: 1,
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
