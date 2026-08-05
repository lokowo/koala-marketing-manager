import { randomUUID } from 'crypto';
import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '../../../lib/supabase/server';
import { getServerUser } from '../../../lib/auth';
import { logAdminAction } from '../../../lib/worklog';
import { aiLimiter, safeLimit } from '../../../lib/ratelimit';
import { createEmbedding } from '../../../lib/server/embedding';
import { BODY_SIM_THRESHOLD, cosine, parseVector } from '../../../lib/server/dedup';

export const maxDuration = 300;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

function safeParseJSON(text: string): Record<string, unknown> {
  let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) cleaned = jsonMatch[0];
  try {
    return JSON.parse(cleaned);
  } catch {
    try {
      cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
      return JSON.parse(cleaned);
    } catch {
      throw new Error(`JSON 解析失败: ${cleaned.substring(0, 200)}`);
    }
  }
}

function parseArticleResponse(text: string): { titleZh: string; excerptZh: string; contentZh: string; tags: string[]; imageKeywords?: string[] } {
  const SEP = '---CONTENT---';
  const idx = text.indexOf(SEP);
  if (idx === -1) {
    // 兼容旧格式：整体还是一个 JSON（含 contentZh）
    const obj = safeParseJSON(text) as Record<string, unknown>;
    return {
      titleZh: String(obj.titleZh || ''),
      excerptZh: String(obj.excerptZh || ''),
      contentZh: String(obj.contentZh || ''),
      tags: Array.isArray(obj.tags) ? (obj.tags as string[]) : [],
      imageKeywords: Array.isArray(obj.imageKeywords) ? (obj.imageKeywords as string[]) : undefined,
    };
  }
  const metaPart = text.slice(0, idx);
  const contentPart = text.slice(idx + SEP.length).trim();
  const meta = safeParseJSON(metaPart) as Record<string, unknown>;
  return {
    titleZh: String(meta.titleZh || ''),
    excerptZh: String(meta.excerptZh || ''),
    contentZh: contentPart,
    tags: Array.isArray(meta.tags) ? (meta.tags as string[]) : [],
    imageKeywords: Array.isArray(meta.imageKeywords) ? (meta.imageKeywords as string[]) : undefined,
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label}超时（${Math.round(ms / 1000)}秒）`)), ms)
    ),
  ]);
}

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

// ── 结尾 CTA 收敛（第 3 步之二）──
// 审计发现约 40/65 篇结尾共用同一句 Koala CTA 模板，严重污染段落级相似度。
// 改为：LLM 不再自写结尾 CTA（见 SYSTEM_PROMPT / 用户 prompt），由系统追加下列 4 个受控变体之一，
// 按文章 id 哈希轮换，避免全站结尾雷同。content_embedding 只对正文核心（不含 CTA）做，避免 CTA 噪声。
const CTA_VARIANTS: { zh: string; en: string }[] = [
  {
    zh: '> 如果你正在规划澳洲 PhD 申请，想找到真正 match 你研究方向的 supervisor，欢迎来 Koala PhD（koalaphd.com）——我们收录了全澳高校在研项目与导师资源，帮你把研究方向精准对上现有课题。',
    en: '> Planning a PhD in Australia and looking for a supervisor who genuinely matches your research direction? Koala PhD (koalaphd.com) maps active projects and supervisors across Australian universities to help you align your interests with real, funded research.',
  },
  {
    zh: '> 想更精准地把自己的研究方向与澳洲现有课题资助对上号？Koala PhD（koalaphd.com）整理了各高校在研项目与导师数据库，可以帮你快速定位合适的 supervisor。',
    en: '> Want to align your research direction with Australia\'s active funded projects more precisely? Koala PhD (koalaphd.com) maintains a database of ongoing projects and supervisors to help you quickly find the right fit.',
  },
  {
    zh: '> 澳洲 PhD 的第一步，往往是找到对的导师。Koala PhD（koalaphd.com）用 AI 帮你从全澳高校的在研项目里匹配研究方向契合的 supervisor，让套磁更有的放矢。',
    en: '> The first step of an Australian PhD is often finding the right supervisor. Koala PhD (koalaphd.com) uses AI to match your research direction with active projects across Australian universities, so your outreach lands where it counts.',
  },
  {
    zh: '> 从选方向到联系导师，如果你需要一点澳洲本地的学术内线，Koala PhD（koalaphd.com）汇集了各校在研课题与导师资源，帮你把 PhD 申请规划得更清楚。',
    en: '> From choosing a direction to reaching out to supervisors, if you could use a local academic insider in Australia, Koala PhD (koalaphd.com) brings together active projects and supervisor resources to help you plan your PhD application.',
  },
];

// 按文章 id（uuid）稳定哈希轮换 CTA 变体
function ctaIndexFromId(id: string, n: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % n;
}

const SYSTEM_PROMPT = `You are 考拉学长 (Koala Senior), the content voice of Koala PhD (koalaphd.com) — an academic matching platform connecting Chinese students with Australian PhD supervisors.

PERSONALITY: Warm, professional, like a senior PhD student sharing real experience. Supportive but data-driven.

CONTENT RATIO: 80% deep analysis of the topic itself, 20% natural connection to PhD application.
DATA FORMATTING: When presenting statistics, rankings, comparisons, or any numerical data, you MUST use markdown tables (| Header | ... | format). Never dump numbers in plain text paragraphs. Example: | 大学 | QS排名 | PhD名额 |\n|---|---|---|\n| Melbourne | 14 | 200+ |

BRAND RULES:
- Do NOT write any Koala PhD closing call-to-action. Do NOT mention koalaphd.com or invite readers to Koala PhD at the end — a standardized CTA paragraph is appended automatically after your article.
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
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const allowed = await safeLimit(aiLimiter, user.id);
    if (!allowed) return Response.json({ error: '操作太频繁，请稍后再试' }, { status: 429 });

    const { topic, category, style, publishMode, imageCount } = await req.json();

    if (!topic) {
      return Response.json({ error: 'topic required' }, { status: 400 });
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const catLabel = CATEGORIES[category]?.zh || 'PhD指南';
    const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.casual;

    const zhResponse = await withTimeout(
      anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 16000,
        messages: [{ role: 'user', content: `请根据以下主题写一篇博客文章。\n\n主题：${topic}\n分类：${catLabel}\n${stylePrompt}\n\n要求：\n- Markdown格式，1200-2000字\n- 80%是主题本身的深度分析，20%自然关联到澳洲PhD申请\n- 包含真实数据和统计（如有）\n- 自然融入SEO关键词：澳洲、PhD、博士、留学、scholarship、申请、supervisor\n- 不要在结尾添加任何 Koala PhD 推广/引导语或 koalaphd.com（系统会自动追加标准化 CTA）\n- 语气像考拉学长：温暖专业的学长分享\n\n请严格按以下格式返回，不要加任何代码围栏（不要 \`\`\`）：\n\n首先返回一行 JSON（只包含元数据，不含正文）：\n{"titleZh": "中文标题", "excerptZh": "100字摘要", "tags": ["标签1","标签2"], "imageKeywords": ["封面图关键词"]}\n\n然后另起一行，输出这一行分隔符：\n---CONTENT---\n\n然后输出正文 markdown 原文（不要转义、不要包在 JSON 里）。` }],
        system: SYSTEM_PROMPT,
      }),
      120000,
      '中文文章生成',
    );

    const zhText = zhResponse.content[0].type === 'text' ? zhResponse.content[0].text : '';
    let zhData: { titleZh: string; excerptZh: string; contentZh: string; tags: string[]; imageKeywords?: string[] };

    const stopReason = zhResponse.stop_reason;
    const outTokens = zhResponse.usage?.output_tokens;
    console.log('[blog/generate] zh stop_reason:', stopReason, 'output_tokens:', outTokens, 'text_len:', zhText.length);

    if (stopReason === 'max_tokens') {
      console.error('[blog/generate] TRUNCATED by max_tokens — output_tokens:', outTokens);
      return Response.json(
        { error: '文章内容过长被截断，请缩短主题或重试', stop_reason: stopReason, output_tokens: outTokens },
        { status: 500 },
      );
    }

    try {
      zhData = parseArticleResponse(zhText);
    } catch {
      try {
        const fixResponse = await withTimeout(
          anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 6000,
            messages: [{
              role: 'user',
              content: `The following text is malformed JSON metadata for a blog article. Fix it and return ONLY valid JSON with fields: titleZh (string), excerptZh (string), tags (array of strings), imageKeywords (array of strings, optional). Do NOT include the article body — only the metadata fields. Ensure all string values properly escape quotes.\n\n${zhText.slice(0, 8000)}`,
            }],
            system: 'Return ONLY valid JSON. No markdown, no explanation, no code fences.',
          }),
          30000,
          'JSON修复',
        );
        const fixText = fixResponse.content[0].type === 'text' ? fixResponse.content[0].text : '';
        zhData = parseArticleResponse(fixText);
      } catch {
        console.error('[blog/generate] JSON fix failed — zhText length:', zhText.length, 'stop_reason:', stopReason, 'output_tokens:', outTokens, 'preview:', zhText.slice(0, 100));
        return Response.json({ error: 'AI 返回格式异常，请重试', raw: zhText.slice(0, 200) }, { status: 500 });
      }
    }

    // ── 正文闸门（第 3 步之二）：正文生成完毕后、写库之前，与库内 content_embedding 比对 ──
    // 与选题闸门保持一致：embedding / 读库不可用 → fail-closed（拒绝入库，不静默放行）。
    let bodyEmbedding: number[];
    try {
      bodyEmbedding = await createEmbedding(zhData.contentZh || '');
    } catch (e) {
      console.error('[blog/generate] body embedding failed — fail closed:', (e as Error).message);
      return Response.json(
        { rejected: true, reason: `正文查重 embedding 不可用，已拒绝入库（fail-closed）：${(e as Error).message}` },
        { status: 503 },
      );
    }

    let existingBodies: { id: string; content_embedding: unknown }[] = [];
    try {
      const { data, error: exErr } = await db
        .from('blog_posts')
        .select('id, content_embedding')
        .neq('category', 'professor_spotlight')
        .not('content_embedding', 'is', null)
        .limit(1000);
      if (exErr) throw exErr;
      existingBodies = data || [];
    } catch (e) {
      console.error('[blog/generate] load content_embedding failed — fail closed:', (e as Error).message);
      return Response.json(
        { rejected: true, reason: `正文查重读库失败，已拒绝入库（fail-closed）：${(e as Error).message}` },
        { status: 503 },
      );
    }

    let maxSim = -1;
    let matchedId = '';
    for (const ex of existingBodies) {
      const vec = parseVector(ex.content_embedding);
      if (!vec || vec.length === 0) continue;
      const sim = cosine(bodyEmbedding, vec);
      if (sim > maxSim) { maxSim = sim; matchedId = ex.id; }
    }
    if (existingBodies.length === 0) {
      console.warn('[blog/generate] body gate: 库内暂无 content_embedding 可比对（需先跑 backfill 脚本），本次放行。');
    }
    if (maxSim > BODY_SIM_THRESHOLD) {
      console.warn('[blog/generate] body gate REJECTED (dup):', { topic, matchedId, similarity: +maxSim.toFixed(4) });
      return Response.json({ rejected: true, matchedId, similarity: +maxSim.toFixed(4) }, { status: 409 });
    }
    console.log('[blog/generate] body gate PASSED:', { topic, maxSim: +maxSim.toFixed(4), matchedId });

    // 文章 id 预生成（供 CTA 哈希轮换 + 入库主键）。CTA 只追加到正文文本，不参与 content_embedding（避免 CTA 噪声）。
    const postId = randomUUID();
    const cta = CTA_VARIANTS[ctaIndexFromId(postId, CTA_VARIANTS.length)];
    const finalContentZh = `${(zhData.contentZh || '').trim()}\n\n${cta.zh}`;

    const [enResponse, seoZhResponse, seoEnResponse] = await withTimeout(
      Promise.all([
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
      ]),
      60000,
      '翻译与SEO生成',
    );

    const enText = enResponse.content[0].type === 'text' ? enResponse.content[0].text : '{}';
    const seoZhText = seoZhResponse.content[0].type === 'text' ? seoZhResponse.content[0].text : '{}';
    const seoEnText = seoEnResponse.content[0].type === 'text' ? seoEnResponse.content[0].text : '{}';

    let enData = { titleEn: '', excerptEn: '', contentEn: '' };
    let seoZh = { seoTitle: '', seoDescription: '', seoKeywords: '' };
    let seoEn = { seoTitle: '', seoDescription: '', seoKeywords: '' };

    try { enData = safeParseJSON(enText) as typeof enData; } catch { /* use defaults */ }
    try { seoZh = safeParseJSON(seoZhText) as typeof seoZh; } catch { /* use defaults */ }
    try { seoEn = safeParseJSON(seoEnText) as typeof seoEn; } catch { /* use defaults */ }

    // 英文正文追加对应 CTA 变体（与中文同一变体，保持双语一致）
    const finalContentEn = enData.contentEn ? `${enData.contentEn.trim()}\n\n${cta.en}` : '';

    // topic_embedding（title+excerpt）与 content_embedding 一并入库，避免新文章成为后续比对盲区
    const topicText = `${zhData.titleZh}${zhData.excerptZh ? '。' + zhData.excerptZh : ''}`;
    let topicEmbedding: number[] | null = null;
    try {
      topicEmbedding = await createEmbedding(topicText);
    } catch (e) {
      console.error('[blog/generate] topic embedding failed (插入时 topic_embedding 置空，可由 backfill 补齐):', (e as Error).message);
    }

    const charCount = finalContentZh.length;
    const readingTimeZh = Math.max(3, Math.ceil(charCount / 400));
    const wordCount = (finalContentEn || '').split(/\s+/).length;
    const readingTimeEn = Math.max(2, Math.ceil(wordCount / 200));

    const status = publishMode === 'publish' ? 'published' : 'draft';
    const slugSource = enData.titleEn || zhData.titleZh || 'post';
    let slugBase = slugSource
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 80)
      .replace(/^-|-$/g, '');
    if (!slugBase) slugBase = (category || 'post');
    const slug = slugBase + '-' + Date.now();

    const row = {
      id: postId,
      slug,
      title_zh: zhData.titleZh,
      title_en: enData.titleEn,
      excerpt_zh: zhData.excerptZh,
      excerpt_en: enData.excerptEn,
      content_zh: finalContentZh,
      content_en: finalContentEn,
      content_embedding: JSON.stringify(bodyEmbedding),
      topic_embedding: topicEmbedding ? JSON.stringify(topicEmbedding) : null,
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
      cover_image_status: !!process.env.OPENAI_API_KEY ? 'generating' : 'none',
    };

    const { data: post, error } = await db.from('blog_posts').insert(row).select().single();

    if (error) {
      console.error('[blog/generate]', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    const imageAvailable = !!process.env.OPENAI_API_KEY;
    if (post?.id && imageAvailable) {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
      const cookieHeader = req.headers.get('cookie') || '';

      fetch(`${baseUrl}/api/blog/generate-cover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
        body: JSON.stringify({ postId: post.id }),
      }).catch(err => console.error('[generate] Auto cover failed:', err));

      const imgCount = imageCount && imageCount > 0 ? imageCount : 2;
      fetch(`${baseUrl}/api/blog/auto-illustrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
        body: JSON.stringify({ postId: post.id, imageCount: imgCount }),
      }).catch(err => console.error('[generate] Auto illustrate failed:', err));
    }

    await logAdminAction(user.id, 'blog_generate', 'blog_post', post?.id, { topic, category, style });

    return Response.json({
      success: true,
      post,
      message: imageAvailable
        ? '文章已生成，封面图正在后台生成中...'
        : '文章已生成（封面图生成暂不可用，请检查 OpenAI API key）',
      imageAvailable,
      meta: {
        imageCount: imageCount || 0,
        imageKeywords: zhData.imageKeywords,
        coverPrompt: COVER_IMAGE_PROMPTS[category] || COVER_IMAGE_PROMPTS.phd_guide,
      },
    });
  } catch (error) {
    console.error('[blog/generate]', error);
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('超时')) {
      return Response.json({ error: `文章生成超时：${msg}，请重试` }, { status: 504 });
    }
    return Response.json({ error: '文章生成失败，请稍后重试' }, { status: 500 });
  }
}
