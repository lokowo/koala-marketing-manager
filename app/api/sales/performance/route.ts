import { getServerUser, getUserRole } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const role = await getUserRole(user.id);
    if (!role || !['super_admin', 'admin', 'sales'].includes(role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const isAdmin = role === 'admin' || role === 'super_admin';

    // Fetch all QR codes (for team stats) and mine
    const { data: allQrcodes } = await db
      .from('sales_qrcodes')
      .select('sales_user_id, code, channel, label, scan_count, register_count');

    const all = allQrcodes ?? [];
    const mine = all.filter((q: { sales_user_id: string }) => q.sales_user_id === user.id);

    // My stats
    const myScans = mine.reduce((s: number, q: { scan_count: number }) => s + (q.scan_count || 0), 0);
    const myRegisters = mine.reduce((s: number, q: { register_count: number }) => s + (q.register_count || 0), 0);
    const myConversionRate = myScans > 0 ? ((myRegisters / myScans) * 100).toFixed(1) : '0.0';

    // By category
    const surveyItems = mine.filter((q: { channel: string }) => q.channel === 'survey');
    const socialItems = mine.filter((q: { channel: string }) => q.channel !== 'survey');

    const surveyScans = surveyItems.reduce((s: number, q: { scan_count: number }) => s + (q.scan_count || 0), 0);
    const surveyRegisters = surveyItems.reduce((s: number, q: { register_count: number }) => s + (q.register_count || 0), 0);
    const socialScans = socialItems.reduce((s: number, q: { scan_count: number }) => s + (q.scan_count || 0), 0);
    const socialRegisters = socialItems.reduce((s: number, q: { register_count: number }) => s + (q.register_count || 0), 0);

    // Team stats — aggregate by sales_user_id
    const teamMap = new Map<string, { scans: number; registers: number }>();
    for (const q of all) {
      const sid = q.sales_user_id;
      const entry = teamMap.get(sid) ?? { scans: 0, registers: 0 };
      entry.scans += q.scan_count || 0;
      entry.registers += q.register_count || 0;
      teamMap.set(sid, entry);
    }

    const teamTotalScans = all.reduce((s: number, q: { scan_count: number }) => s + (q.scan_count || 0), 0);
    const teamTotalRegisters = all.reduce((s: number, q: { register_count: number }) => s + (q.register_count || 0), 0);
    const teamAvgConversion = teamTotalScans > 0 ? ((teamTotalRegisters / teamTotalScans) * 100).toFixed(1) : '0.0';

    // Rankings
    const teamEntries = [...teamMap.entries()].map(([sid, stats]) => ({
      sales_user_id: sid,
      ...stats,
      conversion: stats.scans > 0 ? stats.registers / stats.scans : 0,
    }));

    const scanRanked = [...teamEntries].sort((a, b) => b.scans - a.scans);
    const registerRanked = [...teamEntries].sort((a, b) => b.registers - a.registers);
    const conversionRanked = [...teamEntries].sort((a, b) => b.conversion - a.conversion);

    const scanRank = scanRanked.findIndex(e => e.sales_user_id === user.id) + 1;
    const registerRank = registerRanked.findIndex(e => e.sales_user_id === user.id) + 1;
    const conversionRank = conversionRanked.findIndex(e => e.sales_user_id === user.id) + 1;

    // Sales leaderboard (for admin view) — fetch display names
    let salesLeaderboard: { name: string; scans: number; registers: number; conversion: string }[] = [];
    if (isAdmin && teamEntries.length > 0) {
      const salesIds = teamEntries.map(e => e.sales_user_id);
      const { data: profiles } = await db
        .from('user_profiles')
        .select('user_id, display_name, email')
        .in('user_id', salesIds);

      const nameMap = new Map<string, string>();
      for (const p of profiles ?? []) {
        nameMap.set(p.user_id, p.display_name || p.email || '未知');
      }

      salesLeaderboard = registerRanked.map(e => ({
        name: nameMap.get(e.sales_user_id) || '未知',
        scans: e.scans,
        registers: e.registers,
        conversion: e.scans > 0 ? ((e.registers / e.scans) * 100).toFixed(1) : '0.0',
      }));
    }

    // By channel breakdown (for admin)
    let channelBreakdown: { channel: string; scans: number; registers: number }[] = [];
    if (isAdmin) {
      const channelMap = new Map<string, { scans: number; registers: number }>();
      for (const q of all) {
        const ch = q.channel || 'other';
        const entry = channelMap.get(ch) ?? { scans: 0, registers: 0 };
        entry.scans += q.scan_count || 0;
        entry.registers += q.register_count || 0;
        channelMap.set(ch, entry);
      }
      channelBreakdown = [...channelMap.entries()]
        .map(([channel, stats]) => ({ channel, ...stats }))
        .sort((a, b) => b.registers - a.registers);
    }

    // AI insight via Claude Haiku
    let aiInsight = '';
    if (myScans > 0) {
      const bestChannel = [...socialItems, ...surveyItems]
        .sort((a: { register_count: number }, b: { register_count: number }) => (b.register_count || 0) - (a.register_count || 0))[0];
      const prompt = `你是销售业绩分析师。根据以下数据给出1-2句简短的分析建议（中文）：
我的扫码：${myScans}，注册：${myRegisters}，转化率：${myConversionRate}%
团队平均扫码：${teamTotalScans > 0 ? Math.round(teamTotalScans / teamMap.size) : 0}，注册：${teamTotalRegisters > 0 ? Math.round(teamTotalRegisters / teamMap.size) : 0}，转化率：${teamAvgConversion}%
我的最佳渠道：${bestChannel?.label || '无'}
只返回建议文字，不要其他内容。`;
      try {
        const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': process.env.ANTHROPIC_API_KEY!,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 150,
            messages: [{ role: 'user', content: prompt }],
          }),
        });
        const aiResult = await aiRes.json();
        aiInsight = aiResult.content?.[0]?.text || '';
      } catch {
        aiInsight = `你的转化率(${myConversionRate}%)${parseFloat(myConversionRate) > parseFloat(teamAvgConversion) ? '高于' : '低于'}团队平均(${teamAvgConversion}%)。`;
      }
    }

    return Response.json({
      my_stats: {
        total_scans: myScans,
        total_registers: myRegisters,
        conversion_rate: myConversionRate,
      },
      my_by_category: {
        survey: {
          scans: surveyScans,
          registers: surveyRegisters,
          items: surveyItems.map((q: { code: string; label: string; scan_count: number; register_count: number }) => ({
            code: q.code,
            label: q.label,
            scans: q.scan_count || 0,
            registers: q.register_count || 0,
          })),
        },
        social: {
          scans: socialScans,
          registers: socialRegisters,
          items: socialItems.map((q: { code: string; channel: string; label: string; scan_count: number; register_count: number }) => ({
            code: q.code,
            channel: q.channel,
            label: q.label,
            scans: q.scan_count || 0,
            registers: q.register_count || 0,
          })),
        },
      },
      team_stats: {
        total_scans: teamTotalScans,
        total_registers: teamTotalRegisters,
        avg_conversion_rate: teamAvgConversion,
        total_sales: teamMap.size,
      },
      my_rank: {
        scan_rank: scanRank || null,
        register_rank: registerRank || null,
        conversion_rank: conversionRank || null,
        total_sales: teamMap.size,
      },
      sales_leaderboard: isAdmin ? salesLeaderboard : undefined,
      channel_breakdown: isAdmin ? channelBreakdown : undefined,
      ai_insight: aiInsight,
    });
  } catch (e) {
    console.error('[sales/performance GET]', e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
