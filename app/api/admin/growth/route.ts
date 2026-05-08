import { requireAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET() {
  try {
    await requireAdmin();

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const [
      allUsersRes,
      profilesRes,
      conversationsRes,
      outreachRes,
      referralsRes,
      creditsRes,
      qrcodesRes,
    ] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
      db.from('user_profiles').select('id, referred_by, created_at, last_active_at'),
      db.from('ai_conversations').select('user_id, mode, created_at').gte('created_at', sixtyDaysAgo.toISOString()),
      db.from('outreach_emails').select('user_id, created_at').gte('created_at', sixtyDaysAgo.toISOString()),
      db.from('user_profiles').select('referred_by').not('referred_by', 'is', null),
      db.from('credit_transactions').select('user_id, amount, type, created_at').gte('created_at', thirtyDaysAgo.toISOString()),
      db.from('sales_qrcodes').select('sales_user_id, code, scan_count, created_at'),
    ]);

    const users = allUsersRes.data?.users ?? [];
    const profiles = profilesRes.data ?? [];
    const conversations = conversationsRes.data ?? [];
    const outreach = outreachRes.data ?? [];
    const referrals = referralsRes.data ?? [];
    const credits = creditsRes.data ?? [];
    const qrcodes = qrcodesRes.data ?? [];

    // Acquisition channels
    const channels: Record<string, number> = { direct: 0, referral: 0, sales_qr: 0 };
    for (const u of users) {
      const meta = u.user_metadata ?? {};
      if (meta.sales_code) channels.sales_qr = (channels.sales_qr ?? 0) + 1;
      else if (meta.referral_code) channels.referral = (channels.referral ?? 0) + 1;
      else channels.direct = (channels.direct ?? 0) + 1;
    }

    // Weekly cohort retention (last 8 weeks)
    const cohorts: { week: string; total: number; retained: number; rate: string }[] = [];
    for (let w = 7; w >= 0; w--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (w + 1) * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const cohortUsers = users.filter(u => {
        const d = new Date(u.created_at);
        return d >= weekStart && d < weekEnd;
      });

      const retainedIds = new Set<string>();
      for (const c of conversations) {
        if (new Date(c.created_at) >= weekEnd && cohortUsers.some(u => u.id === c.user_id)) {
          retainedIds.add(c.user_id);
        }
      }

      cohorts.push({
        week: weekStart.toISOString().slice(5, 10),
        total: cohortUsers.length,
        retained: retainedIds.size,
        rate: cohortUsers.length > 0 ? ((retainedIds.size / cohortUsers.length) * 100).toFixed(0) : '0',
      });
    }

    // Engagement tiers (last 30 days)
    const userActivity: Record<string, number> = {};
    for (const c of conversations) {
      if (new Date(c.created_at) >= thirtyDaysAgo) {
        userActivity[c.user_id] = (userActivity[c.user_id] ?? 0) + 1;
      }
    }
    const tiers = { power: 0, active: 0, casual: 0, dormant: 0 };
    const activeUserIds = new Set(Object.keys(userActivity));
    for (const [, count] of Object.entries(userActivity)) {
      if (count >= 20) tiers.power++;
      else if (count >= 5) tiers.active++;
      else tiers.casual++;
    }
    tiers.dormant = users.length - activeUserIds.size;

    // Referral funnel
    const referralStats = {
      totalReferrers: new Set(referrals.map((r: { referred_by: string }) => r.referred_by)).size,
      totalReferred: referrals.length,
      referralRate: users.length > 0 ? ((referrals.length / users.length) * 100).toFixed(1) : '0',
    };

    // Revenue/credits in period
    const creditStats = {
      totalSpent: credits.filter((c: { type: string; amount: number }) => c.type === 'spend').reduce((s: number, c: { amount: number }) => s + Math.abs(c.amount), 0),
      totalEarned: credits.filter((c: { type: string; amount: number }) => c.type.startsWith('earn')).reduce((s: number, c: { amount: number }) => s + c.amount, 0),
      purchaseCount: credits.filter((c: { type: string }) => c.type === 'purchase').length,
      spenders: new Set(credits.filter((c: { type: string }) => c.type === 'spend').map((c: { user_id: string }) => c.user_id)).size,
    };

    // QR code performance
    const qrStats = qrcodes
      .sort((a: { scan_count: number }, b: { scan_count: number }) => (b.scan_count ?? 0) - (a.scan_count ?? 0))
      .slice(0, 10)
      .map((q: { code: string; scan_count: number; sales_user_id: string }) => ({
        code: q.code,
        scans: q.scan_count ?? 0,
        salesUserId: q.sales_user_id,
      }));

    // 30d vs prev 30d comparison
    const recentUsers = users.filter(u => new Date(u.created_at) >= thirtyDaysAgo).length;
    const prevUsers = users.filter(u => {
      const d = new Date(u.created_at);
      return d >= sixtyDaysAgo && d < thirtyDaysAgo;
    }).length;
    const recentConvos = conversations.filter((c: { created_at: string }) => new Date(c.created_at) >= thirtyDaysAgo).length;
    const prevConvos = conversations.filter((c: { created_at: string }) => {
      const d = new Date(c.created_at);
      return d >= sixtyDaysAgo && d < thirtyDaysAgo;
    }).length;
    const recentOutreach = outreach.filter((o: { created_at: string }) => new Date(o.created_at) >= thirtyDaysAgo).length;
    const prevOutreach = outreach.filter((o: { created_at: string }) => {
      const d = new Date(o.created_at);
      return d >= sixtyDaysAgo && d < thirtyDaysAgo;
    }).length;

    return Response.json({
      overview: {
        totalUsers: users.length,
        newUsers30d: recentUsers,
        newUsersPrev30d: prevUsers,
        conversations30d: recentConvos,
        conversationsPrev30d: prevConvos,
        outreach30d: recentOutreach,
        outreachPrev30d: prevOutreach,
      },
      channels,
      cohorts,
      tiers,
      referralStats,
      creditStats,
      qrStats,
    });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === 'Unauthorized') return Response.json({ error: msg }, { status: 401 });
    if (msg === 'Forbidden') return Response.json({ error: msg }, { status: 403 });
    console.error('[admin/growth GET]', e);
    return Response.json({ error: msg }, { status: 500 });
  }
}
