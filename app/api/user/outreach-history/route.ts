import { getServerUser } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await db
      .from('outreach_emails')
      .select(`
        id, subject_line, tone, purpose, status,
        credits_used, was_free, sent_at, created_at,
        professors (id, name, university)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return Response.json({ emails: data ?? [] });
  } catch (error) {
    console.error('[outreach-history GET]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
