import { requireAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

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
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      usersRes,
      blogDraftRes,
      chatMonthRes,
      chatPrevMonthRes,
      revenueMonthRes,
      revenuePrevMonthRes,
      commissionsMonthRes,
      commissionsPendingRes,
      handoffPendingRes,
      agentsRes,
      allCommissionsRes,
      recentLogsRes,
      subsRes,
    ] = await Promise.all([
      db.from('user_profiles').select('id, created_at'),
      db.from('blog_posts').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
      db.from('ai_conversations').select('user_id, created_at', { count: 'exact' }).gte('created_at', monthStart),
      db.from('ai_conversations').select('*', { count: 'exact', head: true }).gte('created_at', prevMonthStart).lt('created_at', monthStart),
      db.from('credit_transactions').select('amount').in('type', ['purchase', 'subscription_credit']).gte('created_at', monthStart),
      db.from('credit_transactions').select('amount').in('type', ['purchase', 'subscription_credit']).gte('created_at', prevMonthStart).lt('created_at', monthStart),
      db.from('sales_commissions').select('commission_amount, status, agent_id').gte('created_at', monthStart),
      db.from('sales_commissions').select('commission_amount', { count: 'exact' }).eq('status', 'confirmed'),
      db.from('ola_handoff_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      db.from('sales_agents').select('id, user_id, user_profiles:user_id(display_name, email)').eq('status', 'active'),
      db.from('sales_commissions').select('agent_id, commission_amount, status').gte('created_at', monthStart).neq('status', 'rejected'),
      db.from('admin_work_logs').select('*, user_profiles!admin_work_logs_admin_profiles_fkey(display_name, email)').order('created_at', { ascending: false }).limit(10),
      db.from('subscriptions').select('tier, status').eq('status', 'active'),
    ]);

    const allUsers = usersRes.data || [];
    const totalUsers = allUsers.length;
    const newUsersMonth = allUsers.filter((u: { created_at: string }) => new Date(u.created_at) >= new Date(monthStart)).length;
    const newUsersPrevMonth = allUsers.filter((u: { created_at: string }) => {
      const d = new Date(u.created_at);
      return d >= new Date(prevMonthStart) && d < new Date(monthStart);
    }).length;

    const chatData = chatMonthRes.data ?? [];
    const mau = new Set(chatData.map((c: { user_id: string }) => c.user_id)).size;

    const revenueMonth = (revenueMonthRes.data ?? []).reduce((s: number, t: { amount: number }) => s + t.amount, 0);
    const revenuePrevMonth = (revenuePrevMonthRes.data ?? []).reduce((s: number, t: { amount: number }) => s + t.amount, 0);

    const allComms = commissionsMonthRes.data ?? [];
    const commissionTotal = allComms.reduce((s: number, c: { commission_amount: number }) => s + (c.commission_amount || 0), 0);

    const pendingComms = commissionsPendingRes.data ?? [];
    const pendingCommissionAmount = pendingComms.reduce((s: number, c: { commission_amount: number }) => s + (c.commission_amount || 0), 0);

    // User trend — daily registrations for last 30 days
    const userTrend: { date: string; registrations: number; active: number }[] = [];
    const convoDates: Record<string, Set<string>> = {};
    for (const c of chatData) {
      const d = new Date(c.created_at ?? now).toISOString().slice(0, 10);
      if (!convoDates[d]) convoDates[d] = new Set();
      convoDates[d].add(c.user_id);
    }

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const label = `${d.getMonth() + 1}/${d.getDate()}`;
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      const regs = allUsers.filter((u: { created_at: string }) => {
        const ud = new Date(u.created_at);
        return ud >= dayStart && ud < dayEnd;
      }).length;
      userTrend.push({
        date: label,
        registrations: regs,
        active: convoDates[dateStr]?.size ?? 0,
      });
    }

    // Sales ranking — top 5 by commission
    const agents = agentsRes.data || [];
    const monthComms = allCommissionsRes.data || [];
    const salesRanking = agents.map((a: { id: string; user_profiles: { display_name: string; email: string } }) => {
      const agentComms = monthComms.filter((c: { agent_id: string }) => c.agent_id === a.id);
      const commission = agentComms.reduce((s: number, c: { commission_amount: number }) => s + (c.commission_amount || 0), 0);
      return {
        display_name: a.user_profiles?.display_name || a.user_profiles?.email || '—',
        commission: Math.round(commission * 100) / 100,
        registrations: agentComms.length,
      };
    }).sort((a: { commission: number }, b: { commission: number }) => b.commission - a.commission).slice(0, 5);

    // Revenue breakdown
    const activeSubs = subsRes.data ?? [];
    const TIER_PRICES: Record<string, number> = { starter: 19.9, pro: 49.0, elite: 99.0 };
    let subscriptionRevenue = 0;
    for (const sub of activeSubs) {
      subscriptionRevenue += TIER_PRICES[sub.tier] || 0;
    }
    const creditsRevenue = revenueMonth;
    const totalRevenue = creditsRevenue + subscriptionRevenue;

    // Recent activity with readable descriptions
    const ACTION_LABELS: Record<string, string> = {
      blog_generate: '生成博客',
      blog_generate_professor: '教授文章',
      professor_create: '新建教授',
      professor_delete: '删除教授',
      customer_update: '客户跟进',
      create_qrcode: '生成推广码',
      customer_registered: '客户注册',
      generate_email_for_customer: '生成套磁信',
      add_customer_note: '客户备注',
      share_qrcode: '分享二维码',
      blog_create: '创建文章',
      blog_update: '更新文章',
      blog_delete: '删除文章',
      survey_create: '创建问卷',
      survey_update: '更新问卷',
      role_update: '角色变更',
      user_update: '更新用户',
    };

    const TYPE_COLORS: Record<string, string> = {
      customer_registered: 'blue',
      survey_create: 'green',
      survey_update: 'green',
      commission: 'orange',
      blog_generate: 'purple',
      blog_create: 'purple',
      blog_update: 'purple',
    };

    const recentActivity = (recentLogsRes.data ?? []).map((l: Record<string, unknown>) => {
      const action = l.action as string;
      const details = l.details as Record<string, unknown> | null;
      const actorName = (l.user_profiles as Record<string, string>)?.display_name || (l.user_profiles as Record<string, string>)?.email || '—';
      const targetName = (l.target_name as string) || (details?.name as string) || (details?.topic as string) || (details?.profName as string) || '';
      const label = ACTION_LABELS[action] || action;
      const description = targetName ? `${label}「${targetName}」` : label;

      return {
        id: l.id,
        time: l.created_at,
        actor_name: actorName,
        action_type: TYPE_COLORS[action] || 'gray',
        description,
      };
    });

    const pctChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    return Response.json({
      kpi: {
        total_users: totalUsers,
        new_users_month: newUsersMonth,
        new_users_prev_month: newUsersPrevMonth,
        new_users_change: pctChange(newUsersMonth, newUsersPrevMonth),
        mau,
        mau_prev: chatPrevMonthRes.count ?? 0,
        mau_change: pctChange(mau, chatPrevMonthRes.count ?? 0),
        revenue_month: Math.round(revenueMonth * 100) / 100,
        revenue_prev_month: Math.round(revenuePrevMonth * 100) / 100,
        revenue_change: pctChange(revenueMonth, revenuePrevMonth),
        commission_total: Math.round(commissionTotal * 100) / 100,
      },
      user_trend: userTrend,
      pending_actions: {
        commissions: { count: commissionsPendingRes.count ?? 0, amount: Math.round(pendingCommissionAmount * 100) / 100 },
        handoff: handoffPendingRes.count ?? 0,
        draft_posts: blogDraftRes.count ?? 0,
      },
      sales_ranking: salesRanking,
      revenue_breakdown: {
        credits: Math.round(creditsRevenue * 100) / 100,
        subscriptions: Math.round(subscriptionRevenue * 100) / 100,
        total: Math.round(totalRevenue * 100) / 100,
      },
      recent_activity: recentActivity,
    });
  } catch (error) {
    console.error('[admin/dashboard-overview]', error);
    return Response.json({ error: (error as Error).message || 'Internal server error' }, { status: 500 });
  }
}
