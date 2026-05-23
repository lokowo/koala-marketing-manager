import { supabaseAdmin } from '../../../lib/supabase/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { notifyUser } from '../../../lib/notifications';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function POST(req: Request) {
  try {
    // Authenticate professor via cookie-based session
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return Response.json({ error: 'Not authenticated' }, { status: 401 });

    // Look up professor record
    const { data: professor } = await db
      .from('professors')
      .select('id, name, university')
      .eq('claimed_by', user.id)
      .maybeSingle();

    if (!professor)
      return Response.json(
        { error: 'Not a verified professor' },
        { status: 403 },
      );

    // Parse request body
    const body = await req.json();
    const { studentProfileId, action } = body as {
      studentProfileId?: string;
      action?: string;
    };

    if (!studentProfileId || !action) {
      return Response.json(
        { error: 'Missing studentProfileId or action' },
        { status: 400 },
      );
    }

    if (action !== 'interested' && action !== 'not_suitable') {
      return Response.json(
        { error: 'Action must be "interested" or "not_suitable"' },
        { status: 400 },
      );
    }

    // Insert feedback record
    const { error: insertErr } = await db.from('professor_feedback').insert({
      professor_id: professor.id,
      student_profile_id: studentProfileId,
      action,
    });

    if (insertErr) {
      console.error('[professor/feedback] insert error:', insertErr);
      return Response.json(
        { error: 'Failed to save feedback' },
        { status: 500 },
      );
    }

    // If interested, notify the student
    if (action === 'interested') {
      const title = '导师关注通知';
      const content = `Prof. ${professor.name} (${professor.university}) 对你的学术背景感兴趣！`;
      await notifyUser(studentProfileId, title, content, 'professor_interest', '/koala/my-profile');
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[professor/feedback]', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// GET: retrieve feedback stats for the current professor
export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return Response.json({ error: 'Not authenticated' }, { status: 401 });

    const { data: professor } = await db
      .from('professors')
      .select('id')
      .eq('claimed_by', user.id)
      .maybeSingle();

    if (!professor)
      return Response.json(
        { error: 'Not a verified professor' },
        { status: 403 },
      );

    let allFeedback: { action: string }[] = [];
    try {
      const { data } = await db
        .from('professor_feedback')
        .select('action')
        .eq('professor_id', professor.id);
      allFeedback = data ?? [];
    } catch {
      // Table may not exist yet
    }

    const viewed = allFeedback.length;
    const interested = allFeedback.filter(
      (f: { action: string }) => f.action === 'interested',
    ).length;

    return Response.json({ viewed, interested });
  } catch (error) {
    console.error('[professor/feedback] GET:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
