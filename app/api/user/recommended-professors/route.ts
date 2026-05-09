import { getServerUser } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';
import { getStudentContext, extractSearchKeywords } from '../../../lib/server/student-context';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const [studentCtx, savedRes] = await Promise.all([
      getStudentContext(user.id),
      db.from('saved_professors').select('professor_id').eq('user_id', user.id),
    ]);

    const savedIds: string[] = (savedRes.data ?? []).map((r: { professor_id: string }) => r.professor_id);

    const targetField: string = studentCtx?.targetField ?? '';
    const targetUnis: string[] = studentCtx?.targetUniversities ?? [];
    const richKeywords = studentCtx ? extractSearchKeywords(studentCtx) : [];

    let { data: professors } = await db
      .from('professors')
      .select('id, name, university, position_title, research_areas, h_index, opportunity_score, accepting_students')
      .order('opportunity_score', { ascending: false })
      .order('h_index', { ascending: false, nullsFirst: false })
      .limit(50);

    professors = professors ?? [];

    if (savedIds.length > 0) {
      professors = professors.filter((p: { id: string }) => !savedIds.includes(p.id));
    }

    const allKeywords = [
      ...targetField.toLowerCase().split(/[\s,;]+/).filter(Boolean),
      ...richKeywords,
    ];
    const uniqueKeywords = [...new Set(allKeywords)];

    if (uniqueKeywords.length > 0 || targetUnis.length > 0) {
      professors.sort((a: { research_areas: string[]; university: string; opportunity_score: number; accepting_students?: string }, b: { research_areas: string[]; university: string; opportunity_score: number; accepting_students?: string }) => {
        let scoreA = 0;
        let scoreB = 0;
        const areasA = (a.research_areas ?? []).join(' ').toLowerCase();
        const areasB = (b.research_areas ?? []).join(' ').toLowerCase();
        for (const kw of uniqueKeywords) {
          if (areasA.includes(kw)) scoreA += 10;
          if (areasB.includes(kw)) scoreB += 10;
        }
        if (targetUnis.some(u => a.university.toLowerCase().includes(u.toLowerCase()))) scoreA += 5;
        if (targetUnis.some(u => b.university.toLowerCase().includes(u.toLowerCase()))) scoreB += 5;
        if (a.accepting_students === 'yes' || a.accepting_students === 'likely') scoreA += 3;
        if (b.accepting_students === 'yes' || b.accepting_students === 'likely') scoreB += 3;
        scoreA += (a.opportunity_score ?? 0) / 10;
        scoreB += (b.opportunity_score ?? 0) / 10;
        return scoreB - scoreA;
      });
    }

    return Response.json({ professors: professors.slice(0, 6) });
  } catch (error) {
    console.error('[recommended-professors]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
