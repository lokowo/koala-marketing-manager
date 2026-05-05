import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET() {
  try {
    const { data: professors } = await db
      .from('professors')
      .select('id, name, university, email, faculty, profile_url, google_scholar_url');

    if (!professors) {
      return Response.json({ stats: null, issues: [] });
    }

    let missingEmail = 0;
    let missingFaculty = 0;
    let missingProfile = 0;
    let missingScholar = 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const issues: { id: string; name: string; university: string; issues: string[] }[] = [];

    for (const p of professors) {
      const probs: string[] = [];
      if (!p.email) { missingEmail++; probs.push('missing_email'); }
      if (!p.faculty) { missingFaculty++; probs.push('missing_faculty'); }
      if (!p.profile_url) { missingProfile++; probs.push('missing_profile_url'); }
      if (!p.google_scholar_url) { missingScholar++; probs.push('missing_scholar'); }
      if (probs.length > 0) {
        issues.push({ id: p.id, name: p.name, university: p.university, issues: probs });
      }
    }

    const total = professors.length;
    const complete = total - issues.length;

    return Response.json({
      stats: { total, missingEmail, missingFaculty, missingProfile, missingScholar, noPapers: 0, noGrants: 0, complete },
      issues,
    });
  } catch (error) {
    console.error('[admin/quality]', error);
    return Response.json({ stats: null, issues: [] });
  }
}
