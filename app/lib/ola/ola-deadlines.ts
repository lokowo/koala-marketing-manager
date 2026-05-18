import { supabaseAdmin } from '../supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function getDeadlineContext(targetUniversities: string[] | null | undefined): Promise<string> {
  if (!targetUniversities || targetUniversities.length === 0) return '';

  try {
    const today = new Date().toISOString().split('T')[0];
    const { data: deadlines } = await db
      .from('university_deadlines')
      .select('university, intake_period, deadline_date, scholarship_deadline')
      .gte('deadline_date', today)
      .order('deadline_date');

    if (!deadlines || deadlines.length === 0) return '';

    const matched: string[] = [];
    const now = new Date();

    for (const d of deadlines) {
      const isMatch = targetUniversities.some(
        t => t.toLowerCase().includes(d.university.toLowerCase()) ||
             d.university.toLowerCase().includes(t.toLowerCase())
      );
      if (!isMatch) continue;

      const deadlineDate = new Date(d.deadline_date);
      const daysLeft = Math.ceil((deadlineDate.getTime() - now.getTime()) / 86400000);
      matched.push(`${d.university} ${d.intake_period} → ${d.deadline_date}（还有 ${daysLeft} 天）`);

      if (d.scholarship_deadline && d.scholarship_deadline !== d.deadline_date) {
        const scholDate = new Date(d.scholarship_deadline);
        const scholDays = Math.ceil((scholDate.getTime() - now.getTime()) / 86400000);
        if (scholDays > 0) {
          matched.push(`  ↳ 奖学金截止：${d.scholarship_deadline}（还有 ${scholDays} 天）`);
        }
      }
    }

    if (matched.length === 0) return '';

    return `\n\n## 用户目标大学截止日\n${matched.join('\n')}\n请在合适时机主动提醒用户注意截止日期。`;
  } catch (err) {
    console.error('[ola-deadlines]', err);
    return '';
  }
}
