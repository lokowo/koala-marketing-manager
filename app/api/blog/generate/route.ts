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
  news: { zh: '行业新闻', en: 'Education News' },
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
};

const STYLE_PROMPTS: Record<string, string> = {
  professional: '写作风格：专业权威 — 像学术顾问的分析报告，用数据和事实说话，语气严谨。',
  casual: '写作风格：学长分享 — 像学长学姐的经验分享，亲切真实，可以用口语化表达。',
  news: '写作风格：新闻报道 — 事实为主，配专家解读，客观中立。',
};

export async function POST(req: NextRequest) {
  try {
    const { topic, category, style, publishMode, imageCount } = await req.json();

    if (!topic) {
      return Response.json({ error: 'topic required' }, { status: 400 });
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const catLabel = CATEGORIES[category]?.zh || 'PhD指南';
    const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.casual;

    // Step 1: Generate Chinese article
    const zhResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{ role: 'user', content: `请根据以下主题写一篇博客文章。\n\n主题：${topic}\n分类：${catLabel}\n${stylePrompt}\n\n要求：\n- Markdown格式，1200-2000字\n- 80%是主题本身的分析，20%自然关联到澳洲PhD申请\n- 包含真实数据和统计（如有）\n- 自然融入SEO关键词：澳洲、PhD、博士、留学、scholarship\n- Koala PhD提及最多1-2句放在末尾\n\n请返回JSON格式：\n{"titleZh": "中文标题", "excerptZh": "100字摘要", "contentZh": "正文markdown", "tags": ["标签1","标签2",...], "imageKeywords": ["封面图关键词"]}` }],
      system: 'You are a senior education content writer for Koala PhD (koalaphd.com). Always return valid JSON only, no markdown code blocks.',
    });

    const zhText = zhResponse.content[0].type === 'text' ? zhResponse.content[0].text : '';
    let zhData: { titleZh: string; excerptZh: string; contentZh: string; tags: string[]; imageKeywords?: string[] };
    try {
      const cleaned = zhText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      zhData = JSON.parse(cleaned);
    } catch {
      return Response.json({ error: 'AI generation failed - invalid JSON response', raw: zhText.slice(0, 200) }, { status: 500 });
    }

    // Step 2 & 3: Translate to English + Generate SEO (parallel)
    const [enResponse, seoZhResponse, seoEnResponse] = await Promise.all([
      anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        messages: [{ role: 'user', content: `Translate the following Chinese blog article to English. Keep the same structure and markdown format.\n\nTitle: ${zhData.titleZh}\nExcerpt: ${zhData.excerptZh}\nContent:\n${zhData.contentZh}\n\nReturn JSON: {"titleEn": "...", "excerptEn": "...", "contentEn": "..."}` }],
        system: 'You are a professional translator. Return valid JSON only.',
      }),
      anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{ role: 'user', content: `Generate SEO metadata in Chinese for this blog article about Australian PhD study.\nTitle: ${zhData.titleZh}\nExcerpt: ${zhData.excerptZh}\n\nReturn JSON: {"seoTitle": "max 60 chars", "seoDescription": "max 160 chars", "seoKeywords": "comma-separated, max 10"}` }],
        system: 'Return valid JSON only.',
      }),
      anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{ role: 'user', content: `Generate SEO metadata in English for this blog article about Australian PhD study.\nTitle: ${zhData.titleZh}\nExcerpt: ${zhData.excerptZh}\n\nReturn JSON: {"seoTitle": "max 60 chars", "seoDescription": "max 160 chars", "seoKeywords": "comma-separated, max 10"}` }],
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

    // Step 4: Calculate reading time
    const charCount = (zhData.contentZh || '').length;
    const readingTime = Math.max(3, Math.ceil(charCount / 400));

    // Step 5: Save to database
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
      author: 'AI Generated',
      status,
      published_at: status === 'published' ? new Date().toISOString() : null,
      seo_title_zh: seoZh.seoTitle,
      seo_title_en: seoEn.seoTitle,
      seo_description_zh: seoZh.seoDescription,
      seo_description_en: seoEn.seoDescription,
      seo_keywords: [seoZh.seoKeywords, seoEn.seoKeywords].filter(Boolean).join(', '),
      reading_time: readingTime,
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
