import { type SupabaseClient } from '@supabase/supabase-js';

// ─── Tier-based usage limits ────────────────────────────────────────────────

type ActionType = 'chat' | 'voice' | 'match' | 'email' | 'cv' | 'research_proposal' | 'recommendation_letter';
type Tier = 'free' | 'starter' | 'pro' | 'elite';
type Period = 'daily' | 'monthly' | 'total';
type PrivilegedRole = 'sales' | 'admin' | 'super_admin';

interface LimitConfig {
  limit: number; // -1 = unlimited
  period: Period;
  column: string;
}

const TIER_LIMITS: Record<Tier, Record<ActionType, LimitConfig>> = {
  free: {
    chat:  { limit: 10, period: 'daily',  column: 'chat_turns_used' },
    voice: { limit: 5,  period: 'daily',  column: 'voice_inputs_used' },
    match: { limit: 3,  period: 'daily',  column: 'matches_used' },
    email: { limit: 1,  period: 'monthly', column: 'emails_generated' },
    cv:    { limit: 1,  period: 'total',  column: 'cv_generated' },
    research_proposal: { limit: 1, period: 'total', column: 'proposals_generated' },
    recommendation_letter: { limit: 1, period: 'total', column: 'rec_letters_generated' },
  },
  starter: {
    chat:  { limit: -1, period: 'daily',  column: 'chat_turns_used' },
    voice: { limit: -1, period: 'daily',  column: 'voice_inputs_used' },
    match: { limit: 10, period: 'daily',  column: 'matches_used' },
    email: { limit: 5,  period: 'monthly', column: 'emails_generated' },
    cv:    { limit: 3,  period: 'total',  column: 'cv_generated' },
    research_proposal: { limit: 3, period: 'total', column: 'proposals_generated' },
    recommendation_letter: { limit: 3, period: 'total', column: 'rec_letters_generated' },
  },
  pro: {
    chat:  { limit: -1, period: 'daily',  column: 'chat_turns_used' },
    voice: { limit: -1, period: 'daily',  column: 'voice_inputs_used' },
    match: { limit: 10, period: 'daily',  column: 'matches_used' },
    email: { limit: 15, period: 'monthly', column: 'emails_generated' },
    cv:    { limit: -1, period: 'total',  column: 'cv_generated' },
    research_proposal: { limit: -1, period: 'total', column: 'proposals_generated' },
    recommendation_letter: { limit: -1, period: 'total', column: 'rec_letters_generated' },
  },
  elite: {
    chat:  { limit: -1, period: 'daily',  column: 'chat_turns_used' },
    voice: { limit: -1, period: 'daily',  column: 'voice_inputs_used' },
    match: { limit: -1, period: 'daily',  column: 'matches_used' },
    email: { limit: -1, period: 'monthly', column: 'emails_generated' },
    cv:    { limit: -1, period: 'total',  column: 'cv_generated' },
    research_proposal: { limit: -1, period: 'total', column: 'proposals_generated' },
    recommendation_letter: { limit: -1, period: 'total', column: 'rec_letters_generated' },
  },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: SupabaseClient): any { return supabase; }

async function getPrivilegedRole(
  supabase: SupabaseClient,
  userId: string,
): Promise<PrivilegedRole | null> {
  const { data: roleRow, error } = await db(supabase)
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !roleRow) return null;

  const role = roleRow.role as string;
  if (!['sales', 'admin', 'super_admin'].includes(role)) return null;

  if (role === 'sales') {
    const { data: agent } = await db(supabase)
      .from('sales_agents')
      .select('is_active')
      .eq('user_id', userId)
      .maybeSingle();
    if (!agent?.is_active) return null;
  }

  return role as PrivilegedRole;
}

async function getUserTier(supabase: SupabaseClient, userId: string): Promise<Tier> {
  const privileged = await getPrivilegedRole(supabase, userId);
  if (privileged === 'admin' || privileged === 'super_admin') return 'elite';
  if (privileged === 'sales') return 'pro';

  const { data } = await db(supabase)
    .from('user_profiles')
    .select('plan_type')
    .eq('id', userId)
    .single();
  const plan = data?.plan_type as string | null;
  if (plan && ['starter', 'pro', 'elite'].includes(plan)) return plan as Tier;
  return 'free';
}

async function getDailyUsage(
  supabase: SupabaseClient,
  userId: string,
  column: string,
): Promise<number> {
  const { data } = await db(supabase)
    .from('user_usage_tracking')
    .select(column)
    .eq('user_id', userId)
    .eq('date', todayDate())
    .maybeSingle();
  return (data?.[column] as number) ?? 0;
}

async function getMonthlyUsage(
  supabase: SupabaseClient,
  userId: string,
  column: string,
): Promise<number> {
  const { data } = await db(supabase)
    .from('user_usage_tracking')
    .select(column)
    .eq('user_id', userId)
    .gte('date', monthStart())
    .lte('date', todayDate());
  if (!data || data.length === 0) return 0;
  return data.reduce((sum: number, row: Record<string, unknown>) => sum + ((row[column] as number) ?? 0), 0);
}

async function getTotalUsage(
  supabase: SupabaseClient,
  userId: string,
  column: string,
): Promise<number> {
  const { data } = await db(supabase)
    .from('user_usage_tracking')
    .select(column)
    .eq('user_id', userId);
  if (!data || data.length === 0) return 0;
  return data.reduce((sum: number, row: Record<string, unknown>) => sum + ((row[column] as number) ?? 0), 0);
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function checkUsage(
  supabase: SupabaseClient,
  userId: string,
  actionType: string,
): Promise<{ allowed: boolean; used: number; limit: number }> {
  try {
    const tier = await getUserTier(supabase, userId);
    const action = actionType as ActionType;
    const config = TIER_LIMITS[tier]?.[action];
    if (!config) return { allowed: true, used: 0, limit: -1 };

    if (config.limit === -1) return { allowed: true, used: 0, limit: -1 };

    let used: number;
    if (config.period === 'daily') {
      used = await getDailyUsage(supabase, userId, config.column);
    } else if (config.period === 'monthly') {
      used = await getMonthlyUsage(supabase, userId, config.column);
    } else {
      used = await getTotalUsage(supabase, userId, config.column);
    }

    return { allowed: used < config.limit, used, limit: config.limit };
  } catch (error) {
    console.error('[usageTracker] checkUsage error:', error);
    return { allowed: true, used: 0, limit: -1 };
  }
}

export async function incrementUsage(
  supabase: SupabaseClient,
  userId: string,
  actionType: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    const action = actionType as ActionType;
    const tier = await getUserTier(supabase, userId);
    const config = TIER_LIMITS[tier]?.[action] ?? TIER_LIMITS.free[action];
    if (!config) return;

    const today = todayDate();
    const column = config.column;

    // Upsert today's row, incrementing the counter
    const { data: existing } = await db(supabase)
      .from('user_usage_tracking')
      .select('id, ' + column)
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();

    if (existing) {
      const currentVal = (existing[column] as number) ?? 0;
      await db(supabase)
        .from('user_usage_tracking')
        .update({ [column]: currentVal + 1 })
        .eq('id', existing.id);
    } else {
      await db(supabase)
        .from('user_usage_tracking')
        .insert({
          user_id: userId,
          date: today,
          subscription_tier: tier,
          [column]: 1,
        });
    }
  } catch (error) {
    console.error('[usageTracker] incrementUsage error:', error);
  }
}

export { TIER_LIMITS, getUserTier, getPrivilegedRole, type Tier, type ActionType };
