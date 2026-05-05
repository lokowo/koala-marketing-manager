import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function POST(req: NextRequest) {
  try {
    const { professorId } = await req.json();

    if (!professorId) {
      return Response.json({ error: 'professorId required' }, { status: 400 });
    }

    const { data: professor, error: profError } = await db
      .from('professors')
      .select('*')
      .eq('id', professorId)
      .single();

    if (profError || !professor) {
      return Response.json({ error: 'Professor not found' }, { status: 404 });
    }

    const { data: papers } = await db
      .from('papers')
      .select('title, year, journal, citation_count')
      .eq('professor_id', professorId)
      .order('citation_count', { ascending: false })
      .limit(5);

    const papersContext = (papers || [])
      .map((p: { title: string; year: number; journal: string; citation_count: number }) =>
        `- ${p.title} (${p.year}, ${p.journal}, ${p.citation_count} citations)`)
      .join('\n');

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

    const profName = professor.name || professor.name_en || 'Unknown';
    const institution = professor.institution || professor.university || '';
    const researchAreas = (professor.research_tags || professor.research_areas || []).join(', ');

    const zhResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      tools: [{ type: 'web_search_20260209', name: 'web_search' }],
      messages: [{ role: 'user', content: `请为以下教授撰写一篇800-1200字的中文人物介绍文章。

教授信息：
- 姓名：${profName}
- 机构：${institution}
- 研究方向：${researchAreas}
- H-index: ${professor.h_index || 'N/A'}
- 职称：${professor.title || professor.position || 'N/A'}

代表论文：
${papersContext || '暂无论文数据'}

请先用 web_search 搜索该教授的最新动态、获奖、项目等信息。

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
      system: 'You are 考拉学长, content writer for Koala PhD (koalaphd.com). Return valid JSON only after using web_search.',
    });

    let zhText = '';
    for (const block of zhResponse.content) {
      if (block.type === 'text') {
        zhText = block.text;
        break;
      }
    }

    let zhData: { titleZh: string; excerptZh: string; contentZh: string; tags: string[] };
    try {
      const cleaned = zhText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      zhData = JSON.parse(cleaned);
    } catch {
      return Response.json({ error: 'AI generation failed - invalid JSON', raw: zhText.slice(0, 200) }, { status: 500 });
    }

    const [enResponse, seoResponse] = await Promise.all([
      anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        messages: [{ role: 'user', content: `Translate this Chinese professor profile article to English. Keep markdown format.\n\nTitle: ${zhData.titleZh}\nContent:\n${zhData.contentZh}\n\nReturn JSON: {"titleEn": "...", "excerptEn": "...", "contentEn": "..."}` }],
        system: 'Professional translator. Return valid JSON only.',
      }),
      anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{ role: 'user', content: `Generate bilingual SEO metadata for a professor profile article.\nProfessor: ${profName} at ${institution}\nResearch: ${researchAreas}\nTitle: ${zhData.titleZh}\n\nReturn JSON: {"seoTitleZh": "max 60 chars", "seoTitleEn": "max 60 chars", "seoDescriptionZh": "max 160 chars", "seoDescriptionEn": "max 160 chars", "seoKeywordsZh": "comma-separated", "seoKeywordsEn": "comma-separated"}` }],
        system: 'Return valid JSON only.',
      }),
    ]);

    const enText = enResponse.content[0].type === 'text' ? enResponse.content[0].text : '{}';
    const seoText = seoResponse.content[0].type === 'text' ? seoResponse.content[0].text : '{}';

    function cleanJson(t: string) { return t.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim(); }

    let enData = { titleEn: '', excerptEn: '', contentEn: '' };
    let seo = { seoTitleZh: '', seoTitleEn: '', seoDescriptionZh: '', seoDescriptionEn: '', seoKeywordsZh: '', seoKeywordsEn: '' };
    try { enData = JSON.parse(cleanJson(enText)); } catch { /* defaults */ }
    try { seo = JSON.parse(cleanJson(seoText)); } catch { /* defaults */ }

    const charCount = (zhData.contentZh || '').length;
    const readingTimeZh = Math.max(3, Math.ceil(charCount / 400));
    const wordCount = (enData.contentEn || '').split(/\s+/).length;
    const readingTimeEn = Math.max(2, Math.ceil(wordCount / 200));

    const tags = [...(zhData.tags || [])];
    if (!tags.includes(profName)) tags.unshift(profName);
    if (institution && !tags.includes(institution)) tags.push(institution);

    const row = {
      title_zh: zhData.titleZh,
      title_en: enData.titleEn,
      excerpt_zh: zhData.excerptZh,
      excerpt_en: enData.excerptEn,
      content_zh: zhData.contentZh,
      content_en: enData.contentEn,
      category: 'professor_spotlight',
      tags,
      status: 'draft',
      seo_title_zh: seo.seoTitleZh,
      seo_title_en: seo.seoTitleEn,
      seo_description_zh: seo.seoDescriptionZh,
      seo_description_en: seo.seoDescriptionEn,
      seo_keywords_zh: seo.seoKeywordsZh,
      seo_keywords_en: seo.seoKeywordsEn,
      reading_time_zh: readingTimeZh,
      reading_time_en: readingTimeEn,
      cover_image_url: null,
    };

    const { data: post, error } = await db.from('blog_posts').insert(row).select().single();

    if (error) {
      console.error('[blog/generate-professor]', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true, post });
  } catch (error) {
    console.error('[blog/generate-professor]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
