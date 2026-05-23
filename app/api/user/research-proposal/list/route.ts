import { getServerUser } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: '请先登录' }, { status: 401 });

    const { data, error } = await db
      .from('generated_documents')
      .select(`
        id, type, title, content, status, professor_id,
        created_at, updated_at,
        professors ( name, university )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const documents = (data ?? []).map((d: Record<string, unknown>) => {
      const prof = d.professors as { name: string; university: string } | null;
      return {
        ...d,
        professor_name: prof?.name ?? null,
        professor_university: prof?.university ?? null,
        professors: undefined,
      };
    });

    return Response.json({ documents });
  } catch (error) {
    console.error('[research-proposal/list]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
