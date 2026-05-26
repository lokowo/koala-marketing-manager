import { supabaseAdmin } from '../../../lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';
import { Resend } from 'resend';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const ADMIN_EMAILS = ['renehee@hotmail.com', 'yangxianzeng2021@gmail.com'];

interface ModeStats {
  mode: string;
  count: number;
  pct: number;
  leftCount: number;
  leftPct: number;
}

interface ReactionStats {
  reaction: string;
  count: number;
  pct: number;
}

interface FeedbackEntry {
  answer: string;
  conversation_id: string | null;
  user_id: string | null;
}

interface ConversationRow {
  ola_mode: string | null;
  user_reaction: string | null;
  response_time_ms: number | null;
  user_id: string;
  user_message: string;
  ola_response: string;
  session_id: string;
}

interface NegativeFeedbackItem { topic: string; count: number; sample_conversation: string }
interface FeatureDisconnectItem { feature: string; count: number; suggested_fix: string }
interface PersonalityMismatchItem { issue: string; count: number; suggested_fix: string }

interface EvolutionReport {
  summary: string;
  metrics: { total_conversations: number; unique_users: number; avg_depth: number; feedback_ratio: { positive: number; neutral: number; negative: number } };
  top_modes: { mode: string; reason: string }[];
  problem_modes: { mode: string; issue: string; suggestion: string }[];
  negative_feedback_analysis: {
    total_negative: number;
    knowledge_gap: NegativeFeedbackItem[];
    feature_disconnect: FeatureDisconnectItem[];
    personality_mismatch: PersonalityMismatchItem[];
  };
  prompt_suggestions: string[];
  priority_fixes: { type: string; action: string; urgency: string }[];
}

