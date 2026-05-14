import { NextRequest } from 'next/server';
import { getServerUser, getUserRole } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidResponse(r: { status: string; respondent_name: string | null; respondent_email: string | null }) {
  return r.status === 'completed' && !!r.respondent_name && !!r.respondent_email && EMAIL_RE.test(r.respondent_email);
}

export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const role = await getUserRole(user.id);
    if (!role || !['super_admin', 'admin'].includes(role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const surveyId = req.nextUrl.searchParams.get('survey_id');
    const salesId = req.nextUrl.searchParams.get('sales_id');

    if (surveyId && salesId) {
      if (role !== 'super_admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      return Response.json(await getClientDetails(surveyId, salesId));
    }
    if (surveyId) {
      if (role !== 'super_admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      return Response.json(await getSalesBreakdown(surveyId));
    }
    return Response.json(await getSurveyOverview(role));
  } catch (e) {
    console.error('[survey-overview GET]', e);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}

// ─── Layer 1: All-survey overview ───────────────────────────────────────────

async function getSurveyOverview(role: string) {
  const { data: surveys } = await db.from('surveys')
    .select('id, title_zh, status, created_at')
    .order('created_at', { ascending: false });

  if (!surveys || surveys.length === 0) {
    return {
      summary: { total_surveys: 0, active_surveys: 0, ended_surveys: 0, total_valid_responses: 0, total_registrations: 0, active_sales_count: 0 },
      surveys: [],
    };
  }

  const surveyIds = surveys.map((s: { id: string }) => s.id);

  const { data: allResponses } = await db.from('survey_responses')
    .select('id, survey_id, status, respondent_name, respondent_email, registered_user_id, sales_user_id')
    .in('survey_id', surveyIds);

  const { data: allLinks } = await db.from('survey_share_links')
    .select('survey_id, scan_count, sales_user_id')
    .in('survey_id', surveyIds);

  const responses = allResponses || [];
  const links = allLinks || [];

  const activeSalesSet = new Set<string>();
  let totalValid = 0;
  let totalRegistrations = 0;

  const surveyRows = surveys.map((s: { id: string; title_zh: string; status: string }) => {
    const sResponses = responses.filter((r: { survey_id: string }) => r.survey_id === s.id);
    const sLinks = links.filter((l: { survey_id: string }) => l.survey_id === s.id);

    const totalScans = sLinks.reduce((sum: number, l: { scan_count: number }) => sum + (l.scan_count || 0), 0);
    const completed = sResponses.filter((r: { status: string }) => r.status === 'completed');
    const valid = completed.filter((r: { status: string; respondent_name: string | null; respondent_email: string | null }) => isValidResponse(r));
    const invalid = completed.length - valid.length;
    const registrations = sResponses.filter((r: { registered_user_id: string | null }) => !!r.registered_user_id).length;

    const salesUsers = new Set(sLinks.map((l: { sales_user_id: string }) => l.sales_user_id).filter(Boolean));
    salesUsers.forEach((id) => activeSalesSet.add(id as string));

    totalValid += valid.length;
    totalRegistrations += registrations;

    const row: Record<string, unknown> = {
      id: s.id,
      title: s.title_zh || s.id,
      status: s.status === 'active' ? '进行中' : '已结束',
      total_scans: totalScans,
      total_responses: completed.length,
      valid_responses: valid.length,
      invalid_responses: invalid,
      completion_rate: completed.length > 0 ? Math.round((valid.length / completed.length) * 100) : 0,
      registrations,
      registration_rate: valid.length > 0 ? Math.round((registrations / valid.length) * 100) : 0,
    };

    if (role === 'super_admin') {
      row.sales_count = salesUsers.size;
    }

    return row;
  });

  const summary: Record<string, unknown> = {
    total_surveys: surveys.length,
    active_surveys: surveys.filter((s: { status: string }) => s.status === 'active').length,
    ended_surveys: surveys.filter((s: { status: string }) => s.status !== 'active').length,
    total_valid_responses: totalValid,
    total_registrations: totalRegistrations,
  };

  if (role === 'super_admin') {
    summary.active_sales_count = activeSalesSet.size;
  }

  return { summary, surveys: surveyRows };
}

// ─── Layer 2: Sales breakdown per survey ────────────────────────────────────

async function getSalesBreakdown(surveyId: string) {
  const { data: survey } = await db.from('surveys')
    .select('id, title_zh').eq('id', surveyId).single();
  if (!survey) return { error: 'Survey not found' };

  const { data: allResponses } = await db.from('survey_responses')
    .select('id, status, respondent_name, respondent_email, registered_user_id, sales_user_id, completed_at')
    .eq('survey_id', surveyId);

  const { data: allLinks } = await db.from('survey_share_links')
    .select('id, sales_user_id, scan_count')
    .eq('survey_id', surveyId);

  const responses = allResponses || [];
  const links = allLinks || [];

  const salesUserIds = [...new Set([
    ...links.map((l: { sales_user_id: string }) => l.sales_user_id),
    ...responses.map((r: { sales_user_id: string | null }) => r.sales_user_id),
  ].filter(Boolean))];

  if (salesUserIds.length === 0) {
    return { survey: { id: survey.id, title: survey.title_zh }, sales: [] };
  }

  const { data: profiles } = await db.from('user_profiles')
    .select('id, display_name, email')
    .in('id', salesUserIds);
  const profileMap: Record<string, { display_name: string; email: string }> = {};
  for (const p of profiles || []) profileMap[p.id] = p;

  // 14-day window for daily breakdown
  const now = new Date();
  const days: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  const startDate = days[0] + 'T00:00:00Z';

  const { data: workLogs } = await db.from('admin_work_logs')
    .select('admin_id, created_at')
    .in('admin_id', salesUserIds)
    .eq('action_category', 'sales_customer')
    .gte('created_at', startDate);

  const salesRows = salesUserIds.map((salesId: string) => {
    const profile = profileMap[salesId];
    const name = profile?.display_name || profile?.email || salesId.slice(0, 8);

    const sLinks = links.filter((l: { sales_user_id: string }) => l.sales_user_id === salesId);
    const totalScans = sLinks.reduce((sum: number, l: { scan_count: number }) => sum + (l.scan_count || 0), 0);

    const sResponses = responses.filter((r: { sales_user_id: string | null }) => r.sales_user_id === salesId);
    const completed = sResponses.filter((r: { status: string }) => r.status === 'completed');
    const valid = completed.filter((r: { status: string; respondent_name: string | null; respondent_email: string | null }) => isValidResponse(r));
    const invalid = completed.length - valid.length;
    const registrations = sResponses.filter((r: { registered_user_id: string | null }) => !!r.registered_user_id).length;
    const conversionRate = valid.length > 0 ? Math.round((registrations / valid.length) * 100) : 0;

    const lastCompletedAt = sResponses
      .map((r: { completed_at: string | null }) => r.completed_at)
      .filter(Boolean)
      .sort()
      .pop();

    const sLogs = (workLogs || []).filter((l: { admin_id: string }) => l.admin_id === salesId);

    const dailyBreakdown = days.map(day => {
      const dayStart = day + 'T00:00:00';
      const dayEnd = day + 'T23:59:59';

      const dayResponses = sResponses.filter((r: { completed_at: string | null }) =>
        r.completed_at && r.completed_at >= dayStart && r.completed_at <= dayEnd);
      const dayCompleted = dayResponses.filter((r: { status: string }) => r.status === 'completed');
      const dayValid = dayCompleted.filter((r: { status: string; respondent_name: string | null; respondent_email: string | null }) => isValidResponse(r));
      const dayRegistrations = dayResponses.filter((r: { registered_user_id: string | null }) => !!r.registered_user_id).length;

      const dayLogCount = sLogs.filter((l: { created_at: string }) =>
        l.created_at >= dayStart && l.created_at <= dayEnd).length;

      let status: 'active' | 'warning' | 'inactive' = 'inactive';
      if (dayResponses.length > 0 && dayLogCount > 0) status = 'active';
      else if (dayResponses.length > 0 && dayLogCount === 0) status = 'warning';

      return {
        date: day,
        new_responses: dayCompleted.length,
        valid: dayValid.length,
        invalid: dayCompleted.length - dayValid.length,
        registrations: dayRegistrations,
        follow_up_actions: dayLogCount,
        status,
      };
    });

    return {
      user_id: salesId,
      name,
      total_scans: totalScans,
      valid_responses: valid.length,
      invalid_responses: invalid,
      registrations,
      conversion_rate: conversionRate,
      last_active: lastCompletedAt || null,
      daily_breakdown: dailyBreakdown,
    };
  });

  salesRows.sort((a: { valid_responses: number }, b: { valid_responses: number }) => b.valid_responses - a.valid_responses);

  return { survey: { id: survey.id, title: survey.title_zh }, sales: salesRows };
}

// ─── Layer 3: Client details for a specific Sales ───────────────────────────

async function getClientDetails(surveyId: string, salesId: string) {
  const { data: survey } = await db.from('surveys')
    .select('id, title_zh').eq('id', surveyId).single();
  if (!survey) return { error: 'Survey not found' };

  const { data: profile } = await db.from('user_profiles')
    .select('id, display_name, email').eq('id', salesId).single();
  const salesName = profile?.display_name || profile?.email || salesId.slice(0, 8);

  const { data: allResponses } = await db.from('survey_responses')
    .select('id, status, respondent_name, respondent_phone, respondent_email, respondent_wechat, registered_user_id, follow_up_status, follow_up_notes, value_score, completed_at')
    .eq('survey_id', surveyId)
    .eq('sales_user_id', salesId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false });

  const rows = allResponses || [];

  // Fetch answers for all responses
  const responseIds = rows.map((r: { id: string }) => r.id);
  let answersMap: Record<string, Record<string, unknown>> = {};
  if (responseIds.length > 0) {
    const { data: answers } = await db.from('survey_answers')
      .select('response_id, question_id, answer_value')
      .in('response_id', responseIds);
    if (answers) {
      for (const a of answers) {
        if (!answersMap[a.response_id]) answersMap[a.response_id] = {};
        const val = a.answer_value;
        answersMap[a.response_id][a.question_id] = val?.value !== undefined ? val.value : val;
      }
    }
  }

  // Fetch question titles
  const { data: questions } = await db.from('survey_questions')
    .select('id, title_zh')
    .eq('survey_id', surveyId)
    .order('order_index');
  const qMap: Record<string, string> = {};
  for (const q of questions || []) qMap[q.id] = q.title_zh;

  // Get last follow-up timestamps from admin_work_logs
  const { data: followUpLogs } = await db.from('admin_work_logs')
    .select('target_id, created_at')
    .eq('admin_id', salesId)
    .eq('action_category', 'sales_customer')
    .in('target_id', responseIds.length > 0 ? responseIds : ['__none__'])
    .order('created_at', { ascending: false });

  const lastFollowUpMap: Record<string, string> = {};
  for (const log of followUpLogs || []) {
    if (!lastFollowUpMap[log.target_id]) lastFollowUpMap[log.target_id] = log.created_at;
  }

  const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();

  const clients = rows.map((r: {
    id: string; respondent_name: string | null; respondent_phone: string | null;
    respondent_email: string | null; respondent_wechat: string | null;
    registered_user_id: string | null; follow_up_status: string | null;
    follow_up_notes: string | null; value_score: number | null;
    completed_at: string | null; status: string;
  }) => {
    const valid = isValidResponse(r);
    const answers = answersMap[r.id] || {};
    const answerSummary: Record<string, unknown> = {};
    for (const [qId, val] of Object.entries(answers)) {
      const label = qMap[qId] || qId;
      answerSummary[label] = val;
    }

    const lastFollowUp = lastFollowUpMap[r.id] || null;
    const idleTooLong = valid && (r.follow_up_status === 'pending' || !r.follow_up_status)
      && r.completed_at && r.completed_at < threeDaysAgo;

    return {
      response_id: r.id,
      name: r.respondent_name || '—',
      phone: r.respondent_phone || '—',
      email: r.respondent_email || '—',
      wechat: r.respondent_wechat || '—',
      is_valid: valid,
      is_registered: !!r.registered_user_id,
      follow_up_status: r.follow_up_status || 'pending',
      follow_up_notes: r.follow_up_notes || '',
      last_follow_up: lastFollowUp,
      value_score: r.value_score ?? 0,
      completed_at: r.completed_at,
      answer_summary: answerSummary,
      idle_warning: idleTooLong,
    };
  });

  return {
    survey: { id: survey.id, title: survey.title_zh },
    sales: { user_id: salesId, name: salesName },
    clients,
  };
}
