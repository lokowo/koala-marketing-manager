import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const CATEGORIES: Record<string, { zh: string; en: string }> = {
  phd_guide: { zh: 'PhD指南', en: 'PhD Guide' },
  application: { zh: '申请攻略', en: 'Application Tips' },
  scholarship: { zh: '奖学金', en: 'Scholarship' },
  visa: { zh: '签证攻略', en: 'Visa Guide' },
  supervisor: { zh: '导师关系', en: 'Supervisor Relations' },
  research: { zh: '科研方法', en: 'Research Methods' },
  student_life: { zh: '留学生活', en: 'Student Life' },
  news: { zh: '行业新闻', en: 'Industry News' },
  professor_spotlight: { zh: '教授推荐', en: 'Professor Spotlight' },
};

const COVER_IMAGE_PROMPTS: Record<string, string> = {
  phd_guide: 'professional photo of international students studying at Australian university library',
  application: 'document preparation for PhD application, laptop with research papers',
  scholarship: 'graduation cap on Australian dollar bills, scholarship concept',
  visa: 'Australian passport and student visa documents',
  supervisor: 'professor and student discussing research in modern university office',
  research: 'scientific research laboratory with modern equipment',
  student_life: 'international students enjoying campus life at Australian university',
  news: 'Australian university campus aerial view',
  professor_spotlight: 'distinguished professor in modern university research lab',
};

const STYLE_PROMPTS: Record<string, string> = {
  professional: '写作风格：专业权威 — 像学术顾问的分析报告，用数据和事实说话，语气严谨。',
  casual: '写作风格：学长分享 — 像考拉学长的经验分享，温暖专业，亲切真实，可以用口语化表达。',
  news: '写作风格：新闻报道 — 事实为主，配专家解读，客观中立。',
};

const SYSTEM_PROMPT = `You are 考拉学长 (Koala Senior), the content voice of Koala PhD (koalaphd.com) — an academic matching platform connecting Chinese students with Australian PhD supervisors.

PERSONALITY: Warm, professional, like a senior PhD student sharing real experience. Supportive but data-driven.

CONTENT RATIO: 80% deep analysis of the topic itself, 20% natural connection to PhD application.

BRAND RULES:
- Mention Koala PhD at most 1-2 sentences, placed at the end of the article
- Never hard-sell or sound like an ad
- Use CONNECTION FRAMEWORK to link topics naturally:
  * Geopolitics → research funding → scholarship opportunities
  * Immigration policy → visa → application timeline
  * AI/tech → research trends → hot research directions
  * Economy → cost of living → scholarship importance

SEO KEYWORDS to weave in naturally: 澳洲, PhD, 博士, 留学, scholarship, 申请, supervisor

CRITICAL: Return ONLY valid JSON. Use proper JSON escaping: \\n for newlines, \\" for quotes inside strings. No markdown code fences. No text before or after the JSON object.`;

