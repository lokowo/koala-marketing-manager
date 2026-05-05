import { supabaseAdmin } from '../../../lib/supabase/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });

    const { data: professor } = await db
      .from('professors')
      .select('*')
      .eq('claimed_by', user.id)
      .maybeSingle();

    if (!professor) return Response.json({ error: 'Not a verified professor' }, { status: 403 });

    let papers: unknown[] = [];
    let grants: unknown[] = [];
    let students: unknown[] = [];
    let letters: unknown[] = [];
    let articles: unknown[] = [];

    try {
      const { data } = await db.from('papers').select('*').eq('professor_id', professor.id).order('citation_count', { ascending: false }).limit(20);
      papers = data || [];
    } catch { /* table may not exist */ }

    try {
      const { data } = await db.from('grants').select('*').eq('professor_id', professor.id).limit(20);
      grants = data || [];
    } catch { /* table may not exist */ }

    try {
      const { data } = await db.from('saved_professors').select('user_id').eq('professor_id', professor.id);
      students = (data || []).map((s: { user_id: string }) => ({ user_id: s.user_id }));
    } catch { /* table may not exist */ }

    try {
      const { data } = await db.from('outreach_emails').select('id, subject_line, email_body, status, created_at').eq('professor_id', professor.id).order('created_at', { ascending: false }).limit(20);
      letters = data || [];
    } catch { /* table may not exist */ }

    try {
      const { data } = await db.from('blog_posts').select('id, title_zh, title_en, category, published_at, created_at').eq('professor_id', professor.id).eq('status', 'published').limit(10);
      articles = data || [];
    } catch { /* table may not exist */ }

    return Response.json({ professor, papers, grants, students, letters, articles });
  } catch (error) {
    console.error('[professor-portal/me]', error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
