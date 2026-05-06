import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const TOP_JOURNALS = ['Nature', 'Science', 'Cell', 'Nature Materials', 'Nature Energy',
  'Nature Chemistry', 'Nature Communications', 'PNAS', 'Advanced Materials',
  'Chemical Reviews', 'Chemical Society Reviews', 'Energy & Environmental Science',
  'Joule', 'Angewandte Chemie', 'Advanced Energy Materials', 'ACS Nano',
  'Journal of the American Chemical Society', 'Nano Letters'];

const isTopJournal = (journal: string) =>
  TOP_JOURNALS.some(t => journal?.toLowerCase().includes(t.toLowerCase()));

export async function POST(req: NextRequest) {
  const { professorId } = await req.json().catch(() => ({ professorId: null }));

  if (!professorId) {
    return Response.json({ error: 'professorId required' }, { status: 400 });
  }

  // Step 1: Read professor
  const { data: professor, error: profError } = await db
    .from('professors')
    .select('*')
    .eq('id', professorId)
    .single();

  if (profError || !professor) {
    return Response.json({ error: 'Professor not found', details: profError?.message }, { status: 404 });
  }

  const profName = professor.name || professor.name_en || 'Unknown';
  const university = professor.university || professor.institution || '';
  const faculty = professor.faculty || '';
  const positionTitle = professor.position_title || professor.title || 'Researcher';
  const researchAreas = (professor.research_areas || professor.research_tags || []).join(', ');

  // Step 2: Read papers (top 10 by citations)
  let papers: { title: string; year: number; journal: string; citation_count: number; doi_url?: string }[] = [];
  try {
    const { data } = await db
      .from('papers')
      .select('title, year, journal, citation_count, doi_url')
      .eq('professor_id', professorId)
      .order('citation_count', { ascending: false })
      .limit(10);
    papers = data || [];
  } catch { /* papers table may not exist */ }

  // Step 3: Read grants
  let grants: { grant_name: string; funding_body: string; year: number; amount: number; project_title: string; phd_relevance: string; industry_scholarship_potential: string }[] = [];
  try {
    const { data } = await db
      .from('grants')
      .select('grant_name, funding_body, year, amount, project_title, phd_relevance, industry_scholarship_potential')
      .eq('lead_professor_id', professorId)
      .order('year', { ascending: false });
    grants = data || [];
  } catch { /* grants table may not exist */ }

  // Build context for AI
  const papersContext = papers.length > 0
    ? papers.map((p, i) =>
      `${isTopJournal(p.journal) ? '⭐' : '  '} ${i + 1}. "${p.title}" — ${p.journal}, ${p.year}, cited ${p.citation_count} times`
    ).join('\n')
    : '暂无论文数据';

  const grantsContext = grants.length > 0
    ? grants.map(g =>
      `- ${g.grant_name} (${g.funding_body}, ${g.year}): $${g.amount?.toLocaleString() || 'N/A'}\n  Project: "${g.project_title}"\n  PhD Relevance: ${g.phd_relevance || 'N/A'}`
    ).join('\n')
    : '';

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  // Step 4: Generate Chinese article (Sonnet)
  let zhData: { titleZh: string; excerptZh: string; contentZh: string; tags: string[] };
  try {
    const zhResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: `请为以下教授撰写一篇800-1200字的中文教授推荐文章。

PROFESSOR PROFILE:
Name: ${profName}
University: ${university}${faculty ? ` · ${faculty}` : ''}
Position: ${positionTitle}
Research Areas: ${researchAreas}
H-Index: ${professor.h_index || 'N/A'} | Papers: ${professor.paper_count || papers.length} | Citations: ${professor.citation_count || 'N/A'}
Accepting Students: ${professor.accepting_students ? '是' : '未知'}
Suitable Backgrounds: ${(professor.suitable_student_backgrounds || []).join(', ') || 'N/A'}
Potential RP Topics: ${(professor.potential_rp_topics || []).join(', ') || 'N/A'}

TOP PUBLICATIONS (⭐ = top-tier journal):
${papersContext}

${grantsContext ? `GRANTS & FUNDING (${grants.length} total):\n${grantsContext}` : '(无经费数据)'}

文章结构：
1. 开头亮点 — 如果有 Nature/Science 等顶刊论文，开头就提；如果有大额 grant，也值得强调
2. 研究方向解读 — 用通俗语言，让本科生也能理解这个领域在做什么、为什么重要
3. 代表性论文 — 顶刊论文重点用2-3句解释为什么这篇论文重要
4. 在研经费与项目 — 有 grant 说明有钱，有钱意味着有奖学��名额（如果没有 grant 数据跳过这段）
5. 对PhD学生的价值 — 跟这位教授读博能获得什么
6. 申请建议 — 什么背景适合，如何准备申请信

写作规则（严格遵守）：
- 语气：考拉学长风格，温暖专业，像一个了解情况的学长在分享
- 绝对不要用 emoji 或表情符号
- 不要用 AI 模板开头（禁止："让我们来看看"、"今天我们来聊聊"、"在当今"、"众所周知"、"不得不说"）
- 不要用过度夸张的形容词（禁止："令人瞩目"、"首屈一指"、"举世闻名"）
- 不要用 AI 过渡词（禁止："值得一提的是"、"简单来说"、"具体来说"、"总的来说"、"换句话说"、"不难发现"）
- 句式要自然多变，避免排比和重复句式
- 不要编造任何数据，所有数字来自上面提供的数据
- Markdown 格式，但禁止使用 --- 水平线和 > 引用块
- 涉及数据对比（如论文引用、H-index、经费金额）时，用 markdown 表格展示，不要把数字堆在文字段落里
- 文末加一句引导：想了解更多？在 Koala PhD 查看 ${profName} 教授的完整档案

返回JSON：{"titleZh": "中文标题", "excerptZh": "100字摘要", "contentZh": "正文markdown", "tags": ["标签1","标签2",...]}` }],
      system: 'You MUST return ONLY valid JSON. All string values must use proper JSON escaping: use \\n for newlines, \\" for quotes inside strings. Do not use markdown code fences. Do not add any text before or after the JSON object.',
    });

    let zhText = '';
    for (const block of zhResponse.content) {
      if (block.type === 'text') { zhText = block.text; break; }
    }

    const stripped = zhText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    const candidate = jsonMatch ? jsonMatch[0] : stripped;

    try {
      zhData = JSON.parse(candidate);
    } catch {
      const fixResponse = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 6000,
        messages: [{
          role: 'user',
          content: `The following text is malformed JSON. Fix it and return ONLY valid JSON with fields: titleZh (string), excerptZh (string), contentZh (string), tags (array of strings). Ensure all string values properly escape quotes and newlines.\n\n${candidate.slice(0, 8000)}`,
        }],
        system: 'Return ONLY valid JSON. No markdown, no explanation, no code fences.',
      });
      const fixText = fixResponse.content[0].type === 'text' ? fixResponse.content[0].text : '';
      const fixCleaned = fixText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const fixMatch = fixCleaned.match(/\{[\s\S]*\}/);
      zhData = JSON.parse(fixMatch ? fixMatch[0] : fixCleaned);
    }
  } catch (e) {
    console.error('[generate-professor] Chinese article failed:', (e as Error).message, (e as Error).stack);
    return Response.json({ error: 'Chinese article generation failed', details: (e as Error).message }, { status: 500 });
  }

  // Step 5+6 (parallel, Haiku): Translate + SEO
  let enData = { titleEn: '', excerptEn: '', contentEn: '' };
  let seo = { seoTitleZh: '', seoDescriptionZh: '', seoKeywordsZh: '' };

  const [enResult, seoResult] = await Promise.allSettled([
    anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 3000,
      messages: [{ role: 'user', content: `Translate this Chinese professor profile article to English. Keep markdown format.\n\nTitle: ${zhData.titleZh}\nExcerpt: ${zhData.excerptZh}\nContent:\n${zhData.contentZh}\n\nReturn JSON: {"titleEn": "...", "excerptEn": "...", "contentEn": "..."}` }],
      system: 'Professional translator. Return valid JSON only, no markdown code blocks.',
    }),
    anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: `Generate Chinese SEO metadata for a professor profile article.\nProfessor: ${profName} at ${university}\nResearch: ${researchAreas}\nTitle: ${zhData.titleZh}\n\nReturn JSON: {"seoTitleZh": "max 60 chars Chinese", "seoDescriptionZh": "max 160 chars Chinese", "seoKeywordsZh": "comma-separated Chinese keywords, include 澳洲PhD and professor name"}` }],
      system: 'Return valid JSON only, no markdown code blocks.',
    }),
  ]);

  function cleanJson(t: string) { return t.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim(); }

  if (enResult.status === 'fulfilled') {
    try {
      const enText = enResult.value.content[0].type === 'text' ? enResult.value.content[0].text : '{}';
      enData = JSON.parse(cleanJson(enText));
    } catch { /* defaults */ }
  }

  if (seoResult.status === 'fulfilled') {
    try {
      const seoText = seoResult.value.content[0].type === 'text' ? seoResult.value.content[0].text : '{}';
      seo = JSON.parse(cleanJson(seoText));
    } catch { /* defaults */ }
  }

  // Step 7: Reading time
  const charCount = (zhData.contentZh || '').length;
  const readingTimeZh = Math.max(3, Math.ceil(charCount / 400));

  // Step 8: Build tags
  const tags = [...(zhData.tags || [])];
  if (!tags.includes(profName)) tags.unshift(profName);
  if (university && !tags.includes(university)) tags.push(university);
  const topPaperJournals = papers.filter(p => isTopJournal(p.journal)).map(p => p.journal);
  topPaperJournals.slice(0, 2).forEach(j => { if (!tags.includes(j)) tags.push(j); });

  // Step 9: Insert to blog_posts
  const slug = zhData.titleZh
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100) + '-' + Date.now();

  const row = {
    slug,
    title_zh: zhData.titleZh,
    title_en: enData.titleEn || null,
    excerpt_zh: zhData.excerptZh,
    excerpt_en: enData.excerptEn || null,
    content_zh: zhData.contentZh,
    content_en: enData.contentEn || null,
    category: 'professor_spotlight',
    tags,
    status: 'draft',
    professor_id: professorId,
    seo_title_zh: seo.seoTitleZh || null,
    seo_description_zh: seo.seoDescriptionZh || null,
    seo_keywords_zh: seo.seoKeywordsZh || null,
    reading_time_zh: readingTimeZh,
    cover_image_url: null,
  };

  const { data: post, error } = await db.from('blog_posts').insert(row).select().single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (post?.id) {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    fetch(`${baseUrl}/api/blog/generate-cover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId: post.id }),
    }).catch(err => console.error('[generate-professor] Cover image trigger failed:', err));

    fetch(`${baseUrl}/api/blog/generate-images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId: post.id, imageCount: 1 }),
    }).catch(err => console.error('[generate-professor] Inline image trigger failed:', err));
  }

  return Response.json({ success: true, post, title: zhData.titleZh });
}
