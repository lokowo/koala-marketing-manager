import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function POST(req: NextRequest) {
  const { professorId } = await req.json().catch(() => ({ professorId: null }));

  if (!professorId) {
    return Response.json({ error: 'professorId required' }, { status: 400 });
  }

  // Step 1: Read professor from DB
  console.log('[generate-professor] Step 1: Reading professor from DB...');
  const { data: professor, error: profError } = await db
    .from('professors')
    .select('*')
    .eq('id', professorId)
    .single();

  if (profError || !professor) {
    console.error('[generate-professor] Step 1 failed:', profError);
    return Response.json({ error: 'Professor not found', details: profError?.message }, { status: 404 });
  }

  const profName = professor.name || professor.name_en || 'Unknown';
  const university = professor.university || professor.institution || '';
  const researchAreas = (professor.research_areas || professor.research_tags || []).join(', ');
  console.log(`[generate-professor] Step 1 done: ${profName} at ${university}`);

  // Step 2: Read papers
  console.log('[generate-professor] Step 2: Reading papers...');
  let papersContext = '';
  try {
    const { data: papers } = await db
      .from('papers')
      .select('title, year, journal, citation_count')
      .eq('professor_id', professorId)
      .order('citation_count', { ascending: false })
      .limit(5);

    papersContext = (papers || [])
      .map((p: { title: string; year: number; journal: string; citation_count: number }) =>
        `- ${p.title} (${p.year}, ${p.journal}, ${p.citation_count} citations)`)
      .join('\n');
    console.log(`[generate-professor] Step 2 done: ${(papers || []).length} papers found`);
  } catch (e) {
    console.log('[generate-professor] Step 2: No papers table or error, continuing...', (e as Error).message);
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  // Step 3: Web search for latest info
  console.log('[generate-professor] Step 3: Web searching professor...');
  let webContext = '';
  try {
    const searchResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }] as any[],
      messages: [{
        role: 'user',
        content: `Search for professor ${profName} at ${university}. Find their latest research achievements, awards, grants, projects, and any recent news. Summarize what you find in a concise paragraph.`,
      }],
    });

    const textBlocks = searchResponse.content.filter((b: any) => b.type === 'text');
    webContext = textBlocks.map((b: any) => b.text).join('\n').trim();
    console.log(`[generate-professor] Step 3 done: ${webContext.length} chars of web context`);
  } catch (e) {
    console.log('[generate-professor] Step 3: Web search failed, continuing without:', (e as Error).message);
  }

  // Step 4: Generate Chinese article
  console.log('[generate-professor] Step 4: Generating Chinese article...');
  let zhData: { titleZh: string; excerptZh: string; contentZh: string; tags: string[] };
  try {
    const zhResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      messages: [{ role: 'user', content: `请为以下教授撰写一篇800-1200字的中文人物介绍文章。

教授信息：
- 姓名：${profName}
- 机构：${university}
- 研究方向：${researchAreas}
- H-index: ${professor.h_index || 'N/A'}
- 职称：${professor.position_title || professor.title || 'N/A'}

代表论文：
${papersContext || '暂无论文数据'}

${webContext ? `最新动态（来自网络搜索）：\n${webContext}` : ''}

文章结构：
1. 开头亮点（1-2句话总结教授最突出的成就或特点）
2. 研究方向解读（用通俗语言解释研究领域的意义和前沿）
3. 代表成果（突出高引论文或重要项目）
4. 对PhD学生的价值（为什么跟这位教授读博有优势）
5. 申请建议（如何准备、注意事项）

要求：
- 语气：考拉学长风格，温暖专业
- 不要编造数据，如果信息不确定就用模糊表达
- Koala PhD 提及最多1句放文末
- Markdown 格式

返回JSON：{"titleZh": "中文标题", "excerptZh": "100字摘要", "contentZh": "正文markdown", "tags": ["标签1","标签2",...]}` }],
      system: 'You are 考拉学长, content writer for Koala PhD (koalaphd.com). Return valid JSON only, no markdown code blocks.',
    });

    let zhText = '';
    for (const block of zhResponse.content) {
      if (block.type === 'text') { zhText = block.text; break; }
    }

    const cleaned = zhText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    zhData = JSON.parse(cleaned);
    console.log(`[generate-professor] Step 4 done: "${zhData.titleZh}"`);
  } catch (e) {
    console.error('[generate-professor] Step 4 failed:', e);
    return Response.json({ error: 'Chinese article generation failed', details: (e as Error).message }, { status: 500 });
  }

  // Step 5 + 6 (parallel): Translate to English + Generate SEO metadata
  console.log('[generate-professor] Step 5+6: Translating + SEO (parallel, Haiku)...');
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
      messages: [{ role: 'user', content: `Generate Chinese SEO metadata for a professor profile article.\nProfessor: ${profName} at ${university}\nResearch: ${researchAreas}\nTitle: ${zhData.titleZh}\n\nReturn JSON: {"seoTitleZh": "max 60 chars Chinese", "seoDescriptionZh": "max 160 chars Chinese", "seoKeywordsZh": "comma-separated Chinese keywords"}` }],
      system: 'Return valid JSON only, no markdown code blocks.',
    }),
  ]);

  function cleanJson(t: string) { return t.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim(); }

  if (enResult.status === 'fulfilled') {
    try {
      const enText = enResult.value.content[0].type === 'text' ? enResult.value.content[0].text : '{}';
      enData = JSON.parse(cleanJson(enText));
      console.log('[generate-professor] Step 5 done');
    } catch (e) { console.log('[generate-professor] Step 5: parse failed:', (e as Error).message); }
  } else {
    console.log('[generate-professor] Step 5: Translation failed:', enResult.reason);
  }

  if (seoResult.status === 'fulfilled') {
    try {
      const seoText = seoResult.value.content[0].type === 'text' ? seoResult.value.content[0].text : '{}';
      seo = JSON.parse(cleanJson(seoText));
      console.log('[generate-professor] Step 6 done');
    } catch (e) { console.log('[generate-professor] Step 6: parse failed:', (e as Error).message); }
  } else {
    console.log('[generate-professor] Step 6: SEO failed:', seoResult.reason);
  }

  // Step 7: Calculate reading time
  const charCount = (zhData.contentZh || '').length;
  const readingTimeZh = Math.max(3, Math.ceil(charCount / 400));
  console.log(`[generate-professor] Step 7: reading_time_zh = ${readingTimeZh} min (${charCount} chars)`);

  // Step 8: Insert to blog_posts
  console.log('[generate-professor] Step 8: Inserting to blog_posts...');
  const tags = [...(zhData.tags || [])];
  if (!tags.includes(profName)) tags.unshift(profName);
  if (university && !tags.includes(university)) tags.push(university);

  const row = {
    title_zh: zhData.titleZh,
    title_en: enData.titleEn || null,
    excerpt_zh: zhData.excerptZh,
    excerpt_en: enData.excerptEn || null,
    content_zh: zhData.contentZh,
    content_en: enData.contentEn || null,
    category: 'professor_spotlight',
    tags,
    status: 'draft',
    reading_time_zh: readingTimeZh,
    seo_title_zh: seo.seoTitleZh || null,
    seo_description_zh: seo.seoDescriptionZh || null,
    seo_keywords_zh: seo.seoKeywordsZh || null,
  };

  const { data: post, error: insertError } = await db.from('blog_posts').insert(row).select().single();

  if (insertError) {
    console.error('[generate-professor] Step 8 failed:', insertError);
    return Response.json({ error: 'Failed to save article', details: insertError.message }, { status: 500 });
  }

  console.log(`[generate-professor] Step 8 done: post id = ${post.id}`);
  return Response.json({ success: true, title: zhData.titleZh, post });
}