function getWeekNumber(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - start.getTime();
  return Math.ceil((diff / 86400000 + start.getDay() + 1) / 7);
}

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

    // Fetch conversation logs + feedback in parallel
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

    // Average conversation depth (turns per session)
    const sessionTurns = new Map<string, number>();
    for (const r of rows) {
      sessionTurns.set(r.session_id, (sessionTurns.get(r.session_id) ?? 0) + 1);
    }
    const avgDepth = sessionTurns.size > 0
      ? Math.round([...sessionTurns.values()].reduce((a, b) => a + b, 0) / sessionTurns.size * 10) / 10
      : 0;

    // Mode breakdown
    const modeCounts = new Map<string, number>();
    const modeLeftCounts = new Map<string, number>();
    for (const r of rows) {
      const m = r.ola_mode ?? 'unknown';
      modeCounts.set(m, (modeCounts.get(m) ?? 0) + 1);
      if (r.user_reaction === 'left') {
        modeLeftCounts.set(m, (modeLeftCounts.get(m) ?? 0) + 1);
      }
    }

    const modeBreakdown: ModeStats[] = [...modeCounts.entries()]
      .map(([mode, count]) => ({
        mode,
        count,
        pct: Math.round((count / totalTurns) * 100),
        leftCount: modeLeftCounts.get(mode) ?? 0,
        leftPct: count > 0 ? Math.round(((modeLeftCounts.get(mode) ?? 0) / count) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Reaction breakdown
    const reactionCounts = new Map<string, number>();
    for (const r of rows) {
      const rx = r.user_reaction ?? 'none';
      reactionCounts.set(rx, (reactionCounts.get(rx) ?? 0) + 1);
    }

    const reactionBreakdown: ReactionStats[] = [...reactionCounts.entries()]
      .map(([reaction, count]) => ({
        reaction,
        count,
        pct: Math.round((count / totalTurns) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    // Top 3 modes with highest left rate (min 5 conversations to avoid noise)
    const topLeftModes = modeBreakdown
      .filter(m => m.count >= 5)
      .sort((a, b) => b.leftPct - a.leftPct)
      .slice(0, 3);

    // Modes that led to subscriptions
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
    const negativeFeedbacks: { conversationId: string | null; userId: string | null }[] = [];

    for (const fb of feedbackRows) {
      const a = fb.answer.toLowerCase();
      if (a === 'positive' || a === '👍' || a === 'helpful') {
        feedbackCounts.positive++;
      } else if (a === 'negative' || a === '👎' || a === 'unhelpful' || a === 'wrong') {
        feedbackCounts.negative++;
        negativeFeedbacks.push({ conversationId: fb.conversation_id, userId: fb.user_id });
      } else {
        feedbackCounts.neutral++;
      }
    }

    // Fetch conversation context for negative feedbacks
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
      totalTurns,
      uniqueUsers,
      avgResponseTimeMs,
      avgDepth,
      modeBreakdown,
      reactionBreakdown,
      topLeftModes,
      subscribedModes,
      feedbackCounts,
      negativeFeedbackCount: negativeFeedbacks.length,
    };

    // ── Claude Haiku analysis ──────────────────────────────────────────────

    // Sample general conversations (up to 20)
    const sampleSize = Math.min(20, rows.length);
    const step = Math.max(1, Math.floor(rows.length / sampleSize));
    const samples = rows.filter((_, i) => i % step === 0).slice(0, sampleSize);

    const sampleText = samples
      .map((s, i) => `[${i + 1}] mode=${s.ola_mode ?? '?'} reaction=${s.user_reaction ?? '?'}\nUser: ${s.user_message.slice(0, 200)}\nOla: ${s.ola_response.slice(0, 200)}`)
      .join('\n\n');

    // Negative feedback conversations (all, up to 30)
    const negSampleText = negativeContexts.length > 0
      ? negativeContexts.slice(0, 30)
          .map((n, i) => `[NEG-${i + 1}] mode=${n.ola_mode ?? '?'}\nUser: ${n.user_message.slice(0, 300)}\nOla: ${n.ola_response.slice(0, 300)}`)
          .join('\n\n')
      : '（本周无 negative 反馈数据）';

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const analysis = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 3000,
      system: `你是 Koala PhD 平台的数据分析师。分析 Ola 学姐 AI 的每周对话数据，生成进化报告。

重点任务：对每条 negative 反馈做三分类归因：

类型 A：knowledge_gap（知识缺失）
— 学姐不知道这个信息，答不上来或答错了
— 例：签证政策、租房信息、具体大学的实时 position
— 修复方向：补充知识库/数据表

类型 B：feature_disconnect（功能不通）
— 平台有这个能力但学姐没引导用户使用
— 例：用户要CV但学姐推荐Canva、用户要发邮件但学姐没提Gmail集成
— 修复方向：更新 ola-persona.ts 的功能引导章节

类型 C：personality_mismatch（人格失调）
— 学姐的语气、模式、时机不对
— 例：用户焦虑时学姐还开玩笑、毒舌模式太凶导致用户离开
— 修复方向：调整 prompt 中的模式切换规则和语气参数

回复必须是纯 JSON，不要包含任何其他文字。JSON 格式：
{
  "summary": "本周概要（2-3句话）",
  "top_modes": [{"mode": "模式名", "reason": "为什么受欢迎"}],
  "problem_modes": [{"mode": "模式名", "issue": "问题描述", "suggestion": "改进建议"}],
  "negative_feedback_analysis": {
    "total_negative": 0,
    "knowledge_gap": [{"topic": "话题", "count": 0, "sample_conversation": "简短摘要"}],
    "feature_disconnect": [{"feature": "功能名", "count": 0, "suggested_fix": "检查 persona 第X章"}],
    "personality_mismatch": [{"issue": "具体问题", "count": 0, "suggested_fix": "调整建议"}]
  },
  "prompt_suggestions": ["具体的 prompt 改进建议"],
  "priority_fixes": [{"type": "knowledge_gap|feature_disconnect|personality_mismatch", "action": "具体修复动作", "urgency": "high|medium|low"}]
}`,
      messages: [{
        role: 'user',
        content: `以下是 Ola 学姐过去7天的对话统计、样本数据和 negative 反馈。请分析并生成进化报告。

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
        top_modes: [],
        problem_modes: [],
        negative_feedback_analysis: { total_negative: feedbackCounts.negative, knowledge_gap: [], feature_disconnect: [], personality_mismatch: [] },
        prompt_suggestions: [],
        priority_fixes: [],
      };
    }

    // Ensure metrics are populated even if AI omitted them
    if (!report.metrics) {
      report.metrics = { total_conversations: totalTurns, unique_users: uniqueUsers, avg_depth: avgDepth, feedback_ratio: feedbackCounts };
    }
    if (!report.negative_feedback_analysis) {
      report.negative_feedback_analysis = { total_negative: feedbackCounts.negative, knowledge_gap: [], feature_disconnect: [], personality_mismatch: [] };
    }
    if (!report.priority_fixes) {
      report.priority_fixes = [];
    }

    // ── Save report ────────────────────────────────────────────────────────

    const weekNumber = getWeekNumber(now);

    const { error: insertErr } = await db
      .from('ola_evolution_reports')
      .insert({
        week_number: weekNumber,
        report_json: { stats, report },
      });

    if (insertErr) {
      console.error('[ola-evolution] Failed to save report:', insertErr);
    }

    // ── Email notification to admins ───────────────────────────────────────

    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@koalaphd.com';

      const nfa = report.negative_feedback_analysis;

      const topModesHtml = report.top_modes.length > 0
        ? report.top_modes.map(m => `<li><strong>${m.mode}</strong>: ${m.reason}</li>`).join('')
        : '<li>数据不足</li>';

      const problemModesHtml = report.problem_modes.length > 0
        ? report.problem_modes.map(m => `<li><strong>${m.mode}</strong>: ${m.issue}<br/>建议: ${m.suggestion}</li>`).join('')
        : '<li>暂无问题</li>';

      const knowledgeGapHtml = nfa.knowledge_gap.length > 0
        ? nfa.knowledge_gap.map(k => `<li><strong>${k.topic}</strong> (${k.count}次) — ${k.sample_conversation}</li>`).join('')
        : '<li>无</li>';

      const featureDisconnectHtml = nfa.feature_disconnect.length > 0
        ? nfa.feature_disconnect.map(f => `<li><strong>${f.feature}</strong> (${f.count}次) — ${f.suggested_fix}</li>`).join('')
        : '<li>无</li>';

      const personalityHtml = nfa.personality_mismatch.length > 0
        ? nfa.personality_mismatch.map(p => `<li><strong>${p.issue}</strong> (${p.count}次) — ${p.suggested_fix}</li>`).join('')
        : '<li>无</li>';

      const priorityFixesHtml = report.priority_fixes.length > 0
        ? report.priority_fixes.map(f => {
            const icon = f.urgency === 'high' ? '🔴' : f.urgency === 'medium' ? '🟡' : '🟢';
            return `<li>${icon} [${f.type}] ${f.action}</li>`;
          }).join('')
        : '<li>暂无紧急修复</li>';

      const suggestionsHtml = report.prompt_suggestions.length > 0
        ? report.prompt_suggestions.map(s => `<li>${s}</li>`).join('')
        : '<li>暂无建议</li>';

      const html = `
<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px">
<h2>🐨 Ola 学姐进化周报 — 第 ${weekNumber} 周</h2>
<p><strong>概要：</strong>${report.summary}</p>

<h3>📊 本周数据</h3>
<table style="border-collapse:collapse;width:100%">
<tr><td style="padding:4px 8px;border:1px solid #ddd">对话轮数</td><td style="padding:4px 8px;border:1px solid #ddd">${stats.totalTurns}</td></tr>
<tr><td style="padding:4px 8px;border:1px solid #ddd">独立用户</td><td style="padding:4px 8px;border:1px solid #ddd">${stats.uniqueUsers}</td></tr>
<tr><td style="padding:4px 8px;border:1px solid #ddd">平均对话深度</td><td style="padding:4px 8px;border:1px solid #ddd">${stats.avgDepth} 轮/会话</td></tr>
<tr><td style="padding:4px 8px;border:1px solid #ddd">平均响应</td><td style="padding:4px 8px;border:1px solid #ddd">${stats.avgResponseTimeMs ? stats.avgResponseTimeMs + 'ms' : 'N/A'}</td></tr>
<tr><td style="padding:4px 8px;border:1px solid #ddd">反馈比例</td><td style="padding:4px 8px;border:1px solid #ddd">👍 ${feedbackCounts.positive} / 😐 ${feedbackCounts.neutral} / 👎 ${feedbackCounts.negative}</td></tr>
</table>

<h3>🌟 最受欢迎模式</h3><ul>${topModesHtml}</ul>
<h3>⚠️ 需要改进</h3><ul>${problemModesHtml}</ul>

<h3>📋 Negative 反馈归因分析（共 ${nfa.total_negative} 条）</h3>
<h4>🔴 知识缺失 knowledge_gap（${nfa.knowledge_gap.length} 类）</h4>
<ul>${knowledgeGapHtml}</ul>
<h4>🟡 功能不通 feature_disconnect（${nfa.feature_disconnect.length} 类）</h4>
<ul>${featureDisconnectHtml}</ul>
<h4>🟠 人格失调 personality_mismatch（${nfa.personality_mismatch.length} 类）</h4>
<ul>${personalityHtml}</ul>

<h3>🚨 优先修复项</h3><ul>${priorityFixesHtml}</ul>
<h3>💡 Prompt 改进建议</h3><ul>${suggestionsHtml}</ul>

<p style="color:#888;font-size:12px;margin-top:20px">此报告为人工审批模式，不会自动修改代码。请查看后决定是否采纳建议。</p>
</body></html>`;

      for (const email of ADMIN_EMAILS) {
        await resend.emails.send({
          from: `Koala PhD <${fromEmail}>`,
          to: email,
          subject: `[Ola进化] 第${weekNumber}周 — ${stats.totalTurns}轮对话 | 👎${feedbackCounts.negative}条`,
          html,
        }).catch(err => console.error(`[ola-evolution] Failed to email ${email}:`, err));
      }
    }

    return Response.json({
      ok: true,
      weekNumber,
      stats: {
        totalTurns: stats.totalTurns,
        uniqueUsers: stats.uniqueUsers,
        avgDepth: stats.avgDepth,
        avgResponseTimeMs: stats.avgResponseTimeMs,
        feedbackCounts,
      },
      reportSummary: report.summary,
      negativeFeedbackTotal: report.negative_feedback_analysis.total_negative,
      priorityFixes: report.priority_fixes.length,
    });
  } catch (error) {
    console.error('[ola-evolution]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
