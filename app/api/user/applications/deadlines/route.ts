import { getServerUser } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: apps } = await db
      .from('applications')
      .select('university')
      .eq('user_id', user.id);

    const universities = [...new Set((apps ?? []).map((a: { university: string | null }) => a.university).filter(Boolean))] as string[];

    if (universities.length === 0) {
      return Response.json({ deadlines: [] });
    }

    const { data: deadlines } = await db
      .from('university_deadlines')
      .select('university, deadline_date, program_type, description')
      .in('university', universities)
      .gte('deadline_date', new Date().toISOString().split('T')[0])
      .order('deadline_date');

    return Response.json({ deadlines: deadlines ?? [] });
  } catch (error) {
    console.error('[user/applications/deadlines GET]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
