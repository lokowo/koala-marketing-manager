import { supabaseAdmin } from '../supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

// ── Types ──────────────────────────────────────────────

export type SurveyStatus = 'draft' | 'active' | 'paused' | 'closed';
export type QuestionType = 'single_choice' | 'multiple_choice' | 'text' | 'rating' | 'scale' | 'dropdown' | 'date' | 'file_upload';

export interface SurveyQuestion {
  id: string;
  survey_id: string;
  type: QuestionType;
  title: string;
  description?: string;
  options?: string[];
  required: boolean;
  order_index: number;
  config?: Record<string, unknown>;
  created_at: string;
}

export interface Survey {
  id: string;
  title: string;
  description?: string;
  status: SurveyStatus;
  share_code: string;
  created_by: string;
  max_responses?: number;
  start_at?: string;
  end_at?: string;
  require_login: boolean;
  allow_anonymous: boolean;
  one_per_device: boolean;
  welcome_message?: string;
  thank_you_message?: string;
  brand_color?: string;
  cover_image?: string;
  questions?: SurveyQuestion[];
  response_count?: number;
  created_at: string;
  updated_at: string;
}

export interface SurveyResponse {
  id: string;
  survey_id: string;
  respondent_id?: string;
  device_fingerprint?: string;
  answers: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  source?: string;
  sales_code?: string;
  completed_at?: string;
  created_at: string;
}

// ── Survey CRUD ────────────────────────────────────────

function generateShareCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function createSurvey(data: {
  title: string;
  description?: string;
  created_by: string;
  require_login?: boolean;
  allow_anonymous?: boolean;
  one_per_device?: boolean;
  welcome_message?: string;
  thank_you_message?: string;
  brand_color?: string;
  max_responses?: number;
  start_at?: string;
  end_at?: string;
}): Promise<Survey> {
  const share_code = generateShareCode();
  const { data: row, error } = await db.from('surveys').insert({
    title: data.title,
    description: data.description || null,
    status: 'draft',
    share_code,
    created_by: data.created_by,
    require_login: data.require_login ?? false,
    allow_anonymous: data.allow_anonymous ?? true,
    one_per_device: data.one_per_device ?? true,
    welcome_message: data.welcome_message || null,
    thank_you_message: data.thank_you_message || null,
    brand_color: data.brand_color || '#D4A843',
    max_responses: data.max_responses || null,
    start_at: data.start_at || null,
    end_at: data.end_at || null,
  }).select().single();
  if (error) throw new Error(`Failed to create survey: ${error.message}`);
  return row;
}

export async function getSurvey(id: string): Promise<Survey | null> {
  const { data, error } = await db.from('surveys').select('*').eq('id', id).single();
  if (error || !data) return null;
  const { data: questions } = await db.from('survey_questions')
    .select('*').eq('survey_id', id).order('order_index', { ascending: true });
  const { count } = await db.from('survey_responses')
    .select('*', { count: 'exact', head: true }).eq('survey_id', id);
  return { ...data, questions: questions || [], response_count: count || 0 };
}

export async function getSurveyByCode(code: string): Promise<Survey | null> {
  const { data, error } = await db.from('surveys').select('*').eq('share_code', code).single();
  if (error || !data) return null;
  const { data: questions } = await db.from('survey_questions')
    .select('*').eq('survey_id', data.id).order('order_index', { ascending: true });
  return { ...data, questions: questions || [] };
}

export async function listSurveys(params: {
  page?: number;
  limit?: number;
  status?: SurveyStatus;
  search?: string;
  created_by?: string;
}): Promise<{ surveys: Survey[]; total: number }> {
  const page = params.page || 1;
  const limit = params.limit || 20;
  const offset = (page - 1) * limit;

  let query = db.from('surveys').select('*', { count: 'exact' });
  if (params.status) query = query.eq('status', params.status);
  if (params.created_by) query = query.eq('created_by', params.created_by);
  if (params.search) query = query.ilike('title', `%${params.search}%`);
  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) throw new Error(`Failed to list surveys: ${error.message}`);
  return { surveys: data || [], total: count || 0 };
}

export async function updateSurvey(id: string, updates: Partial<Pick<Survey,
  'title' | 'description' | 'status' | 'max_responses' | 'start_at' | 'end_at' |
  'require_login' | 'allow_anonymous' | 'one_per_device' | 'welcome_message' |
  'thank_you_message' | 'brand_color' | 'cover_image'
>>): Promise<Survey> {
  const { data, error } = await db.from('surveys')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id).select().single();
  if (error) throw new Error(`Failed to update survey: ${error.message}`);
  return data;
}

