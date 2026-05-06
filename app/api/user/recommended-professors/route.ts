import { getServerUser } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await db
      .from('user_profiles')
      .select('target_field, target_universities')
      .eq('user_id', user.id)
      .single();

    const { data: savedRows } = await db
      .from('saved_professors')
      .select('professor_id')
      .eq('user_id', user.id);

    const savedIds: string[] = (savedRows ?? []).map((r: { professor_id: string }) => r.professor_id);

    const targetField: string = profile?.target_field ?? '';
    const targetUnis: string[] = profile?.target_universities ?? [];

    let { data: professors } = await db
      .from('professors')
      .select('id, name, university, position_title, research_areas, h_index, opportunity_score, accepting_students')
      .order('opportunity_score', { ascending: false })
      .order('h_index', { ascending: false, nullsFirst: false })
      .limit(30);

    professors = professors ?? [];

    if (savedIds.length > 0) {
      professors = professors.filter((p: { id: string }) => !savedIds.includes(p.id));
    }

    if (targetField || targetUnis.length > 0) {
      const keywords = targetField.toLowerCase().split(/[\s,;]+/).filter(Boolean);

      professors.sort((a: { research_areas: string[]; university: string; opportunity_score: number }, b: { research_areas: string[]; university: string; opportunity_score: number }) => {
        let scoreA = 0;
        let scoreB = 0;
        const areasA = (a.research_areas ?? []).join(' ').toLowerCase();
        const areasB = (b.research_areas ?? []).join(' ').toLowerCase();
        for (const kw of keywords) {
          if (areasA.includes(kw)) scoreA += 10;
          if (areasB.includes(kw)) scoreB += 10;
        }
        if (targetUnis.some(u => a.university.toLowerCase().includes(u.toLowerCase()))) scoreA += 5;
        if (targetUnis.some(u => b.university.toLowerCase().includes(u.toLowerCase()))) scoreB += 5;
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
