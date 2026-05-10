import type { NextRequest } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const filter = searchParams.get('filter') || 'all';
    const page = Math.max(parseInt(searchParams.get('page') ?? '1', 10), 1);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);
    const offset = (page - 1) * limit;

    // Use server-side counts on Verified professors only
    const [totalRes, emailRes, facultyRes, profileRes, scholarRes] = await Promise.all([
      db.from('professors').select('id', { count: 'exact', head: true }).eq('verification_status', 'Verified'),
      db.from('professors').select('id', { count: 'exact', head: true }).eq('verification_status', 'Verified').or('email.is.null,email.eq.'),
      db.from('professors').select('id', { count: 'exact', head: true }).eq('verification_status', 'Verified').or('faculty.is.null,faculty.eq.'),
      db.from('professors').select('id', { count: 'exact', head: true }).eq('verification_status', 'Verified').or('profile_url.is.null,profile_url.eq.'),
      db.from('professors').select('id', { count: 'exact', head: true }).eq('verification_status', 'Verified').or('google_scholar_url.is.null,google_scholar_url.eq.'),
    ]);

    const total = totalRes.count ?? 0;
    const missingEmail = emailRes.count ?? 0;
    const missingFaculty = facultyRes.count ?? 0;
    const missingProfile = profileRes.count ?? 0;
    const missingScholar = scholarRes.count ?? 0;
    const complete = total - Math.max(missingEmail, missingFaculty, missingProfile, missingScholar);

    const stats = { total, missingEmail, missingFaculty, missingProfile, missingScholar, noPapers: 0, noGrants: 0, complete };

    // Fetch paginated issues list (Verified only)
    let issueQuery = db
      .from('professors')
      .select('id, name, university, email, faculty, profile_url, google_scholar_url, semantic_scholar_id')
      .eq('verification_status', 'Verified')
      .order('name', { ascending: true });

    switch (filter) {
      case 'missing_email':
        issueQuery = issueQuery.or('email.is.null,email.eq.');
        break;
      case 'missing_faculty':
        issueQuery = issueQuery.or('faculty.is.null,faculty.eq.');
        break;
      case 'missing_profile':
        issueQuery = issueQuery.or('profile_url.is.null,profile_url.eq.');
        break;
      case 'missing_scholar':
        issueQuery = issueQuery.or('semantic_scholar_id.is.null,semantic_scholar_id.eq.');
        break;
      default:
        // All issues — any field missing
        issueQuery = issueQuery.or('email.is.null,email.eq.,faculty.is.null,faculty.eq.,profile_url.is.null,profile_url.eq.,google_scholar_url.is.null,google_scholar_url.eq.');
        break;
    }

    const { data: professors, count: issueCount } = await issueQuery
      .range(offset, offset + limit - 1)
      .select('id, name, university, email, faculty, profile_url, google_scholar_url, semantic_scholar_id', { count: 'exact' });

    const issues = (professors ?? []).map((p: Record<string, string | null>) => {
      const probs: string[] = [];
      if (!p.email) probs.push('缺 email');
      if (!p.faculty) probs.push('缺 faculty');
      if (!p.google_scholar_url) probs.push('缺 scholar');
      return { id: p.id, name: p.name, university: p.university, issues: probs };
    });

    return Response.json({
      stats,
      issues,
      pagination: {
        page,
        limit,
        total: issueCount ?? issues.length,
        totalPages: Math.ceil((issueCount ?? issues.length) / limit),
      },
    });
  } catch (error) {
    console.error('[admin/quality]', error);
    return Response.json({ stats: null, issues: [] });
  }
}
