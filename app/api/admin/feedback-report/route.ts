import { supabaseAdmin } from '../../../lib/supabase/server';
import { requireAdmin } from '../../../lib/auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

interface FeedbackRow {
  id: string;
  professor_id: string;
  student_profile_id: string;
  action: 'interested' | 'not_suitable';
  created_at: string;
}

interface ProfessorRow {
  id: string;
  name: string;
  university: string;
}

interface ProfileRow {
  id: string;
  university_group: string | null;
  gpa: number | null;
}

function pct(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 1000) / 10;
}

function getGpaRange(gpa: number | null): string {
  if (gpa == null) return '< 3.0';
  if (gpa < 3.0) return '< 3.0';
  if (gpa < 3.5) return '3.0-3.5';
  if (gpa < 3.8) return '3.5-3.8';
  if (gpa < 4.0) return '3.8-4.0';
  return '4.0+';
}

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Fetch all feedback
    const { data: feedback, error: fbError } = await db
      .from('professor_feedback')
      .select('id, professor_id, student_profile_id, action, created_at');

    if (fbError) throw fbError;

    const rows: FeedbackRow[] = feedback ?? [];
    const total = rows.length;
    const interestedCount = rows.filter((r) => r.action === 'interested').length;
    const notSuitableCount = rows.filter((r) => r.action === 'not_suitable').length;

    // --- Overview ---
    const overview = {
      total,
      interested_count: interestedCount,
      interested_pct: pct(interestedCount, total),
      not_suitable_count: notSuitableCount,
      not_suitable_pct: pct(notSuitableCount, total),
    };

    // --- By professor ---
    const profIds = Array.from(new Set(rows.map((r) => r.professor_id)));
    let profMap: Record<string, ProfessorRow> = {};

    if (profIds.length > 0) {
      const { data: profs } = await db
        .from('professors')
        .select('id, name, university')
        .in('id', profIds);

      for (const p of profs ?? []) {
        profMap[p.id] = p;
      }
    }

    const profBuckets: Record<string, { interested: number; not_suitable: number }> = {};
    for (const r of rows) {
      if (!profBuckets[r.professor_id]) {
        profBuckets[r.professor_id] = { interested: 0, not_suitable: 0 };
      }
      if (r.action === 'interested') profBuckets[r.professor_id].interested++;
      else profBuckets[r.professor_id].not_suitable++;
    }

    const byProfessor = Object.entries(profBuckets)
      .map(([pid, counts]) => {
        const t = counts.interested + counts.not_suitable;
        const prof = profMap[pid];
        return {
          professor_id: pid,
          professor_name: prof?.name ?? 'Unknown',
          university: prof?.university ?? 'Unknown',
          total: t,
          interested: counts.interested,
          not_suitable: counts.not_suitable,
          interested_rate: pct(counts.interested, t),
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 20);

    // --- By university group & GPA range ---
    const studentIds = Array.from(new Set(rows.map((r) => r.student_profile_id)));
    let profileMap: Record<string, ProfileRow> = {};

    if (studentIds.length > 0) {
      const { data: profiles } = await db
        .from('user_profiles')
        .select('id, university_group, gpa')
        .in('id', studentIds);

      for (const p of profiles ?? []) {
        profileMap[p.id] = p;
      }
    }

    // University group buckets
    const ugBuckets: Record<string, { interested: number; not_suitable: number }> = {};
    for (const r of rows) {
      const ug = profileMap[r.student_profile_id]?.university_group || 'Unknown';
      if (!ugBuckets[ug]) ugBuckets[ug] = { interested: 0, not_suitable: 0 };
      if (r.action === 'interested') ugBuckets[ug].interested++;
      else ugBuckets[ug].not_suitable++;
    }

    const byUniversityGroup = Object.entries(ugBuckets).map(([ug, counts]) => {
      const t = counts.interested + counts.not_suitable;
      return {
        university_group: ug,
        total: t,
        interested: counts.interested,
        not_suitable: counts.not_suitable,
        interested_rate: pct(counts.interested, t),
      };
    });

    // GPA range buckets
    const gpaRangeOrder = ['< 3.0', '3.0-3.5', '3.5-3.8', '3.8-4.0', '4.0+'];
    const gpaBuckets: Record<string, { interested: number; not_suitable: number }> = {};
    for (const range of gpaRangeOrder) {
      gpaBuckets[range] = { interested: 0, not_suitable: 0 };
    }

    for (const r of rows) {
      const gpa = profileMap[r.student_profile_id]?.gpa ?? null;
      const range = getGpaRange(gpa);
      if (r.action === 'interested') gpaBuckets[range].interested++;
      else gpaBuckets[range].not_suitable++;
    }

    const byGpaRange = gpaRangeOrder.map((range) => {
      const counts = gpaBuckets[range];
      const t = counts.interested + counts.not_suitable;
      return {
        range,
        total: t,
        interested: counts.interested,
        not_suitable: counts.not_suitable,
        interested_rate: pct(counts.interested, t),
      };
    });

    // --- Data readiness ---
    const dataReadiness = {
      total_feedback: total,
      ready_for_training: total >= 500,
    };

    return Response.json({
      overview,
      by_professor: byProfessor,
      by_university_group: byUniversityGroup,
      by_gpa_range: byGpaRange,
      data_readiness: dataReadiness,
    });
  } catch (error) {
    console.error('[admin/feedback-report]', error);

    // Table might not exist yet — return zeros
    const emptyOverview = {
      total: 0,
      interested_count: 0,
      interested_pct: 0,
      not_suitable_count: 0,
      not_suitable_pct: 0,
    };

    return Response.json({
      overview: emptyOverview,
      by_professor: [],
      by_university_group: [],
      by_gpa_range: [
        { range: '< 3.0', total: 0, interested: 0, not_suitable: 0, interested_rate: 0 },
        { range: '3.0-3.5', total: 0, interested: 0, not_suitable: 0, interested_rate: 0 },
        { range: '3.5-3.8', total: 0, interested: 0, not_suitable: 0, interested_rate: 0 },
        { range: '3.8-4.0', total: 0, interested: 0, not_suitable: 0, interested_rate: 0 },
        { range: '4.0+', total: 0, interested: 0, not_suitable: 0, interested_rate: 0 },
      ],
      data_readiness: { total_feedback: 0, ready_for_training: false },
    });
  }
}
