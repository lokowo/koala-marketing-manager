import { supabaseAdmin } from '../supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

interface DeadlineRow {
  university: string;
  program_type: string | null;
  intake_period: string | null;
  deadline_date: string;
  scholarship_deadline: string | null;
  description: string | null;
}

const WINDOW_DAYS = 180;
const MAX_UNTARGETED = 4;

function daysBetween(dateIso: string, now: Date): number {
  return Math.ceil((new Date(dateIso + 'T00:00:00').getTime() - now.getTime()) / 86400000);
}

function matchesTarget(target: string, deadlineUni: string): boolean {
  const t = target.toLowerCase().trim();
  const d = deadlineUni.toLowerCase();
  return t.length > 0 && (t.includes(d) || d.includes(t));
}

/**
 * Build a "deadline awareness" context block for Ola's system prompt.
 *
 * - Always queries upcoming PhD deadlines in the next 180 days.
 * - If `targetUniversities` provided, prioritizes those (and only shows them).
 * - Otherwise shows up to MAX_UNTARGETED nearest deadlines as general awareness.
 * - Returns '' when there is nothing to inject.
 */
export async function getDeadlineContext(
  targetUniversities: string[] | null | undefined,
): Promise<string> {
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const windowEnd = new Date(now.getTime() + WINDOW_DAYS * 86400000)
      .toISOString()
      .split('T')[0];

    const { data: rows } = await db
      .from('university_deadlines')
      .select('university, program_type, intake_period, deadline_date, scholarship_deadline, description')
      .gte('deadline_date', today)
      .lte('deadline_date', windowEnd)
      .order('deadline_date');

    const deadlines = (rows ?? []) as DeadlineRow[];
    if (deadlines.length === 0) return '';

    const hasTargets = Array.isArray(targetUniversities) && targetUniversities.length > 0;

    const matched = hasTargets
      ? deadlines.filter(d => targetUniversities!.some(t => matchesTarget(t, d.university)))
      : [];

    // Choose what to inject:
    // - If user has targets AND any matched → only show matched (priority focus).
    // - Otherwise → show top N nearest as general awareness.
    const toShow = matched.length > 0 ? matched : deadlines.slice(0, MAX_UNTARGETED);

    const lines: string[] = [];
    for (const d of toShow) {
      const dLeft = daysBetween(d.deadline_date, now);
      const intake = d.intake_period ? ` ${d.intake_period}` : '';
      const prog = d.program_type ?? 'PhD';
      let line = `- ${d.university}${intake} ${prog} 申请截止：${d.deadline_date}（还有 ${dLeft} 天）`;

      if (d.scholarship_deadline && d.scholarship_deadline !== d.deadline_date) {
        const sLeft = daysBetween(d.scholarship_deadline, now);
        if (sLeft >= 0) {
          line += `；奖学金截止：${d.scholarship_deadline}（还有 ${sLeft} 天，更早）`;
        }
      }
      if (d.description) line += `\n  备注：${d.description}`;
      lines.push(line);
    }

    const header = matched.length > 0
      ? '## 🗓 申请时机感知（用户目标大学的真实截止日）'
      : '## 🗓 申请时机感知（当前临近的澳洲 PhD 截止日，仅供你心里有数）';

    const guardrails = [
      '使用守则（重要）：',
      '1. 这些日期是数据库里的真实数据，不要篡改、推算或编造其它学校的日期。',
      '2. 只在用户聊到申请节奏 / 某所学校 / 来不来得及 / 奖学金 / 时间线时，自然地引用其中相关的一两条，别一上来就罗列日程表。',
      '3. 提醒时用学姐口吻（"诶，悉尼大学 RP1&2 还有 X 天就截止啦，要不要先把材料过一遍？"），不要 markdown 列表式罗列。',
      '4. 一次回复只提 1-2 所最相关的学校，别一次性把所有截止日都甩出来。',
      '5. 如果用户根本没聊到时间/申请，就当背景知识压在心里——别主动塞。',
    ].join('\n');

    return `\n\n${header}\n${lines.join('\n')}\n\n${guardrails}`;
  } catch (err) {
    console.error('[ola-deadlines]', err);
    return '';
  }
}
