import { supabaseAdmin } from '../supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function idempotentCheck(referenceId: string): Promise<boolean> {
  const { data } = await db
    .from('credit_transactions')
    .select('id')
    .eq('reference_id', referenceId)
    .limit(1);

  return (data?.length ?? 0) > 0;
}

export async function addCredits(userId: string, amount: number, type: string, description: string, referenceId: string) {
  const { data: profile } = await db
    .from('user_profiles')
    .select('credits_remaining')
    .eq('id', userId)
    .single();

  const currentBalance = profile?.credits_remaining ?? 0;
  const newBalance = currentBalance + amount;

  await db.from('user_profiles').update({
    credits_remaining: newBalance,
    updated_at: new Date().toISOString(),
  }).eq('id', userId);

  await db.from('credit_transactions').insert({
    user_id: userId,
    amount,
    balance_after: newBalance,
    type,
    description,
    reference_id: referenceId,
  });
}