export async function deleteSurvey(id: string): Promise<void> {
  await db.from('survey_questions').delete().eq('survey_id', id);
  await db.from('survey_responses').delete().eq('survey_id', id);
  await db.from('survey_qrcodes').delete().eq('survey_id', id);
  const { error } = await db.from('surveys').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete survey: ${error.message}`);
}

export async function duplicateSurvey(id: string, userId: string): Promise<Survey> {
  const original = await getSurvey(id);
  if (!original) throw new Error('Survey not found');
  const copy = await createSurvey({
    title: `${original.title} (副本)`,
    description: original.description,
    created_by: userId,
    require_login: original.require_login,
    allow_anonymous: original.allow_anonymous,
    one_per_device: original.one_per_device,
    welcome_message: original.welcome_message,
    thank_you_message: original.thank_you_message,
    brand_color: original.brand_color,
  });
  if (original.questions?.length) {
    const newQuestions = original.questions.map((q, i) => ({
      survey_id: copy.id,
      type: q.type,
      title: q.title,
      description: q.description || null,
      options: q.options || null,
      required: q.required,
      order_index: i,
      config: q.config || null,
    }));
    await db.from('survey_questions').insert(newQuestions);
  }
  return await getSurvey(copy.id) as Survey;
}

// ── Questions ──────────────────────────────────────────

export async function addQuestion(surveyId: string, data: {
  type: QuestionType;
  title: string;
  description?: string;
  options?: string[];
  required?: boolean;
  config?: Record<string, unknown>;
}): Promise<SurveyQuestion> {
  const { count } = await db.from('survey_questions')
    .select('*', { count: 'exact', head: true }).eq('survey_id', surveyId);
  const { data: row, error } = await db.from('survey_questions').insert({
    survey_id: surveyId,
    type: data.type,
    title: data.title,
    description: data.description || null,
    options: data.options || null,
    required: data.required ?? true,
    order_index: count || 0,
    config: data.config || null,
  }).select().single();
  if (error) throw new Error(`Failed to add question: ${error.message}`);
  return row;
}

export async function updateQuestion(questionId: string, updates: Partial<Pick<SurveyQuestion,
  'type' | 'title' | 'description' | 'options' | 'required' | 'order_index' | 'config'
>>): Promise<SurveyQuestion> {
  const { data, error } = await db.from('survey_questions')
    .update(updates).eq('id', questionId).select().single();
  if (error) throw new Error(`Failed to update question: ${error.message}`);
  return data;
}

export async function deleteQuestion(questionId: string): Promise<void> {
  const { data: q } = await db.from('survey_questions').select('survey_id, order_index').eq('id', questionId).single();
  if (!q) return;
  await db.from('survey_questions').delete().eq('id', questionId);
  // reindex remaining questions
  const { data: remaining } = await db.from('survey_questions')
    .select('id').eq('survey_id', q.survey_id).order('order_index', { ascending: true });
  if (remaining) {
    for (let i = 0; i < remaining.length; i++) {
      await db.from('survey_questions').update({ order_index: i }).eq('id', remaining[i].id);
    }
  }
}

export async function reorderQuestions(surveyId: string, questionIds: string[]): Promise<void> {
  for (let i = 0; i < questionIds.length; i++) {
    await db.from('survey_questions')
      .update({ order_index: i }).eq('id', questionIds[i]).eq('survey_id', surveyId);
  }
}

// ── Responses ──────────────────────────────────────────

export async function submitResponse(data: {
  survey_id: string;
  respondent_id?: string;
  device_fingerprint?: string;
  answers: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  source?: string;
  sales_code?: string;
}): Promise<SurveyResponse> {
  const survey = await getSurvey(data.survey_id);
  if (!survey) throw new Error('Survey not found');
  if (survey.status !== 'active') throw new Error('Survey is not active');
  if (survey.max_responses && (survey.response_count || 0) >= survey.max_responses) {
    throw new Error('Survey has reached maximum responses');
  }
  if (survey.end_at && new Date(survey.end_at) < new Date()) {
    throw new Error('Survey has ended');
  }
  if (survey.one_per_device && data.device_fingerprint) {
    const { count } = await db.from('survey_responses')
      .select('*', { count: 'exact', head: true })
      .eq('survey_id', data.survey_id)
      .eq('device_fingerprint', data.device_fingerprint);
    if (count && count > 0) throw new Error('Already submitted from this device');
  }

  const { data: row, error } = await db.from('survey_responses').insert({
    survey_id: data.survey_id,
    respondent_id: data.respondent_id || null,
    device_fingerprint: data.device_fingerprint || null,
    answers: data.answers,
    metadata: data.metadata || null,
    source: data.source || null,
    sales_code: data.sales_code || null,
    completed_at: new Date().toISOString(),
  }).select().single();
  if (error) throw new Error(`Failed to submit response: ${error.message}`);
  return row;
}

export async function listResponses(surveyId: string, params?: {
  page?: number;
  limit?: number;
  sales_code?: string;
}): Promise<{ responses: SurveyResponse[]; total: number }> {
  const page = params?.page || 1;
  const limit = params?.limit || 50;
  const offset = (page - 1) * limit;

  let query = db.from('survey_responses')
    .select('*', { count: 'exact' })
    .eq('survey_id', surveyId);
  if (params?.sales_code) query = query.eq('sales_code', params.sales_code);
  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) throw new Error(`Failed to list responses: ${error.message}`);
  return { responses: data || [], total: count || 0 };
}

export async function getResponseById(id: string): Promise<SurveyResponse | null> {
  const { data } = await db.from('survey_responses').select('*').eq('id', id).single();
  return data || null;
}

export async function deleteResponse(id: string): Promise<void> {
  const { error } = await db.from('survey_responses').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete response: ${error.message}`);
}

