import { supabaseAdmin } from '../../../lib/supabase/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

interface StudentProfile {
  id: string;
  display_name: string | null;
  university: string | null;
  major: string | null;
  degree_level: string | null;
  target_field: string | null;
  research_interests: string[] | null;
  research_description: string | null;
  gpa: number | null;
  gpa_scale: string | null;
  has_publications: boolean | null;
  publication_details: string | null;
  has_research_experience: boolean | null;
  profile_completed_at: string | null;
}

interface MatchedStudent {
  id: string;
  display_name: string;
  university: string | null;
  major: string | null;
  degree_level: string | null;
  research_interests: string[] | null;
  gpa: number | null;
  has_publications: boolean | null;
  publication_details: string | null;
  target_field: string | null;
  match_score: number;
  match_reason: string;
}

function anonymizeName(name: string | null): string {
  if (!name || name.trim().length === 0) return '匿名学生';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    // Single name: first char + ***
    return parts[0][0] + '***';
  }
  // Multi-part: initials of first parts + full last name
  const initials = parts.slice(0, -1).map(p => p[0] + '.').join('');
  return initials + ' ' + parts[parts.length - 1];
}

function computeMatch(
  professorAreas: string[],
  student: StudentProfile,
): { score: number; reason: string } {
  const profKeywords = professorAreas
    .flatMap(a => a.toLowerCase().split(/[\s,;/()]+/))
    .filter(w => w.length >= 2);

  const studentTexts: string[] = [];
  if (student.target_field) studentTexts.push(student.target_field.toLowerCase());
  if (student.research_interests) {
    studentTexts.push(...student.research_interests.map(r => r.toLowerCase()));
  }
  if (student.research_description) {
    studentTexts.push(student.research_description.toLowerCase());
  }

  const studentKeywords = studentTexts
    .flatMap(t => t.split(/[\s,;/()]+/))
    .filter(w => w.length >= 2);
  const studentJoined = studentTexts.join(' ');

  if (profKeywords.length === 0 || studentKeywords.length === 0) {
    return { score: 70, reason: '该学生正在寻找相关领域的导师' };
  }

  // Exact area match: check if any full research area appears in student text
  const hasExactMatch = professorAreas.some(area =>
    studentJoined.includes(area.toLowerCase()),
  );
  if (hasExactMatch) {
    const matchedArea = professorAreas.find(area =>
      studentJoined.includes(area.toLowerCase()),
    );
    return {
      score: 100,
      reason: `研究方向高度吻合：${matchedArea}`,
    };
  }

  // Partial keyword overlap
  const matchedKeywords = profKeywords.filter(kw =>
    studentKeywords.some(sk => sk.includes(kw) || kw.includes(sk)),
  );
  const overlapRatio = matchedKeywords.length / Math.max(profKeywords.length, 1);

  if (overlapRatio >= 0.4) {
    return {
      score: 85 + Math.round(overlapRatio * 10),
      reason: `研究关键词匹配：${[...new Set(matchedKeywords)].slice(0, 3).join('、')}`,
    };
  }

  if (matchedKeywords.length > 0) {
    return {
      score: 75 + Math.round(overlapRatio * 15),
      reason: `存在部分研究方向重叠：${matchedKeywords.slice(0, 2).join('、')}`,
    };
  }

  return { score: 70, reason: '该学生正在寻找相关领域的导师' };
}

export async function GET() {
  try {
    // Authenticate professor via cookie-based session
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return Response.json({ error: 'Not authenticated' }, { status: 401 });

    // Look up professor record claimed by this auth user
    const { data: professor } = await db
      .from('professors')
      .select('id, name, university, research_areas')
      .eq('claimed_by', user.id)
      .maybeSingle();

    if (!professor)
      return Response.json(
        { error: 'Not a verified professor' },
        { status: 403 },
      );

    const researchAreas: string[] = professor.research_areas ?? [];

    // Get student IDs already reviewed by this professor
    let excludeIds: string[] = [];
    try {
      const { data: feedbackRows } = await db
        .from('professor_feedback')
        .select('student_profile_id')
        .eq('professor_id', professor.id);
      excludeIds = (feedbackRows ?? []).map(
        (r: { student_profile_id: string }) => r.student_profile_id,
      );
    } catch {
      // Table may not exist yet — continue with empty excludes
    }

    // Fetch students with completed profiles
    const { data: students, error: studentsErr } = await db
      .from('user_profiles')
      .select(
        'id, display_name, university, major, degree_level, target_field, research_interests, research_description, gpa, gpa_scale, has_publications, publication_details, has_research_experience, profile_completed_at',
      )
      .not('profile_completed_at', 'is', null)
      .limit(100);

    if (studentsErr) {
      console.error('[recommended-students] query error:', studentsErr);
      return Response.json({ error: 'Failed to query students' }, { status: 500 });
    }

    // Filter out already-reviewed students
    let candidates: StudentProfile[] = (students ?? []).filter(
      (s: StudentProfile) => !excludeIds.includes(s.id),
    );

    // Score and rank
    const matched: MatchedStudent[] = candidates.map((s: StudentProfile) => {
      const { score, reason } = computeMatch(researchAreas, s);
      return {
        id: s.id,
        display_name: anonymizeName(s.display_name),
        university: s.university,
        major: s.major,
        degree_level: s.degree_level,
        research_interests: s.research_interests,
        gpa: s.gpa,
        has_publications: s.has_publications,
        publication_details: s.publication_details,
        target_field: s.target_field,
        match_score: score,
        match_reason: reason,
      };
    });

    // Sort by match_score descending, take top 10
    matched.sort((a, b) => b.match_score - a.match_score);
    const top10 = matched.slice(0, 10);

    return Response.json({ students: top10 });
  } catch (error) {
    console.error('[recommended-students]', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
