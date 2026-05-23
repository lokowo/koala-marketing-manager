import { supabaseAdmin } from '../../../lib/supabase/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

/** Authenticate professor via cookie session and return their record. */
async function authenticateProfessor() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated', status: 401 } as const;

  const { data: professor } = await db
    .from('professors')
    .select('id, name, university')
    .eq('claimed_by', user.id)
    .maybeSingle();

  if (!professor)
    return { error: 'Not a verified professor', status: 403 } as const;

  return { professor } as const;
}

// ---------------------------------------------------------------------------
// GET — list all postings for the authenticated professor
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const auth = await authenticateProfessor();
    if ('error' in auth)
      return Response.json({ error: auth.error }, { status: auth.status });

    const { data: postings, error } = await db
      .from('professor_postings')
      .select('*')
      .eq('professor_id', auth.professor.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[professor/job-posting] GET query error:', error);
      return Response.json(
        { error: 'Failed to fetch postings' },
        { status: 500 },
      );
    }

    return Response.json({ postings: postings ?? [] });
  } catch (error) {
    console.error('[professor/job-posting] GET:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST — create or update a posting
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  try {
    const auth = await authenticateProfessor();
    if ('error' in auth)
      return Response.json({ error: auth.error }, { status: auth.status });

    const body = await req.json();
    const { id, title, description, requirements, deadline } = body as {
      id?: string;
      title?: string;
      description?: string;
      requirements?: string;
      deadline?: string;
    };

    // Validate required fields
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return Response.json({ error: 'Title is required' }, { status: 400 });
    }
    if (title.length > 200) {
      return Response.json(
        { error: 'Title must be 200 characters or fewer' },
        { status: 400 },
      );
    }
    if (
      !description ||
      typeof description !== 'string' ||
      description.trim().length === 0
    ) {
      return Response.json(
        { error: 'Description is required' },
        { status: 400 },
      );
    }
    if (description.length > 2000) {
      return Response.json(
        { error: 'Description must be 2000 characters or fewer' },
        { status: 400 },
      );
    }

    // --- Update existing posting ---
    if (id) {
      // Verify ownership
      const { data: existing } = await db
        .from('professor_postings')
        .select('id')
        .eq('id', id)
        .eq('professor_id', auth.professor.id)
        .maybeSingle();

      if (!existing) {
        return Response.json(
          { error: 'Posting not found or access denied' },
          { status: 404 },
        );
      }

      const { data: posting, error: updateErr } = await db
        .from('professor_postings')
        .update({
          title: title.trim(),
          description: description.trim(),
          requirements: requirements?.trim() || null,
          deadline: deadline || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (updateErr) {
        console.error('[professor/job-posting] update error:', updateErr);
        return Response.json(
          { error: 'Failed to update posting' },
          { status: 500 },
        );
      }

      return Response.json({ posting });
    }

    // --- Create new posting ---
    const { data: posting, error: insertErr } = await db
      .from('professor_postings')
      .insert({
        professor_id: auth.professor.id,
        title: title.trim(),
        description: description.trim(),
        requirements: requirements?.trim() || null,
        deadline: deadline || null,
        status: 'active',
      })
      .select()
      .single();

    if (insertErr) {
      console.error('[professor/job-posting] insert error:', insertErr);
      return Response.json(
        { error: 'Failed to create posting' },
        { status: 500 },
      );
    }

    return Response.json({ posting }, { status: 201 });
  } catch (error) {
    console.error('[professor/job-posting] POST:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH — toggle posting status (active / closed)
// ---------------------------------------------------------------------------
export async function PATCH(req: Request) {
  try {
    const auth = await authenticateProfessor();
    if ('error' in auth)
      return Response.json({ error: auth.error }, { status: auth.status });

    const body = await req.json();
    const { id, status } = body as { id?: string; status?: string };

    if (!id) {
      return Response.json(
        { error: 'Posting id is required' },
        { status: 400 },
      );
    }
    if (status !== 'active' && status !== 'closed') {
      return Response.json(
        { error: 'Status must be "active" or "closed"' },
        { status: 400 },
      );
    }

    // Verify ownership
    const { data: existing } = await db
      .from('professor_postings')
      .select('id')
      .eq('id', id)
      .eq('professor_id', auth.professor.id)
      .maybeSingle();

    if (!existing) {
      return Response.json(
        { error: 'Posting not found or access denied' },
        { status: 404 },
      );
    }

    const { error: updateErr } = await db
      .from('professor_postings')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (updateErr) {
      console.error('[professor/job-posting] PATCH error:', updateErr);
      return Response.json(
        { error: 'Failed to update status' },
        { status: 500 },
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[professor/job-posting] PATCH:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
