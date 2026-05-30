import { supabaseAdmin } from '../../../lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

// ─── Types ──────────────────────────────────────────────────────────────────

interface ModeStats { mode: string; count: number; pct: number; leftCount: number; leftPct: number }
interface ReactionStats { reaction: string; count: number; pct: number }
interface FeedbackEntry { answer: string; conversation_id: string | null; user_id: string | null }

interface ConversationRow {
  ola_mode: string | null;
  user_reaction: string | null;
  response_time_ms: number | null;
  user_id: string;
  user_message: string;
  ola_response: string;
  session_id: string;
}

interface EvolutionSuggestion {
  category: string;
  title: string;
  suggestion: string;
  evidence: string;
  source_sample_count: number;
}

interface AnalysisOutput {
  summary: string;
  suggestions: EvolutionSuggestion[];
}

function getWeekNumber(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - start.getTime();
  return Math.ceil((diff / 86400000 + start.getDay() + 1) / 7);
}

// ─── Cron Handler ───────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sinceISO = sevenDaysAgo.toISOString();

    // ── Step 1: Data collection ────────────────────────────────────────────

    const [logsRes, feedbackRes] = await Promise.all([
      db.from('ola_conversation_logs')
        .select('ola_mode, user_reaction, response_time_ms, user_id, user_message, ola_response, session_id')
        .gte('created_at', sinceISO)
        .order('created_at', { ascending: true })
        .limit(5000),
      db.from('chat_feedback')
        .select('answer, conversation_id, user_id')
        .gte('created_at', sinceISO)
        .limit(2000),
    ]);

    if (logsRes.error) throw new Error(`Failed to fetch logs: ${logsRes.error.message}`);

    const rows = (logsRes.data ?? []) as ConversationRow[];
    const feedbackRows = (feedbackRes.data ?? []) as FeedbackEntry[];

    if (rows.length === 0) {
      return Response.json({ ok: true, message: 'No conversation data this week, skipping report.' });
    }

    // ── Compute stats ──────────────────────────────────────────────────────

    const totalTurns = rows.length;
    const uniqueUsers = new Set(rows.map(r => r.user_id)).size;

    const responseTimes = rows.map(r => r.response_time_ms).filter((t): t is number => t !== null);
    const avgResponseTimeMs = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : null;

    const sessionTurns = new Map<string, number>();
    for (const r of rows) {
      sessionTurns.set(r.session_id, (sessionTurns.get(r.session_id) ?? 0) + 1);
    }
    const avgDepth = sessionTurns.size > 0
      ? Math.round([...sessionTurns.values()].reduce((a, b) => a + b, 0) / sessionTurns.size * 10) / 10
      : 0;

    const modeCounts = new Map<string, number>();
    const modeLeftCounts = new Map<string, number>();
    for (const r of rows) {
      const m = r.ola_mode ?? 'unknown';
      modeCounts.set(m, (modeCounts.get(m) ?? 0) + 1);
      if (r.user_reaction === 'left') modeLeftCounts.set(m, (modeLeftCounts.get(m) ?? 0) + 1);
    }

    const modeBreakdown: ModeStats[] = [...modeCounts.entries()]
      .map(([mode, count]) => ({
        mode, count,
        pct: Math.round((count / totalTurns) * 100),
        leftCount: modeLeftCounts.get(mode) ?? 0,
        leftPct: count > 0 ? Math.round(((modeLeftCounts.get(mode) ?? 0) / count) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const reactionCounts = new Map<string, number>();
    for (const r of rows) {
      const rx = r.user_reaction ?? 'none';
      reactionCounts.set(rx, (reactionCounts.get(rx) ?? 0) + 1);
    }
    const reactionBreakdown: ReactionStats[] = [...reactionCounts.entries()]
      .map(([reaction, count]) => ({ reaction, count, pct: Math.round((count / totalTurns) * 100) }))
      .sort((a, b) => b.count - a.count);

    const topLeftModes = modeBreakdown.filter(m => m.count >= 5).sort((a, b) => b.leftPct - a.leftPct).slice(0, 3);

    // ── Feedback analysis ──────────────────────────────────────────────────

    const feedbackCounts = { positive: 0, neutral: 0, negative: 0 };
    const negativeFeedbacks: { conversationId: string | null }[] = [];

    for (const fb of feedbackRows) {
      const a = fb.answer.toLowerCase();
      if (a === 'positive' || a === '👍' || a === 'helpful') feedbackCounts.positive++;
      else if (a === 'negative' || a === '👎' || a === 'unhelpful' || a === 'wrong') {
        feedbackCounts.negative++;
        negativeFeedbacks.push({ conversationId: fb.conversation_id });
      } else feedbackCounts.neutral++;
    }

    const negConvIds = negativeFeedbacks
      .map(n => n.conversationId)
      .filter((id): id is string => id !== null)
      .slice(0, 50);

    let negativeContexts: { session_id: string; user_message: string; ola_response: string; ola_mode: string | null }[] = [];
    if (negConvIds.length > 0) {
      const { data: negLogs } = await db
        .from('ola_conversation_logs')
        .select('session_id, user_message, ola_response, ola_mode')
        .in('session_id', negConvIds)
        .order('created_at', { ascending: false })
        .limit(100);
      negativeContexts = (negLogs ?? []) as typeof negativeContexts;
    }

    const stats = {
      totalTurns, uniqueUsers, avgResponseTimeMs, avgDepth,
      modeBreakdown, reactionBreakdown, topLeftModes,
      feedbackCounts, negativeFeedbackCount: negativeFeedbacks.length,
    };

    // ── Step 2: Claude analysis → 3-5 global improvement suggestions ───────

    const sampleSize = Math.min(20, rows.length);
    const step = Math.max(1, Math.floor(rows.length / sampleSize));
    const samples = rows.filter((_, i) => i % step === 0).slice(0, sampleSize);

    const sampleText = samples
      .map((s, i) => `[${i + 1}] mode=${s.ola_mode ?? '?'} reaction=${s.user_reaction ?? '?'}\nUser: ${s.user_message.slice(0, 200)}\nOla: ${s.ola_response.slice(0, 200)}`)
      .join('\n\n');

    const negSampleText = negativeContexts.length > 0
      ? negativeContexts.slice(0, 30)
          .map((n, i) => `[NEG-${i + 1}] mode=${n.ola_mode ?? '?'}\nUser: ${n.user_message.slice(0, 300)}\nOla: ${n.ola_response.slice(0, 300)}`)
          .join('\n\n')
      : '（本周无 negative 反馈数据）';

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const analysis = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 3000,
      system: `你是 Koala PhD 平台的"全局进化分析师"。分析 Ola 学姐近一周的对话数据，找出**通用模式**（许多用户都遇到的卡点、都问的问题、都反馈的偏好），总结成 3-5 条"全局改进建议"。

【铁律】
- 你只产出"待审建议"。绝不直接修改 ola-persona.ts、知识库、prompt 或任何全局配置。
- 每条建议都要写明依据(evidence)和样本量(source_sample_count)，方便 SA 判断是否值得落地。
- 不要给个例小修小补，只挑跨用户的通用模式。

【category 取值】（选一个最贴切的）
- persona: 学姐的语气、性格、人设
- prompt: 系统 prompt / 模式切换 / 引导
- knowledge: 知识盲区或事实错误
- feature: 功能引导缺失或断链
- flow: 对话节奏 / 多轮流转

【输出格式】纯 JSON，不带 markdown 包裹：
{
  "summary": "本周整体观察 1-2 句",
  "suggestions": [
    {
      "category": "persona|prompt|knowledge|feature|flow",
      "title": "≤30字简洁标题",
      "suggestion": "具体改进建议（在 SA 看到后能直接判断该不该做）",
      "evidence": "支持证据：哪类对话出现了什么模式，引用 1-2 个具体片段",
      "source_sample_count": 5
    }
  ]
}

只输出 3-5 条最有价值的、跨用户的、可落地的建议。`,
      messages: [{
        role: 'user',
        content: `Ola 学姐过去 7 天的对话数据如下，请输出 3-5 条全局改进建议。

## 统计
${JSON.stringify(stats, null, 2)}

## 对话样本（${sampleSize} 条）
${sampleText}

## Negative 反馈对话（${negativeContexts.length} 条）
${negSampleText}`,
      }],
    });

    let parsed: AnalysisOutput = { summary: '', suggestions: [] };
    const rawText = analysis.content[0].type === 'text' ? analysis.content[0].text : '';

    try {
      const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error('[ola-evolution] Failed to parse Claude output', e);
    }

    if (!Array.isArray(parsed.suggestions)) parsed.suggestions = [];

    // ── Step 3: Save snapshot report ───────────────────────────────────────

    const weekNumber = getWeekNumber(now);

    const { data: reportRow } = await db
      .from('ola_evolution_reports')
      .insert({
        week_number: weekNumber,
        report_json: { stats, summary: parsed.summary, suggestions: parsed.suggestions },
      })
      .select('id')
      .single();

    // ── Step 4: Insert suggestions as PENDING (no auto-apply) ──────────────

    const VALID_CATEGORIES = ['persona', 'prompt', 'knowledge', 'feature', 'flow'];

    const toInsert = parsed.suggestions
      .filter(s => s && typeof s.title === 'string' && typeof s.suggestion === 'string')
      .slice(0, 5)
      .map(s => ({
        category: VALID_CATEGORIES.includes(s.category) ? s.category : 'flow',
        title: String(s.title).slice(0, 200),
        suggestion: String(s.suggestion).slice(0, 4000),
        evidence: String(s.evidence ?? '').slice(0, 4000),
        source_sample_count: Number.isFinite(s.source_sample_count)
          ? Math.max(1, Math.floor(s.source_sample_count))
          : totalTurns,
        status: 'pending' as const,
      }));

    let insertedCount = 0;
    if (toInsert.length > 0) {
      const { data: inserted, error: insErr } = await db
        .from('ola_evolution_suggestions')
        .insert(toInsert)
        .select('id');
      if (insErr) {
        console.error('[ola-evolution] Failed to insert suggestions:', insErr);
      } else {
        insertedCount = inserted?.length ?? 0;
      }
    }

    return Response.json({
      ok: true,
      weekNumber,
      reportId: reportRow?.id ?? null,
      stats: { totalTurns, uniqueUsers, avgDepth, avgResponseTimeMs, feedbackCounts },
      summary: parsed.summary,
      suggestionsInserted: insertedCount,
      suggestionsProposed: parsed.suggestions.length,
      note: '所有建议为 pending，等待 super_admin 在 /dashboard/koala/evolution 审核',
    });
  } catch (error) {
    console.error('[ola-evolution]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