export async function POST(req: NextRequest) {
  try {
    const { topic, category, style, publishMode, imageCount } = await req.json();

    if (!topic) {
      return Response.json({ error: 'topic required' }, { status: 400 });
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const catLabel = CATEGORIES[category]?.zh || 'PhD指南';
    const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.casual;

    const zhResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      messages: [{ role: 'user', content: `请根据以下主题写一篇博客文章。\n\n主题：${topic}\n分类：${catLabel}\n${stylePrompt}\n\n要求：\n- Markdown格式，1200-2000字\n- 80%是主题本身的深度分析，20%自然关联到澳洲PhD申请\n- 包含真实数据和统计（如有）\n- 自然融入SEO关键词：澳洲、PhD、博士、留学、scholarship、申请、supervisor\n- Koala PhD提及最多1-2句放在文章末尾\n- 语气像考拉学长：温暖专业的学长分享\n\n请返回JSON格式：\n{"titleZh": "中文标题", "excerptZh": "100字摘要", "contentZh": "正文markdown", "tags": ["标签1","标签2",...], "imageKeywords": ["封面图关键词"]}` }],
      system: SYSTEM_PROMPT,
    });

    const zhText = zhResponse.content[0].type === 'text' ? zhResponse.content[0].text : '';
    let zhData: { titleZh: string; excerptZh: string; contentZh: string; tags: string[]; imageKeywords?: string[] };

    const stripped = zhText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    const candidate = jsonMatch ? jsonMatch[0] : stripped;

    try {
      zhData = JSON.parse(candidate);
    } catch {
      try {
        const fixResponse = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: `The following text is malformed JSON. Fix it and return ONLY valid JSON with fields: titleZh (string), excerptZh (string), contentZh (string), tags (array of strings), imageKeywords (array of strings, optional). Ensure all string values properly escape quotes and newlines.\n\n${candidate.slice(0, 6000)}`,
          }],
          system: 'Return ONLY valid JSON. No markdown, no explanation, no code fences.',
        });
        const fixText = fixResponse.content[0].type === 'text' ? fixResponse.content[0].text : '';
        const fixCleaned = fixText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const fixMatch = fixCleaned.match(/\{[\s\S]*\}/);
        zhData = JSON.parse(fixMatch ? fixMatch[0] : fixCleaned);
      } catch {
        return Response.json({ error: 'AI generation failed - invalid JSON response', raw: zhText.slice(0, 200) }, { status: 500 });
      }
    }

    const [enResponse, seoZhResponse, seoEnResponse] = await Promise.all([
      anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 3000,
        messages: [{ role: 'user', content: `Translate the following Chinese blog article to English. Keep the same structure and markdown format.\n\nTitle: ${zhData.titleZh}\nExcerpt: ${zhData.excerptZh}\nContent:\n${zhData.contentZh}\n\nReturn JSON: {"titleEn": "...", "excerptEn": "...", "contentEn": "..."}` }],
        system: 'You are a professional translator. Return valid JSON only.',
      }),
      anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{ role: 'user', content: `Generate SEO metadata in Chinese for this blog article about Australian PhD study.\nTitle: ${zhData.titleZh}\nExcerpt: ${zhData.excerptZh}\n\nReturn JSON: {"seoTitle": "max 60 chars", "seoDescription": "max 160 chars", "seoKeywords": "comma-separated, include: 澳洲PhD, 博士留学, scholarship"}` }],
        system: 'Return valid JSON only.',
      }),
      anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{ role: 'user', content: `Generate SEO metadata in English for this blog article about Australian PhD study.\nTitle: ${zhData.titleZh}\nExcerpt: ${zhData.excerptZh}\n\nReturn JSON: {"seoTitle": "max 60 chars", "seoDescription": "max 160 chars", "seoKeywords": "comma-separated, include: Australia PhD, scholarship, supervisor"}` }],
        system: 'Return valid JSON only.',
      }),
    ]);

    const enText = enResponse.content[0].type === 'text' ? enResponse.content[0].text : '{}';
    const seoZhText = seoZhResponse.content[0].type === 'text' ? seoZhResponse.content[0].text : '{}';
    const seoEnText = seoEnResponse.content[0].type === 'text' ? seoEnResponse.content[0].text : '{}';

    let enData = { titleEn: '', excerptEn: '', contentEn: '' };
    let seoZh = { seoTitle: '', seoDescription: '', seoKeywords: '' };
    let seoEn = { seoTitle: '', seoDescription: '', seoKeywords: '' };

    function cleanJson(t: string) { return t.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim(); }
    try { enData = JSON.parse(cleanJson(enText)); } catch { /* use defaults */ }
    try { seoZh = JSON.parse(cleanJson(seoZhText)); } catch { /* use defaults */ }
    try { seoEn = JSON.parse(cleanJson(seoEnText)); } catch { /* use defaults */ }

    const charCount = (zhData.contentZh || '').length;
    const readingTimeZh = Math.max(3, Math.ceil(charCount / 400));
    const wordCount = (enData.contentEn || '').split(/\s+/).length;
    const readingTimeEn = Math.max(2, Math.ceil(wordCount / 200));

    const status = publishMode === 'publish' ? 'published' : 'draft';
    const row = {
      title_zh: zhData.titleZh,
      title_en: enData.titleEn,
      excerpt_zh: zhData.excerptZh,
      excerpt_en: enData.excerptEn,
      content_zh: zhData.contentZh,
      content_en: enData.contentEn,
      category: category || 'phd_guide',
      tags: zhData.tags || [],
      status,
      published_at: status === 'published' ? new Date().toISOString() : null,
      seo_title_zh: seoZh.seoTitle,
      seo_title_en: seoEn.seoTitle,
      seo_description_zh: seoZh.seoDescription,
      seo_description_en: seoEn.seoDescription,
      seo_keywords_zh: seoZh.seoKeywords,
      seo_keywords_en: seoEn.seoKeywords,
      reading_time_zh: readingTimeZh,
      reading_time_en: readingTimeEn,
      cover_image_url: null,
    };

    const { data: post, error } = await db.from('blog_posts').insert(row).select().single();

    if (error) {
      console.error('[blog/generate]', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({
      success: true,
      post,
      meta: {
        imageCount: imageCount || 0,
        imageKeywords: zhData.imageKeywords,
        coverPrompt: COVER_IMAGE_PROMPTS[category] || COVER_IMAGE_PROMPTS.phd_guide,
      },
    });
  } catch (error) {
    console.error('[blog/generate]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
