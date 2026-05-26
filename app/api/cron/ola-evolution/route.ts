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

interface AutoFix {
  type: 'prompt_update' | 'knowledge_add';
  target: string;
  section?: string;
  change_description: string;
  data?: Record<string, unknown>;
}

interface HumanFix {
  type: string;
  description: string;
}

interface EvolutionReport {
  summary: string;
  metrics: {
    total_conversations: number;
    unique_users: number;
    avg_depth: number;
    feedback_ratio: { positive: number; neutral: number; negative: number };
  };
  top_modes: { mode: string; reason: string }[];
  problem_modes: { mode: string; issue: string; suggestion: string }[];
  negative_feedback_analysis: {
    total_negative: number;
    knowledge_gap: { topic: string; count: number; sample_conversation: string }[];
    feature_disconnect: { feature: string; count: number; suggested_fix: string }[];
    personality_mismatch: { issue: string; count: number; suggested_fix: string }[];
  };
  prompt_suggestions: string[];
  auto_fixes: AutoFix[];
  requires_human: HumanFix[];
  priority_fixes: { type: string; action: string; urgency: string }[];
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

    const subscribedModeCounts = new Map<string, number>();
    for (const r of rows) {
      if (r.user_reaction === 'subscribed') {
        const m = r.ola_mode ?? 'unknown';
        subscribedModeCounts.set(m, (subscribedModeCounts.get(m) ?? 0) + 1);
      }
    }
    const subscribedModes = [...subscribedModeCounts.entries()]
      .map(([mode, count]) => ({ mode, count }))
      .sort((a, b) => b.count - a.count);

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
      modeBreakdown, reactionBreakdown, topLeftModes, subscribedModes,
      feedbackCounts, negativeFeedbackCount: negativeFeedbacks.length,
    };

    // ── Step 2: Claude Haiku analysis with auto_fixes ──────────────────────

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
      max_tokens: 4000,
      system: `你是 Koala PhD 平台的 AI 进化分析师。分析 Ola 学姐的每周对话数据，生成进化报告，并提出可自动执行的修复方案。

对每条 negative 反馈做三分类归因：

类型 A：knowledge_gap — 学姐不知道这个信息
修复方向：补充 ola_local_knowledge 表数据

类型 B：feature_disconnect — 平台有但学姐没引导
修复方向：更新 ola-persona.ts 的功能引导章节

类型 C：personality_mismatch — 语气/模式/时机不对
修复方向：调整 prompt 模式切换规则

在 auto_fixes 中输出可安全自动执行的修复：
- type="knowledge_add": 补充到 ola_local_knowledge 或 ola_calendar 表的数据（提供完整 data 对象）
- type="prompt_update": 建议修改 ola-persona.ts 的具体章节和内容（提供 section 和 change_description）

在 requires_human 中输出需要人工审批的项目（如接入新数据源、开发新功能）。

回复必须是纯 JSON，不含其他文字。格式：
{
  "summary": "本周概要（2-3句话）",
  "top_modes": [{"mode": "模式名", "reason": "原因"}],
  "problem_modes": [{"mode": "模式名", "issue": "问题", "suggestion": "建议"}],
  "negative_feedback_analysis": {
    "total_negative": 0,
    "knowledge_gap": [{"topic": "话题", "count": 0, "sample_conversation": "摘要"}],
    "feature_disconnect": [{"feature": "功能", "count": 0, "suggested_fix": "修复方向"}],
    "personality_mismatch": [{"issue": "问题", "count": 0, "suggested_fix": "调整方向"}]
  },
  "prompt_suggestions": ["具体建议"],
  "auto_fixes": [
    {"type": "knowledge_add", "target": "ola_local_knowledge", "change_description": "描述", "data": {"city": "sydney", "category": "...", "name": "...", "name_cn": "...", "vibe": "...", "ola_comment": "...", "best_for": "..."}},
    {"type": "prompt_update", "target": "ola-persona.ts", "section": "第X章", "change_description": "具体改什么"}
  ],
  "requires_human": [
    {"type": "new_feature", "description": "需要开发的功能"}
  ],
  "priority_fixes": [{"type": "knowledge_gap|feature_disconnect|personality_mismatch", "action": "动作", "urgency": "high|medium|low"}]
}`,
      messages: [{
        role: 'user',
        content: `Ola 学姐过去7天的对话统计、样本和 negative 反馈如下。请生成进化报告和修复建议。

## 统计数据
${JSON.stringify(stats, null, 2)}

## 对话样本（${sampleSize} 条）
${sampleText}

## Negative 反馈对话（${negativeContexts.length} 条）
${negSampleText}`,
      }],
    });

    let report: EvolutionReport;
    const rawText = analysis.content[0].type === 'text' ? analysis.content[0].text : '';

    try {
      report = JSON.parse(rawText);
    } catch {
      report = {
        summary: rawText.slice(0, 500),
        metrics: { total_conversations: totalTurns, unique_users: uniqueUsers, avg_depth: avgDepth, feedback_ratio: feedbackCounts },
        top_modes: [], problem_modes: [],
        negative_feedback_analysis: { total_negative: feedbackCounts.negative, knowledge_gap: [], feature_disconnect: [], personality_mismatch: [] },
        prompt_suggestions: [], auto_fixes: [], requires_human: [], priority_fixes: [],
      };
    }

    // Backfill missing fields
    if (!report.metrics) report.metrics = { total_conversations: totalTurns, unique_users: uniqueUsers, avg_depth: avgDepth, feedback_ratio: feedbackCounts };
    if (!report.negative_feedback_analysis) report.negative_feedback_analysis = { total_negative: feedbackCounts.negative, knowledge_gap: [], feature_disconnect: [], personality_mismatch: [] };
    if (!report.auto_fixes) report.auto_fixes = [];
    if (!report.requires_human) report.requires_human = [];
    if (!report.priority_fixes) report.priority_fixes = [];

    // ── Step 3: Save report ────────────────────────────────────────────────

    const weekNumber = getWeekNumber(now);

    const { data: reportRow, error: insertErr } = await db
      .from('ola_evolution_reports')
      .insert({
        week_number: weekNumber,
        report_json: { stats, report },
      })
      .select('id')
      .single();

    if (insertErr) {
      console.error('[ola-evolution] Failed to save report:', insertErr);
    }

    const reportId: string | null = reportRow?.id ?? null;

    // ── Step 4: Execute safe auto-fixes ────────────────────────────────────

    const executedFixes: { fix: AutoFix; status: string }[] = [];

    for (const fix of report.auto_fixes) {
      try {
        if (fix.type === 'knowledge_add' && fix.data) {
          // Safe: INSERT data into knowledge tables
          const table = fix.target === 'ola_calendar' ? 'ola_calendar' : 'ola_local_knowledge';
          const { error: kErr } = await db.from(table).insert(fix.data);
          if (kErr) {
            console.error(`[ola-evolution] knowledge_add failed:`, kErr);
            executedFixes.push({ fix, status: `error: ${kErr.message}` });
          } else {
            executedFixes.push({ fix, status: 'executed' });
          }

          // Record in pending_fixes as already executed
          if (reportId) {
            await db.from('ola_pending_fixes').insert({
              report_id: reportId,
              fix_type: fix.type,
              target: fix.target,
              section: fix.section ?? null,
              change_description: fix.change_description,
              data: fix.data,
              status: kErr ? 'failed' : 'executed',
              executed_at: kErr ? null : new Date().toISOString(),
            });
          }

        } else if (fix.type === 'prompt_update') {
          // Not safe to auto-execute: store as pending for Claude Code to pick up
          if (reportId) {
            await db.from('ola_pending_fixes').insert({
              report_id: reportId,
              fix_type: fix.type,
              target: fix.target,
              section: fix.section ?? null,
              change_description: fix.change_description,
              data: fix.data ?? null,
              status: 'pending',
            });
          }
          executedFixes.push({ fix, status: 'pending' });
        }
      } catch (err) {
        console.error(`[ola-evolution] auto-fix error:`, err);
        executedFixes.push({ fix, status: 'error' });
      }
    }

    // Record requires_human items
    for (const item of report.requires_human) {
      if (reportId) {
        await db.from('ola_pending_fixes').insert({
          report_id: reportId,
          fix_type: 'requires_human',
          target: item.type,
          change_description: item.description,
          status: 'needs_human',
        }).catch(() => {});
      }
    }

    // Update report with execution results
    if (reportId) {
      await db.from('ola_evolution_reports')
        .update({ changes_applied: { executed: executedFixes, requires_human: report.requires_human } })
        .eq('id', reportId);
    }

    // ── Step 5: Return summary ─────────────────────────────────────────────

    const knowledgeAdded = executedFixes.filter(f => f.fix.type === 'knowledge_add' && f.status === 'executed').length;
    const promptPending = executedFixes.filter(f => f.fix.type === 'prompt_update' && f.status === 'pending').length;

    return Response.json({
      ok: true,
      weekNumber,
      reportId,
      stats: {
        totalTurns, uniqueUsers, avgDepth, avgResponseTimeMs,
        feedbackCounts,
      },
      reportSummary: report.summary,
      autoFixes: {
        knowledgeAdded,
        promptPending,
        requiresHuman: report.requires_human.length,
      },
    });
  } catch (error) {
    console.error('[ola-evolution]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
