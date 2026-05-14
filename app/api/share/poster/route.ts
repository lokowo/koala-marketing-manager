import { getServerUser } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await db
      .from('user_profiles')
      .select('display_name, referral_code, role')
      .eq('id', user.id)
      .single();

    if (!profile?.referral_code) {
      return Response.json({ error: 'No referral code found' }, { status: 404 });
    }

    const isAdmin = profile.role === 'admin';

    const { data: codeRecord } = await db
      .from('referral_codes')
      .select('uses, max_uses')
      .eq('user_id', user.id)
      .single();

    const uses = codeRecord?.uses || 0;
    const maxUses = codeRecord?.max_uses || 3;

    return Response.json({
      referralCode: profile.referral_code,
      referralUrl: `https://koalaphd.com/koala/auth?ref=${profile.referral_code}`,
      remainingInvites: isAdmin ? -1 : Math.max(0, maxUses - uses),
      displayName: profile.display_name || user.email?.split('@')[0] || 'Koala User',
    });
  } catch (e) {
    console.error('[share/poster]', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
