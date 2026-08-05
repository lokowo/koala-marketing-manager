import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '../../../lib/supabase/server';
import { createEmbeddingsBatch } from '../../../lib/server/embedding';
import { TOPIC_SIM_THRESHOLD as SIM_THRESHOLD, cosine, parseVector } from '../../../lib/server/dedup';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

// 选题查重阈值（title 空间）与 cosine/parseVector 统一由 lib/server/dedup 提供（单一事实来源）。
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
    let existing: { id: string; title_zh: string | null; excerpt_zh: string | null; published_at: string | null; topic_embedding: unknown }[] = [];
    try {
      const { data } = await db
        .from('blog_posts')
        .select('id, title_zh, excerpt_zh, published_at, topic_embedding')
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

    // ── 步骤 3：候选选题向量闸门 —— 读库比对已落库的 topic_embedding（候选标题↔topic_embedding，同粒度）──
    const filteredDetails: { topic: string; matchedArticleId: string; similarity: number }[] = [];
    let kept: Candidate[] = candidates;

    if (existing.length > 0) {
      // 拆分：已落库向量 vs 缺 embedding 的文章（后者记日志，绝不静默跳过）
      const withVec: { id: string; vec: number[] }[] = [];
      const missingVec: string[] = [];
      for (const r of existing) {
        const vec = parseVector(r.topic_embedding);
        if (vec && vec.length > 0) withVec.push({ id: r.id, vec });
        else missingVec.push(r.id);
      }
      if (missingVec.length > 0) {
        console.warn(
          `[blog/topics] ${missingVec.length}/${existing.length} 篇文章缺 topic_embedding，未纳入查重比对（需跑 backfill 脚本回填）：`,
          missingVec.join(', '),
        );
      }

      // 语料存在、但无任何可用向量 → 无法查重。fail-closed：中止本次选题，不放行候选。
      if (withVec.length === 0) {
        const reason = `选题查重闸门无可用语料向量（${existing.length} 篇非教授类文章均未回填 topic_embedding），已中止本次选题（fail-closed，不降级放行）。请先执行 scripts/backfill-blog-content-embedding-20260805.ts。`;
        console.error('[blog/topics] gate has zero corpus vectors — fail closed.');
        return Response.json({ topics: [], newsCount, dateRange, reason, filtered: emptyFiltered });
      }

      // 候选仍需即时 embedding（候选是尚未入库的新选题，只有标题文本）。
      // embedding 服务不可用 → fail-closed：中止本次选题，不再降级放行。
      let candVecs: number[][];
      try {
        candVecs = await createEmbeddingsBatch(candidates.map(c => c.title));
      } catch (e) {
        const reason = `Embedding 服务不可用，无法执行选题查重闸门，已中止本次选题（fail-closed，不降级放行）：${(e as Error).message}`;
        console.error('[blog/topics] candidate embedding failed — fail closed:', (e as Error).message);
        return Response.json({ topics: [], newsCount, dateRange, reason, filtered: emptyFiltered });
      }

      kept = [];
      candidates.forEach((cand, ci) => {
        let bestSim = -1;
        let bestId = '';
        for (const ex of withVec) {
          const sim = cosine(candVecs[ci], ex.vec);
          if (sim > bestSim) { bestSim = sim; bestId = ex.id; }
        }
        // 可观测性：无论拦截还是放行，都记录候选标题 / 最高相似度 / 命中文章 id，
        // 便于后续用真实线上分布（裸标题口径）重新标定 SIM_THRESHOLD。
        const obs = { topic: cand.title, bestSim: +bestSim.toFixed(4), matchedArticleId: bestId, threshold: SIM_THRESHOLD };
        if (bestSim > SIM_THRESHOLD) {
          filteredDetails.push({ topic: cand.title, matchedArticleId: bestId, similarity: +bestSim.toFixed(3) });
          console.warn('[blog/topics] candidate FILTERED (dup):', obs);
        } else {
          kept.push(cand);
          console.log('[blog/topics] candidate KEPT:', obs);
        }
      });
    }

    // ── 步骤 4：报告拦截情况 ──
    const reasons: Record<string, number> = {};
    if (filteredDetails.length > 0) reasons[`similar_to_existing_gt_${SIM_THRESHOLD}`] = filteredDetails.length;
    const filtered = { count: filteredDetails.length, reasons, details: filteredDetails };

    let reason: string | null = null;
    if (kept.length === 0 && candidates.length > 0) {
      reason = `全部 ${candidates.length} 个候选与已有文章高度相似（>${SIM_THRESHOLD}），已全部拦截。`;
    }

    return Response.json({ topics: kept, newsCount, dateRange, reason, filtered });
  } catch (error) {
    console.error('[blog/topics]', error);
    return Response.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}
