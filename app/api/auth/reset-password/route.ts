import { supabaseAdmin } from '../../../lib/supabase/server';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) return Response.json({ error: 'email required' }, { status: 400 });

    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://koalastudy.net'}/koala/my-profile`,
    });

    if (error) throw error;
    return Response.json({ success: true });
  } catch (error) {
    console.error('[reset-password]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
