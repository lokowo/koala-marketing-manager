import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '../../../lib/supabase/server';
import { createEmbedding, createEmbeddingsBatch } from '../../../lib/server/embedding';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

// 候选选题与已有文章的余弦相似度超过此阈值 → 判为重复，丢弃
const SIM_THRESHOLD = 0.88;
// 排除清单标题数超过此值 → 只取最近 6 个月，控制 prompt 预算
const MAX_EXCLUSION_TITLES = 100;

function getNewsQueries(todayStr: string) {
  return [
    `Australia PhD funding news ${todayStr}`,
    `Australian university policy news today`,
    `international student Australia ${todayStr}`,
    `OpenAI DeepMind AI research news today`,
    `Australia cost of living students news today`,
    `tech industry hiring PhD Australia news today`,
  ];
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

interface Candidate {
  title: string;
  category?: string;
  style?: string;
  source?: string;
  sourceDate?: string;
  reason?: string;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const count = Math.min(10, parseInt(url.searchParams.get('count') || '8'));

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const cutoffDate = new Date(today.getTime() - 48 * 60 * 60 * 1000);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];
    const dateRange = `${cutoffStr} to ${todayStr}`;
    const emptyFiltered = { count: 0, reasons: {} as Record<string, number>, details: [] as unknown[] };

    const selectedQueries = getNewsQueries(todayStr)
      .sort(() => Math.random() - 0.5)
      .slice(0, 4);

    let newsData = '';
    let newsCount = 0;

    try {
      const searchResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tools: [{ type: 'web_search_20250305', name: 'web_search' }] as any[],
        messages: [{
          role: 'user',
          content: `Today's date is ${todayStr}.

CRITICAL CONSTRAINTS:
- ONLY return news published between ${cutoffStr} and ${todayStr}
- DO NOT include any article older than 48 hours
- If a search returns old results, skip them and only keep recent ones
- If no recent news found for a topic, skip that topic entirely

Search for the LATEST news (past 48 hours only) about: ${selectedQueries.join(', ')}.

For each recent news item return:
- Title
- Source name
- Publication date (MUST be ${cutoffStr} or later)
- One-sentence summary

Return as a numbered list. Reject anything older than ${cutoffStr}.`,
        }],
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const textBlocks = searchResponse.content.filter((b: any) => b.type === 'text');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      newsData = textBlocks.map((b: any) => b.text).join('\n').trim();

      if (newsData) {
        const lines = newsData.split('\n').filter(l => l.trim().length > 0);
        const numberedLines = lines.filter(l => /^\d+[\.\)]/.test(l.trim()));
        const newsLines = numberedLines.length > 0 ? numberedLines : lines;

        const datedLines: string[] = [];
        const undatedLines: string[] = [];
        for (const line of newsLines) {
          const dateMatch = line.match(/(\d{4}-\d{2}-\d{2})/);
          if (dateMatch) {
            if (dateMatch[1] >= cutoffStr) datedLines.push(line);
          } else {
            undatedLines.push(line);
          }
        }

        const filteredLines = datedLines.length >= 3
          ? datedLines
          : [...datedLines, ...undatedLines.slice(0, 4)];

        newsCount = filteredLines.length;
        newsData = filteredLines.join('\n');
      }
    } catch (error) {
      console.error('[blog/topics] web_search failed:', error);
    }

    // ── 步骤 1：无近况新闻则直接返回空数组，不再用模型凭记忆兜底生成选题 ──
    if (!newsData || newsData.length === 0) {
      const reason = 'web_search 未返回近 48 小时内可用的新闻，本次不生成选题（已移除 LLM 凭记忆兜底路径，避免重复母题）。';
      console.log('[blog/topics] no fresh news — skip (fallback removed).');
      return Response.json({ topics: [], newsCount: 0, dateRange, reason, filtered: emptyFiltered });
    }

    // ── 步骤 2：读取已有非教授类文章标题，作为明确排除清单注入 prompt ──
    let existing: { id: string; title_zh: string | null; excerpt_zh: string | null; published_at: string | null }[] = [];
    try {
      const { data } = await db
        .from('blog_posts')
        .select('id, title_zh, excerpt_zh, published_at')
        .neq('category', 'professor_spotlight')
        .order('published_at', { ascending: false })
        .limit(500);
      existing = (data || []).filter((r: { title_zh: string | null }) => !!r.title_zh);
    } catch (e) {
      console.error('[blog/topics] load existing titles failed:', (e as Error).message);
    }

    // 标题过多 → 只取最近 6 个月，控制 prompt 预算
    let exclusionRows = existing;
    if (existing.length > MAX_EXCLUSION_TITLES) {
      const sixMonthsAgo = new Date(today.getTime() - 182 * 24 * 60 * 60 * 1000).toISOString();
      exclusionRows = existing.filter(r => (r.published_at || '') >= sixMonthsAgo);
    }
    const exclusionList = exclusionRows.map(r => `- ${r.title_zh}`).join('\n');

    const prompt = `Based on the following real-time news gathered via web search, suggest ${count} blog article topics for Koala PhD (koalaphd.com), an academic matching platform connecting Chinese students with Australian PhD supervisors.

NEWS (all from the past 48 hours):
${newsData}

Consider these 6 news source categories when selecting angles:
1. 澳洲教育政策 2. 学术圈动态 3. 国际时事与留学 4. 科技公司与AI 5. 留学生活 6. 职业与产业

Return a JSON array of objects: [{"title": "中文标题", "category": "category_key", "style": "professional|casual|news", "source": "news source name", "sourceDate": "date string", "reason": "为什么这个主题好"}].

Categories: phd_guide, application, scholarship, visa, supervisor, research, student_life, news, professor_spotlight.

DIVERSITY RULES:
- At most 2/${count} can directly mention PhD申请/申请信/导师选择
- At least 3 should be broader: education policy, visa, scholarship news, tech/AI trends
- All topics must connect naturally to PhD preparation

EXCLUSION LIST — 以下是站内已发布的文章标题。你提出的选题必须与它们在主题和角度上都明显不同，禁止换个说法重复同一母题（如"科研经费/预算""AI工具重塑科研""城市生活成本对比""签证政策解读"等已被反复写过的题材，除非新闻里有全新的具体事件）：
${exclusionList || '（暂无已发布文章）'}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
      system: 'You are a content strategist for Koala PhD (koalaphd.com), an academic matching platform connecting Chinese students with Australian PhD supervisors. Return valid JSON array only, no markdown code blocks or extra text.',
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '[]';
    let candidates: Candidate[] = [];
    try {
      const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const parsed = JSON.parse(cleaned);
      candidates = Array.isArray(parsed) ? parsed.filter((c: Candidate) => c && typeof c.title === 'string' && c.title.trim()) : [];
    } catch {
      candidates = [];
    }

    if (candidates.length === 0) {
      return Response.json({
        topics: [], newsCount, dateRange,
        reason: 'LLM 未从新闻中产出有效候选选题。',
        filtered: emptyFiltered,
      });
    }

    // ── 步骤 3：候选选题向量闸门 —— 与已有文章 embedding 比对，> 0.88 丢弃 ──
    const filteredDetails: { topic: string; matchedArticleId: string; similarity: number }[] = [];
    let kept: Candidate[] = candidates;
    let gateNote: string | null = null;

    if (existing.length > 0) {
      try {
        const existingVecs = await createEmbeddingsBatch(
          existing.map(r => `${r.title_zh}${r.excerpt_zh ? '。' + r.excerpt_zh : ''}`),
        );
        const candVecs = await createEmbeddingsBatch(candidates.map(c => c.title));

        kept = [];
        candidates.forEach((cand, ci) => {
          let bestSim = -1;
          let bestId = '';
          for (let ei = 0; ei < existing.length; ei++) {
            const sim = cosine(candVecs[ci], existingVecs[ei]);
            if (sim > bestSim) { bestSim = sim; bestId = existing[ei].id; }
          }
          if (bestSim > SIM_THRESHOLD) {
            const detail = { topic: cand.title, matchedArticleId: bestId, similarity: +bestSim.toFixed(3) };
            filteredDetails.push(detail);
            console.warn('[blog/topics] candidate filtered as duplicate:', detail);
          } else {
            kept.push(cand);
          }
        });
      } catch (e) {
        // 向量闸门失败 → 降级放行候选，但明确标注，避免静默
        gateNote = `向量查重闸门执行失败，已跳过该闸门（候选未做相似度过滤）：${(e as Error).message}`;
        console.error('[blog/topics] embedding gate failed (degraded, candidates NOT filtered):', (e as Error).message);
        kept = candidates;
      }
    }

    // ── 步骤 4：报告拦截情况 ──
    const reasons: Record<string, number> = {};
    if (filteredDetails.length > 0) reasons[`similar_to_existing_gt_${SIM_THRESHOLD}`] = filteredDetails.length;
    const filtered = { count: filteredDetails.length, reasons, details: filteredDetails };

    let reason: string | null = gateNote;
    if (!reason && kept.length === 0 && candidates.length > 0) {
      reason = `全部 ${candidates.length} 个候选与已有文章高度相似（>${SIM_THRESHOLD}），已全部拦截。`;
    }

    return Response.json({ topics: kept, newsCount, dateRange, reason, filtered });
  } catch (error) {
    console.error('[blog/topics]', error);
    return Response.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}
