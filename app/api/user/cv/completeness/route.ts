import { getServerUser } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase/server';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

type SectionStatus = 'complete' | 'partial' | 'empty';

interface SectionResult {
  status: SectionStatus;
  data_count: number;
}

const WEIGHTS: Record<string, number> = {
  personal: 15,
  education: 20,
  research: 20,
  work: 10,
  publications: 10,
  skills: 10,
  awards: 5,
  references: 10,
};

const REQUIRED = ['personal', 'education'];
const RECOMMENDED = ['research', 'work', 'publications', 'skills'];

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: '请先登录' }, { status: 401 });

    const [profileRes, educationRes, workRes] = await Promise.all([
      db.from('user_profiles').select('display_name, email, research_interests, has_research_experience, research_description, has_publications, publication_details').eq('id', user.id).single(),
      db.from('education_history').select('id').eq('user_id', user.id),
      db.from('work_history').select('id').eq('user_id', user.id),
    ]);

    const profile = profileRes.data ?? {};
    const educationRows: unknown[] = educationRes.data ?? [];
    const workRows: unknown[] = workRes.data ?? [];

    const researchInterests: unknown[] = Array.isArray(profile.research_interests) ? profile.research_interests : [];

    const personal: SectionResult = (() => {
      const fields = [profile.display_name, profile.email].filter(Boolean);
      if (profile.display_name && profile.email) return { status: 'complete', data_count: fields.length };
      if (fields.length > 0) return { status: 'partial', data_count: fields.length };
      return { status: 'empty', data_count: 0 };
    })();

    const education: SectionResult = (() => {
      if (educationRows.length >= 1) return { status: 'complete', data_count: educationRows.length };
      return { status: 'empty', data_count: 0 };
    })();

    const research: SectionResult = (() => {
      const hasExperience = profile.has_research_experience === true;
      const hasDescription = !!profile.research_description;
      if (hasExperience || hasDescription) {
        return { status: 'complete', data_count: 1 + researchInterests.length };
      }
      if (researchInterests.length > 0) return { status: 'partial', data_count: researchInterests.length };
      return { status: 'empty', data_count: 0 };
    })();

    const work: SectionResult = (() => {
      if (workRows.length >= 1) return { status: 'complete', data_count: workRows.length };
      return { status: 'empty', data_count: 0 };
    })();

    const publications: SectionResult = (() => {
      if (profile.has_publications === true || !!profile.publication_details) {
        return { status: 'complete', data_count: 1 };
      }
      return { status: 'empty', data_count: 0 };
    })();

    const skills: SectionResult = (() => {
      if (researchInterests.length >= 3) return { status: 'complete', data_count: researchInterests.length };
      if (researchInterests.length > 0) return { status: 'partial', data_count: researchInterests.length };
      return { status: 'empty', data_count: 0 };
    })();

    const awards: SectionResult = { status: 'empty', data_count: 0 };
    const references: SectionResult = { status: 'empty', data_count: 0 };

    const sections: Record<string, SectionResult> = {
      personal,
      education,
      research,
      work,
      publications,
      skills,
      awards,
      references,
    };

    let weightedScore = 0;
    for (const [key, section] of Object.entries(sections)) {
      const w = WEIGHTS[key] ?? 0;
      if (section.status === 'complete') weightedScore += w;
      else if (section.status === 'partial') weightedScore += w / 2;
    }

    const completion_percentage = Math.round(weightedScore);

    const missing_required = REQUIRED.filter(k => sections[k].status !== 'complete');
    const missing_recommended = RECOMMENDED.filter(k => sections[k].status !== 'complete');
    const ready = missing_required.length === 0;

    return Response.json({
      ready,
      missing_required,
      missing_recommended,
      completion_percentage,
      sections,
    });
  } catch (error) {
    console.error('[cv/completeness]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
