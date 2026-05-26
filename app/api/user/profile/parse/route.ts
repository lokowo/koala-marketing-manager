import { getServerUser } from '../../../../lib/auth';
import { parseStudentCV } from '../../../../lib/server/profile-parser';
import { supabaseAdmin } from '../../../../lib/supabase/server';
import { getUserTier } from '../../../../lib/services/usageTracker';

const DAILY_PARSE_LIMIT_FREE = 2;

async function getDailyParseCount(userId: string): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabaseAdmin as any)
    .from('user_usage_tracking')
    .select('parse_used')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();
  return (data?.parse_used as number) ?? 0;
}

async function incrementParseCount(userId: string, tier: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabaseAdmin as any;
  const { data: existing } = await db
    .from('user_usage_tracking')
    .select('id, parse_used')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();

  if (existing) {
    await db.from('user_usage_tracking')
      .update({ parse_used: ((existing.parse_used as number) ?? 0) + 1 })
      .eq('id', existing.id);
  } else {
    await db.from('user_usage_tracking')
      .insert({ user_id: userId, date: today, subscription_tier: tier, parse_used: 1 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const tier = await getUserTier(supabaseAdmin, user.id);

    if (tier === 'free') {
      const used = await getDailyParseCount(user.id);
      if (used >= DAILY_PARSE_LIMIT_FREE) {
        return Response.json({
          error: `今日简历解析次数已用完（${used}/${DAILY_PARSE_LIMIT_FREE}），升级订阅可不限次解析`,
          used,
          limit: DAILY_PARSE_LIMIT_FREE,
        }, { status: 403 });
      }
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const profile = await parseStudentCV(buffer);

    await incrementParseCount(user.id, tier).catch(err =>
      console.error('[profile/parse] increment failed:', err)
    );

    return Response.json({ profile, fileName: file.name, fileSize: file.size });
  } catch (error) {
    console.error('[user/profile/parse]', error);
    return Response.json({ error: 'Failed to parse file' }, { status: 500 });
  }
}
