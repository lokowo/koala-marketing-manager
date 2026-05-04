import { getServerUser } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { data } = await db
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return Response.json({ profile: data ?? null });
  } catch (error) {
    console.error('[user/profile GET]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    // Calculate profile completeness
    const coreFields = [
      'display_name', 'university', 'major', 'degree_level',
      'gpa', 'target_field', 'english_level',
      'has_research_experience', 'target_universities',
    ];
    const extendedFields = [
      'english_test_type', 'english_scores', 'strengths',
      'career_goal', 'preferred_city', 'budget',
      'start_semester', 'personality_tags', 'work_experience',
    ];
    const mergedForCalc = { ...body };
    const isFilled = (f: string) => {
      const v = mergedForCalc[f];
      if (v === undefined || v === null || v === '') return false;
      if (Array.isArray(v) && v.length === 0) return false;
      if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) return false;
      return true;
    };
    const coreFilled = coreFields.filter(isFilled).length;
    const extFilled = extendedFields.filter(isFilled).length;
    const hasFile = mergedForCalc.parsed_data || mergedForCalc.resume_url || mergedForCalc.file_name;
    // Core fields = 50%, extended = 40%, file = 10%
    const completeness = Math.min(
      100,
      Math.round((coreFilled / coreFields.length) * 50) +
      Math.round((extFilled / extendedFields.length) * 40) +
      (hasFile ? 10 : 0)
    );

    const { error } = await db
      .from('user_profiles')
      .upsert(
        {
          id: user.id,
          email: user.email,
          ...body,
          profile_completeness: completeness,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

    if (error) throw error;
    return Response.json({ success: true, profile_completeness: completeness });
  } catch (error) {
    console.error('[user/profile POST]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
