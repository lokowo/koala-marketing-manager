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

interface WeeklyStats {
  totalTurns: number;
  uniqueUsers: number;
  avgResponseTimeMs: number | null;
  modeBreakdown: ModeStats[];
  reactionBreakdown: ReactionStats[];
  topLeftModes: ModeStats[];
  subscribedModes: { mode: string; count: number }[];
}

interface EvolutionReport {
  summary: string;
  top_modes: { mode: string; reason: string }[];
  problem_modes: { mode: string; issue: string; suggestion: string }[];
  new_topics: string[];
  prompt_suggestions: string[];
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

    // Fetch all conversation logs from the past 7 days
    const { data: logs, error: logsErr } = await db
      .from('ola_conversation_logs')
      .select('ola_mode, user_reaction, response_time_ms, user_id, user_message, ola_response')
      .gte('created_at', sinceISO)
      .order('created_at', { ascending: true })
      .limit(5000);

    if (logsErr) throw new Error(`Failed to fetch logs: ${logsErr.message}`);

    const rows = (logs ?? []) as {
      ola_mode: string | null;
      user_reaction: string | null;
      response_time_ms: number | null;
      user_id: string;
      user_message: string;
      ola_response: string;
    }[];

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

    const stats: WeeklyStats = {
      totalTurns,
      uniqueUsers,
      avgResponseTimeMs,
      modeBreakdown,
      reactionBreakdown,
      topLeftModes,
      subscribedModes,
    };

    // ── Claude Haiku analysis ──────────────────────────────────────────────

    // Sample some conversations for qualitative analysis (up to 30)
    const sampleSize = Math.min(30, rows.length);
    const step = Math.max(1, Math.floor(rows.length / sampleSize));
    const samples = rows.filter((_, i) => i % step === 0).slice(0, sampleSize);

    const sampleText = samples
      .map((s, i) => `[${i + 1}] mode=${s.ola_mode ?? '?'} reaction=${s.user_reaction ?? '?'}\nUser: ${s.user_message.slice(0, 200)}\nOla: ${s.ola_response.slice(0, 200)}`)
      .join('\n\n');

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const analysis = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system: `你是 Koala PhD 平台的数据分析师。分析 Ola 学姐 AI 的每周对话数据，生成进化报告。
回复必须是纯 JSON，不要包含任何其他文字。JSON 格式：
{
  "summary": "本周概要（2-3句话）",
  "top_modes": [{"mode": "模式名", "reason": "为什么受欢迎"}],
  "problem_modes": [{"mode": "模式名", "issue": "问题描述", "suggestion": "改进建议"}],
  "new_topics": ["用户问了但学姐答不好的话题"],
  "prompt_suggestions": ["具体的 prompt 改进建议"]
}`,
      messages: [{
        role: 'user',
        content: `以下是 Ola 学姐过去7天的对话统计和样本数据。请分析并生成进化报告。

## 统计数据
${JSON.stringify(stats, null, 2)}

## 对话样本（${sampleSize} 条）
${sampleText}`,
      }],
    });

    let report: EvolutionReport;
    const rawText = analysis.content[0].type === 'text' ? analysis.content[0].text : '';

    try {
      report = JSON.parse(rawText);
    } catch {
      report = {
        summary: rawText.slice(0, 500),
        top_modes: [],
        problem_modes: [],
        new_topics: [],
        prompt_suggestions: [],
      };
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

      const topModesHtml = report.top_modes.length > 0
        ? report.top_modes.map(m => `<li><strong>${m.mode}</strong>: ${m.reason}</li>`).join('')
        : '<li>数据不足</li>';

      const problemModesHtml = report.problem_modes.length > 0
        ? report.problem_modes.map(m => `<li><strong>${m.mode}</strong>: ${m.issue}<br/>建议: ${m.suggestion}</li>`).join('')
        : '<li>暂无问题</li>';

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
<tr><td style="padding:4px 8px;border:1px solid #ddd">平均响应</td><td style="padding:4px 8px;border:1px solid #ddd">${stats.avgResponseTimeMs ? stats.avgResponseTimeMs + 'ms' : 'N/A'}</td></tr>
</table>

<h3>🌟 最受欢迎模式</h3><ul>${topModesHtml}</ul>
<h3>⚠️ 需要改进</h3><ul>${problemModesHtml}</ul>
<h3>💡 Prompt 改进建议</h3><ul>${suggestionsHtml}</ul>

<p style="color:#888;font-size:12px;margin-top:20px">此报告为人工审批模式，不会自动修改代码。请查看后决定是否采纳建议。</p>
</body></html>`;

      for (const email of ADMIN_EMAILS) {
        await resend.emails.send({
          from: `Koala PhD <${fromEmail}>`,
          to: email,
          subject: `[Ola进化] 第${weekNumber}周报告 — ${stats.totalTurns}轮对话, ${stats.uniqueUsers}用户`,
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
        avgResponseTimeMs: stats.avgResponseTimeMs,
      },
      reportSummary: report.summary,
    });
  } catch (error) {
    console.error('[ola-evolution]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
