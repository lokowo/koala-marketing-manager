import { supabaseAdmin } from '../../../../lib/supabase/server';
import { requireAdmin } from '../../../../lib/auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const SEED_DEADLINES = [
  {
    university: 'University of Sydney',
    program_type: 'PhD',
    intake_period: 'RP1&2 2027',
    deadline_date: '2026-09-11',
    scholarship_deadline: '2026-09-11',
    description: 'Research Period 1 & 2, 2027 intake',
    year: 2027,
  },
  {
    university: 'University of Sydney',
    program_type: 'PhD',
    intake_period: 'RP3&4 2027',
    deadline_date: '2026-12-18',
    scholarship_deadline: '2026-12-18',
    description: 'Research Period 3 & 4, 2027 intake',
    year: 2027,
  },
  {
    university: 'University of Melbourne',
    program_type: 'PhD',
    intake_period: 'S1 2027',
    deadline_date: '2026-10-31',
    scholarship_deadline: '2026-10-31',
    description: 'Semester 1, 2027 intake',
    year: 2027,
  },
  {
    university: 'UNSW Sydney',
    program_type: 'PhD',
    intake_period: 'T1 2027',
    deadline_date: '2026-09-30',
    scholarship_deadline: '2026-08-31',
    description: 'Term 1, 2027 intake',
    year: 2027,
  },
  {
    university: 'Australian National University',
    program_type: 'PhD',
    intake_period: '2027',
    deadline_date: '2026-08-31',
    scholarship_deadline: '2026-08-31',
    description: '2027 intake',
    year: 2027,
  },
  {
    university: 'University of Queensland',
    program_type: 'PhD',
    intake_period: 'S1 2027',
    deadline_date: '2026-10-15',
    scholarship_deadline: '2026-10-15',
    description: 'Semester 1, 2027 intake',
    year: 2027,
  },
  {
    university: 'Monash University',
    program_type: 'PhD',
    intake_period: 'S1 2027',
    deadline_date: '2026-10-31',
    scholarship_deadline: '2026-10-31',
    description: 'Semester 1, 2027 intake',
    year: 2027,
  },
  {
    university: 'University of Western Australia',
    program_type: 'PhD',
    intake_period: '2027',
    deadline_date: '2026-08-31',
    scholarship_deadline: '2026-08-31',
    description: '2027 intake',
    year: 2027,
  },
  {
    university: 'University of Adelaide',
    program_type: 'PhD',
    intake_period: 'S1 2027',
    deadline_date: '2026-08-31',
    scholarship_deadline: '2026-08-31',
    description: 'Semester 1, 2027 intake',
    year: 2027,
  },
];

export async function POST() {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    let inserted = 0;
    for (const deadline of SEED_DEADLINES) {
      const { data: existing } = await db
        .from('university_deadlines')
        .select('id')
        .eq('university', deadline.university)
        .eq('intake_period', deadline.intake_period)
        .maybeSingle();

      if (!existing) {
        await db.from('university_deadlines').insert(deadline);
        inserted++;
      }
    }

    return Response.json({
      message: `Inserted ${inserted} deadlines (${SEED_DEADLINES.length - inserted} already existed)`,
      inserted,
    });
  } catch (error) {
    console.error('[university-deadlines seed]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
