import { supabaseAdmin } from '../../../lib/supabase/server';
import { requireAdmin } from '../../../lib/auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [todayRes, weekRes, monthRes, recentRes] = await Promise.all([
      db.from('credit_transactions')
        .select('amount, description, created_at')
        .in('type', ['purchase', 'subscription_credit'])
        .gte('created_at', todayStart),
      db.from('credit_transactions')
        .select('amount, description, created_at')
        .in('type', ['purchase', 'subscription_credit'])
        .gte('created_at', weekStart.toISOString()),
      db.from('credit_transactions')
        .select('amount, description, created_at')
        .in('type', ['purchase', 'subscription_credit'])
        .gte('created_at', monthStart),
      db.from('credit_transactions')
        .select('amount, description, created_at, type, user_id')
        .in('type', ['purchase', 'subscription_credit'])
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    return Response.json({
      today: {
        transactions: todayRes.data?.length ?? 0,
        totalCredits: (todayRes.data ?? []).reduce((s: number, t: { amount: number }) => s + t.amount, 0),
      },
      thisWeek: {
        transactions: weekRes.data?.length ?? 0,
        totalCredits: (weekRes.data ?? []).reduce((s: number, t: { amount: number }) => s + t.amount, 0),
      },
      thisMonth: {
        transactions: monthRes.data?.length ?? 0,
        totalCredits: (monthRes.data ?? []).reduce((s: number, t: { amount: number }) => s + t.amount, 0),
      },
      recentTransactions: recentRes.data ?? [],
    });
  } catch (error) {
    console.error('[admin/revenue]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
