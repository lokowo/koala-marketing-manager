import { type NextRequest } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

function generateSlug(name: string, university: string): string {
  const namePart = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-');

  const uniWords = university.toLowerCase().replace(/university of |the /g, '').trim().split(/\s+/);
  const uniAbbr = uniWords.length >= 2
    ? uniWords.map((w) => w[0]).join('')
    : uniWords[0]?.slice(0, 4) ?? 'au';

  return `${namePart}-${uniAbbr}`;
}

export async function POST(request: NextRequest) {
  try {
    const { email, code } = (await request.json()) as { email?: string; code?: string };

    if (!email || !code) {
      return Response.json({ error: 'Missing email or code' }, { status: 400 });
    }

    const normalised = email.toLowerCase().trim();

    const { data: professor } = await db
      .from('professors')
      .select('id, name, university, verification_code, verification_code_expires, is_verified')
      .eq('email', normalised)
      .maybeSingle();

    if (!professor) {
      return Response.json({ error: 'Professor not found' }, { status: 404 });
    }

    if (professor.is_verified) {
      return Response.json({ error: 'Already verified' }, { status: 409 });
    }

    if (professor.verification_code !== code) {
      return Response.json({ error: 'Invalid verification code' }, { status: 400 });
    }

    if (professor.verification_code_expires && new Date(professor.verification_code_expires) < new Date()) {
      return Response.json({ error: 'Verification code expired' }, { status: 400 });
    }

    // Generate unique slug
    let slug = generateSlug(professor.name, professor.university);
    const { data: existing } = await db
      .from('professors')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (existing && existing.id !== professor.id) {
      slug = `${slug}-${professor.id.slice(0, 6)}`;
    }

    await db.from('professors').update({
      is_verified: true,
      verified_at: new Date().toISOString(),
      verified_email: normalised,
      slug,
      verification_code: null,
      verification_code_expires: null,
    }).eq('id', professor.id);

    return Response.json({
      success: true,
      slug,
      dashboardUrl: '/koala/professor-portal',
      profileUrl: `/professor/${slug}`,
    });
  } catch (e) {
    console.error('[professor/verify]', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
