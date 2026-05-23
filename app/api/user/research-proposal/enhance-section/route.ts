import { getServerUser } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const VALID_SECTIONS = ['background', 'research_questions', 'methodology', 'significance', 'timeline'] as const;
type SectionKey = typeof VALID_SECTIONS[number];

const SECTION_PROMPTS: Record<SectionKey, string> = {
  background: `Enhance this literature review / research background section. Strengthen citations, clarify the research gap, improve academic flow, and ensure each paragraph serves a clear purpose. Maintain all factual references — do not remove or fabricate paper titles.`,
  research_questions: `Enhance this research questions section. Sharpen each question to be specific, measurable, and well-bounded. Improve the logical progression from the overarching question to sub-questions. Add brief justification for each sub-question.`,
  methodology: `Enhance this methodology section. Add specificity to data sources, sampling strategies, and analytical methods. Ensure the methodology clearly maps to the research questions. Use standard academic terminology for the discipline.`,
  significance: `Enhance this significance / contribution section. Strengthen the distinction between theoretical and practical contributions. Add specificity about how this research extends existing knowledge and its potential impact.`,
  timeline: `Enhance this timeline / milestones section. Ensure milestones are specific and achievable. Add realistic deliverables per stage. Keep the 3-4 year PhD structure intact.`,
};

export async function POST(req: Request) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: '请先登录' }, { status: 401 });

    const { document_id, section } = await req.json() as {
      document_id?: string;
      section?: string;
    };

    if (!document_id || !section) {
      return Response.json({ error: 'document_id and section are required' }, { status: 400 });
    }

    if (!VALID_SECTIONS.includes(section as SectionKey)) {
      return Response.json({ error: `Invalid section: ${section}` }, { status: 400 });
    }

    const { data: doc, error: fetchErr } = await db
      .from('generated_documents')
      .select('id, user_id, content, title')
      .eq('id', document_id)
      .single();

    if (fetchErr || !doc) {
      return Response.json({ error: '文档不存在' }, { status: 404 });
    }
    if (doc.user_id !== user.id) {
      return Response.json({ error: '无权限' }, { status: 403 });
    }

    const content = doc.content as Record<string, string>;
    const sectionText = content?.[section];
    if (!sectionText || sectionText.trim().length < 10) {
      return Response.json({ error: '该段落内容太短，无法润色' }, { status: 400 });
    }

    const sectionKey = section as SectionKey;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: `You are an expert academic writing editor specializing in Australian PhD research proposals.

${SECTION_PROMPTS[sectionKey]}

Rules:
1. Output ONLY the enhanced text — no titles, headers, labels, or explanations.
2. Keep the same approximate length (±20%).
3. Maintain all factual content — do not remove real paper titles or data points.
4. Use formal academic English throughout.
5. Do not add markdown formatting — plain text with paragraph breaks only.

Research proposal title for context: "${doc.title ?? ''}"`,
      messages: [{ role: 'user', content: sectionText }],
    });

    const enhanced = response.content[0].type === 'text' ? response.content[0].text.trim() : '';

    if (!enhanced || enhanced.length < 20) {
      return Response.json({ error: '润色结果无效，请重试' }, { status: 500 });
    }

    return Response.json({ enhanced, section });
  } catch (error) {
    console.error('[enhance-section]', error);
    return Response.json({ error: '润色失败，请稍后再试' }, { status: 500 });
  }
}
