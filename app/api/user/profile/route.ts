import { getServerUser } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';
import { profileCardToMemories, saveMemories } from '../../../lib/services/memoryService';

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

export async function PUT(req: Request) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      name, university, major, degree_level, gpa, gpa_scale,
      research_interests, publications, english_level,
      target_field, target_degree, career_goal,
      has_research_experience, research_description,
      preferred_universities, preferred_city,
      start_semester, strengths, work_experience,
    } = body as Record<string, unknown>;

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (name !== undefined) updates.display_name = name;
    if (university !== undefined) updates.university = university;
    if (major !== undefined) updates.major = major;
    if (degree_level !== undefined) updates.degree_level = degree_level;
    if (gpa !== undefined) updates.gpa = gpa ? parseFloat(String(gpa)) : null;
    if (gpa_scale !== undefined) updates.gpa_scale = gpa_scale;
    if (english_level !== undefined) updates.english_level = english_level;
    if (target_field !== undefined) updates.target_field = target_field;
    if (career_goal !== undefined) updates.career_goal = career_goal;
    if (has_research_experience !== undefined) updates.has_research_experience = has_research_experience;
    if (research_description !== undefined) updates.research_description = research_description;
    if (preferred_city !== undefined) updates.preferred_city = preferred_city;
    if (start_semester !== undefined) updates.start_semester = start_semester;
    if (strengths !== undefined) updates.strengths = strengths;
    if (work_experience !== undefined) updates.work_experience = work_experience;
    if (preferred_universities !== undefined) updates.target_universities = preferred_universities;
    if (research_interests !== undefined) updates.research_interests = research_interests;
    if (publications !== undefined) updates.publications = publications;
    if (target_degree !== undefined) {
      updates.target_preferences = { ...(typeof body.target_preferences === 'object' ? body.target_preferences : {}), target_degree };
    }
    updates.profile_completed_at = new Date().toISOString();

    // Increment profile_version
    const { data: currentProfile } = await db.from('user_profiles').select('profile_version').eq('id', user.id).single();
    updates.profile_version = (currentProfile?.profile_version ?? 0) + 1;

    // Recalculate completeness using the merged data
    const { data: existing } = await db.from('user_profiles').select('*').eq('id', user.id).single();
    const merged = { ...existing, ...updates };

    const coreFields = ['display_name', 'university', 'major', 'degree_level', 'gpa', 'target_field', 'english_level', 'has_research_experience', 'target_universities'];
    const extendedFields = ['english_test_type', 'english_scores', 'strengths', 'career_goal', 'preferred_city', 'budget', 'start_semester', 'personality_tags', 'work_experience'];
    const isFilled = (f: string) => {
      const v = merged[f];
      if (v === undefined || v === null || v === '') return false;
      if (Array.isArray(v) && v.length === 0) return false;
      if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) return false;
      return true;
    };
    const coreFilled = coreFields.filter(isFilled).length;
    const extFilled = extendedFields.filter(isFilled).length;
    const hasFile = merged.parsed_data || merged.resume_url || merged.file_name;
    updates.profile_completeness = Math.min(
      100,
      Math.round((coreFilled / coreFields.length) * 50) +
      Math.round((extFilled / extendedFields.length) * 40) +
      (hasFile ? 10 : 0),
    );

    const { error } = await db.from('user_profiles').update(updates).eq('id', user.id);
    if (error) throw error;

    // Save ProfileCard data as individual memories (fire-and-forget)
    const memories = profileCardToMemories(body);
    if (memories.length > 0) {
      saveMemories(db, user.id, memories, 'profile_card').catch(err =>
        console.error('[profile→memory]', err)
      );
    }

    return Response.json({ success: true, profile_completeness: updates.profile_completeness });
  } catch (error) {
    console.error('[user/profile PUT]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