// ── QR Codes ───────────────────────────────────────────

export interface SurveyQRCode {
  id: string;
  survey_id: string;
  sales_id: string;
  sales_code: string;
  label?: string;
  qr_image_url?: string;
  scan_count: number;
  response_count: number;
  created_at: string;
}

export async function createQRCode(data: {
  survey_id: string;
  sales_id: string;
  sales_code: string;
  label?: string;
  qr_image_url?: string;
}): Promise<SurveyQRCode> {
  const { data: row, error } = await db.from('survey_qrcodes').insert({
    survey_id: data.survey_id,
    sales_id: data.sales_id,
    sales_code: data.sales_code,
    label: data.label || null,
    qr_image_url: data.qr_image_url || null,
    scan_count: 0,
    response_count: 0,
  }).select().single();
  if (error) throw new Error(`Failed to create QR code: ${error.message}`);
  return row;
}

export async function listQRCodes(surveyId: string, salesId?: string): Promise<SurveyQRCode[]> {
  let query = db.from('survey_qrcodes').select('*').eq('survey_id', surveyId);
  if (salesId) query = query.eq('sales_id', salesId);
  query = query.order('created_at', { ascending: false });
  const { data } = await query;
  return data || [];
}

export async function incrementQRScan(salesCode: string): Promise<void> {
  const { data: qr } = await db.from('survey_qrcodes').select('id, scan_count').eq('sales_code', salesCode).single();
  if (qr) {
    await db.from('survey_qrcodes').update({ scan_count: (qr.scan_count || 0) + 1 }).eq('id', qr.id);
  }
}

export async function incrementQRResponse(salesCode: string): Promise<void> {
  const { data: qr } = await db.from('survey_qrcodes').select('id, response_count').eq('sales_code', salesCode).single();
  if (qr) {
    await db.from('survey_qrcodes').update({ response_count: (qr.response_count || 0) + 1 }).eq('id', qr.id);
  }
}

// ── Analytics ──────────────────────────────────────────

export interface SurveyAnalytics {
  total_responses: number;
  completion_rate: number;
  avg_completion_time_seconds: number;
  responses_by_day: Array<{ date: string; count: number }>;
  responses_by_source: Array<{ source: string; count: number }>;
  question_stats: Array<{
    question_id: string;
    question_title: string;
    question_type: QuestionType;
    answer_distribution: Record<string, number>;
    text_answers?: string[];
  }>;
}

export async function getSurveyAnalytics(surveyId: string, salesCode?: string): Promise<SurveyAnalytics> {
  let query = db.from('survey_responses').select('*').eq('survey_id', surveyId);
  if (salesCode) query = query.eq('sales_code', salesCode);
  const { data: responses } = await query;
  const allResponses: SurveyResponse[] = responses || [];

  const { data: questions } = await db.from('survey_questions')
    .select('*').eq('survey_id', surveyId).order('order_index', { ascending: true });
  const allQuestions: SurveyQuestion[] = questions || [];

  // Responses by day
  const dayMap: Record<string, number> = {};
  for (const r of allResponses) {
    const day = r.created_at.slice(0, 10);
    dayMap[day] = (dayMap[day] || 0) + 1;
  }
  const responses_by_day = Object.entries(dayMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Responses by source
  const sourceMap: Record<string, number> = {};
  for (const r of allResponses) {
    const src = r.source || 'direct';
    sourceMap[src] = (sourceMap[src] || 0) + 1;
  }
  const responses_by_source = Object.entries(sourceMap).map(([source, count]) => ({ source, count }));

  // Question stats
  const question_stats = allQuestions.map(q => {
    const distribution: Record<string, number> = {};
    const texts: string[] = [];
    for (const r of allResponses) {
      const answer = r.answers[q.id];
      if (answer === undefined || answer === null) continue;
      if (q.type === 'text') {
        texts.push(String(answer));
      } else if (Array.isArray(answer)) {
        for (const v of answer) {
          const key = String(v);
          distribution[key] = (distribution[key] || 0) + 1;
        }
      } else {
        const key = String(answer);
        distribution[key] = (distribution[key] || 0) + 1;
      }
    }
    return {
      question_id: q.id,
      question_title: q.title,
      question_type: q.type,
      answer_distribution: distribution,
      ...(q.type === 'text' ? { text_answers: texts.slice(0, 100) } : {}),
    };
  });

  // Avg completion time (metadata.duration_seconds if tracked)
  const durations = allResponses
    .map(r => (r.metadata as Record<string, unknown>)?.duration_seconds as number)
    .filter((d): d is number => typeof d === 'number' && d > 0);
  const avg_completion_time_seconds = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 0;

  return {
    total_responses: allResponses.length,
    completion_rate: allResponses.length > 0 ? 100 : 0,
    avg_completion_time_seconds,
    responses_by_day,
    responses_by_source,
    question_stats,
  };
}
