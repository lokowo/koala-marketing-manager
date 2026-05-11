import { supabaseAdmin } from '../supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

// ── Types ──────────────────────────────────────────────

export type SurveyStatus = 'draft' | 'active' | 'paused' | 'closed' | 'deleted';
export type QuestionType = 'single_choice' | 'multiple_choice' | 'text' | 'long_text' | 'rating' | 'nps' | 'scale' | 'dropdown' | 'phone' | 'email' | 'education' | 'date' | 'file_upload';

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
  title_zh: string;
  title_en?: string;
  description?: string;
  description_zh?: string;
  description_en?: string;
  status: SurveyStatus;
  settings: Record<string, unknown>;
  share_code?: string;
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
  survey_json?: Record<string, unknown>;
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

// ── Mappers (DB row → app interface) ──────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSurveyRow(row: any): Survey {
  const s = row.settings || {};
  return {
    id: row.id,
    title: row.title_zh || '',
    title_zh: row.title_zh || '',
    title_en: row.title_en || undefined,
    description: row.description_zh || undefined,
    description_zh: row.description_zh || undefined,
    description_en: row.description_en || undefined,
    status: row.status,
    settings: row.settings || {},
    share_code: row._share_code || undefined,
    created_by: row.created_by,
    max_responses: s.max_responses || undefined,
    allow_anonymous: s.allow_anonymous ?? false,
    one_per_device: s.prevent_duplicate ?? true,
    require_login: s.require_registration ?? true,
    welcome_message: s.welcome_message_zh || undefined,
    thank_you_message: s.thank_you_message_zh || undefined,
    brand_color: s.brand_color || undefined,
    cover_image: row.share_image_url || undefined,
    survey_json: row.survey_json || undefined,
    start_at: undefined,
    end_at: s.auto_end_date || row.ended_at || undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapQuestionRow(row: any): SurveyQuestion {
  return {
    id: row.id,
    survey_id: row.survey_id,
    type: row.type,
    title: row.title_zh || '',
    description: row.description_zh || undefined,
    options: row.options,
    required: row.required ?? true,
    order_index: row.order_index,
    config: row.condition || row.validation
      ? { condition: row.condition, validation: row.validation }
      : undefined,
    created_at: row.created_at,
  };
}

function generateShareCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ── Survey CRUD ────────────────────────────────────────

export async function createSurvey(data: {
  title: string;
  title_en?: string;
  description?: string;
  description_en?: string;
  created_by: string;
  settings?: Record<string, unknown>;
}): Promise<Survey> {
  const insertData: Record<string, unknown> = {
    title_zh: data.title,
    title_en: data.title_en || null,
    description_zh: data.description || null,
    description_en: data.description_en || null,
    status: 'draft',
    created_by: data.created_by,
  };
  if (data.settings) {
    insertData.settings = data.settings;
  }

  const { data: row, error } = await db.from('surveys').insert(insertData).select().single();
  if (error) throw new Error(`Failed to create survey: ${error.message}`);

  // Auto-create a share link so the survey has a share_code
  const shareCode = generateShareCode();
  await db.from('survey_share_links').insert({
    survey_id: row.id,
    sales_user_id: data.created_by,
    short_code: shareCode,
  }).select().single();

  row._share_code = shareCode;
  return mapSurveyRow(row);
}

async function attachShareCode(surveyRow: Record<string, unknown>): Promise<void> {
  const { data: link } = await db.from('survey_share_links')
    .select('short_code')
    .eq('survey_id', surveyRow.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();
  if (link) {
    surveyRow._share_code = link.short_code;
  }
}

export async function getSurvey(id: string): Promise<Survey | null> {
  const { data, error } = await db.from('surveys').select('*').eq('id', id).single();
  if (error || !data) return null;

  await attachShareCode(data);

  const { data: questions } = await db.from('survey_questions')
    .select('*').eq('survey_id', id).order('order_index', { ascending: true });

  const { count } = await db.from('survey_responses')
    .select('*', { count: 'exact', head: true }).eq('survey_id', id);

  const survey = mapSurveyRow(data);
  survey.questions = (questions || []).map(mapQuestionRow);
  survey.response_count = count || 0;
  return survey;
}

export async function getSurveyByCode(code: string): Promise<Survey | null> {
  // Look up survey via survey_share_links
  const { data: link } = await db.from('survey_share_links')
    .select('survey_id')
    .eq('short_code', code)
    .single();
  if (!link) return null;

  const { data, error } = await db.from('surveys').select('*').eq('id', link.survey_id).single();
  if (error || !data) return null;

  data._share_code = code;

  const { data: questions } = await db.from('survey_questions')
    .select('*').eq('survey_id', data.id).order('order_index', { ascending: true });

  const survey = mapSurveyRow(data);
  survey.questions = (questions || []).map(mapQuestionRow);
  return survey;
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
  if (params.status) {
    query = query.eq('status', params.status);
  } else {
    query = query.neq('status', 'deleted');
  }
  if (params.created_by) query = query.eq('created_by', params.created_by);
  if (params.search) query = query.ilike('title_zh', `%${params.search}%`);
  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) throw new Error(`Failed to list surveys: ${error.message}`);

  const rows = data || [];
  // Attach share codes in batch
  if (rows.length > 0) {
    const ids = rows.map((r: Record<string, unknown>) => r.id);
    const { data: links } = await db.from('survey_share_links')
      .select('survey_id, short_code')
      .in('survey_id', ids)
      .order('created_at', { ascending: true });
    if (links) {
      const codeMap: Record<string, string> = {};
      for (const l of links) {
        if (!codeMap[l.survey_id]) codeMap[l.survey_id] = l.short_code;
      }
      for (const r of rows) {
        r._share_code = codeMap[r.id as string] || undefined;
      }
    }
  }

  return { surveys: rows.map(mapSurveyRow), total: count || 0 };
}

export async function updateSurvey(id: string, updates: Partial<{
  title: string;
  title_en: string;
  description: string;
  description_en: string;
  status: SurveyStatus;
  max_responses: number;
  start_at: string;
  end_at: string;
  require_login: boolean;
  allow_anonymous: boolean;
  one_per_device: boolean;
  welcome_message: string;
  thank_you_message: string;
  brand_color: string;
  cover_image: string;
  survey_json: Record<string, unknown>;
}>): Promise<Survey> {
  // Build direct column updates
  const dbUpdates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.title !== undefined) dbUpdates.title_zh = updates.title;
  if (updates.title_en !== undefined) dbUpdates.title_en = updates.title_en;
  if (updates.description !== undefined) dbUpdates.description_zh = updates.description || null;
  if (updates.description_en !== undefined) dbUpdates.description_en = updates.description_en;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.cover_image !== undefined) dbUpdates.share_image_url = updates.cover_image;
  if (updates.survey_json !== undefined) dbUpdates.survey_json = updates.survey_json;

  if (updates.status === 'active') dbUpdates.published_at = new Date().toISOString();
  if (updates.status === 'closed') dbUpdates.ended_at = new Date().toISOString();
  if (updates.status === 'deleted') dbUpdates.ended_at = new Date().toISOString();

  // Merge settings-level fields into existing settings
  const settingsKeys = ['max_responses', 'allow_anonymous', 'one_per_device',
    'require_login', 'welcome_message', 'thank_you_message', 'brand_color',
    'start_at', 'end_at'] as const;
  const hasSettingsUpdate = settingsKeys.some(k => updates[k] !== undefined);

  if (hasSettingsUpdate) {
    const { data: current } = await db.from('surveys').select('settings').eq('id', id).single();
    const merged = { ...(current?.settings || {}) };
    if (updates.max_responses !== undefined) merged.max_responses = updates.max_responses || null;
    if (updates.allow_anonymous !== undefined) merged.allow_anonymous = updates.allow_anonymous;
    if (updates.one_per_device !== undefined) merged.prevent_duplicate = updates.one_per_device;
    if (updates.require_login !== undefined) merged.require_registration = updates.require_login;
    if (updates.welcome_message !== undefined) merged.welcome_message_zh = updates.welcome_message || null;
    if (updates.thank_you_message !== undefined) merged.thank_you_message_zh = updates.thank_you_message || null;
    if (updates.brand_color !== undefined) merged.brand_color = updates.brand_color;
    if (updates.end_at !== undefined) merged.auto_end_date = updates.end_at || null;
    dbUpdates.settings = merged;
  }

  const { data, error } = await db.from('surveys')
    .update(dbUpdates).eq('id', id).select().single();
  if (error) throw new Error(`Failed to update survey: ${error.message}`);

  await attachShareCode(data);
  return mapSurveyRow(data);
}

export async function deleteSurvey(id: string): Promise<void> {
  // Delete answers for all responses of this survey
  const { data: responses } = await db.from('survey_responses')
    .select('id').eq('survey_id', id);
  if (responses?.length) {
    const responseIds = responses.map((r: { id: string }) => r.id);
    await db.from('survey_answers').delete().in('response_id', responseIds);
  }
  await db.from('survey_responses').delete().eq('survey_id', id);
  await db.from('survey_questions').delete().eq('survey_id', id);
  await db.from('survey_share_links').delete().eq('survey_id', id);
  await db.from('survey_activity_logs').delete().eq('survey_id', id);
  const { error } = await db.from('surveys').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete survey: ${error.message}`);
}

export async function duplicateSurvey(id: string, userId: string): Promise<Survey> {
  const original = await getSurvey(id);
  if (!original) throw new Error('Survey not found');

  const { data: origRow } = await db.from('surveys').select('settings').eq('id', id).single();

  const copy = await createSurvey({
    title: `${original.title} (副本)`,
    description: original.description,
    created_by: userId,
    settings: origRow?.settings,
  });

  if (original.questions?.length) {
    const { data: origQuestions } = await db.from('survey_questions')
      .select('*').eq('survey_id', id).order('order_index', { ascending: true });
    if (origQuestions?.length) {
      const newQuestions = origQuestions.map((q: Record<string, unknown>, i: number) => ({
        survey_id: copy.id,
        type: q.type,
        title_zh: q.title_zh,
        title_en: q.title_en || null,
        description_zh: q.description_zh || null,
        description_en: q.description_en || null,
        options: q.options || null,
        required: q.required,
        order_index: i,
        page_number: q.page_number || 1,
        condition: q.condition || null,
        validation: q.validation || null,
      }));
      await db.from('survey_questions').insert(newQuestions);
    }
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
    title_zh: data.title,
    description_zh: data.description || null,
    options: data.options || null,
    required: data.required ?? true,
    order_index: count || 0,
    page_number: 1,
    condition: data.config?.condition || null,
    validation: data.config?.validation || null,
  }).select().single();
  if (error) throw new Error(`Failed to add question: ${error.message}`);
  return mapQuestionRow(row);
}

export async function updateQuestion(questionId: string, updates: Partial<Pick<SurveyQuestion,
  'type' | 'title' | 'description' | 'options' | 'required' | 'order_index' | 'config'
>>): Promise<SurveyQuestion> {
  const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.type !== undefined) dbUpdates.type = updates.type;
  if (updates.title !== undefined) dbUpdates.title_zh = updates.title;
  if (updates.description !== undefined) dbUpdates.description_zh = updates.description || null;
  if (updates.options !== undefined) dbUpdates.options = updates.options;
  if (updates.required !== undefined) dbUpdates.required = updates.required;
  if (updates.order_index !== undefined) dbUpdates.order_index = updates.order_index;
  if (updates.config) {
    if (updates.config.condition !== undefined) dbUpdates.condition = updates.config.condition;
    if (updates.config.validation !== undefined) dbUpdates.validation = updates.config.validation;
  }

  const { data, error } = await db.from('survey_questions')
    .update(dbUpdates).eq('id', questionId).select().single();
  if (error) throw new Error(`Failed to update question: ${error.message}`);
  return mapQuestionRow(data);
}

export async function deleteQuestion(questionId: string): Promise<void> {
  const { data: q } = await db.from('survey_questions').select('survey_id, order_index').eq('id', questionId).single();
  if (!q) return;
  await db.from('survey_questions').delete().eq('id', questionId);
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

  // Resolve sales share link if sales_code provided
  let salesUserId: string | null = null;
  let shareLinkId: string | null = null;
  if (data.sales_code) {
    const { data: link } = await db.from('survey_share_links')
      .select('id, sales_user_id')
      .eq('short_code', data.sales_code)
      .single();
    if (link) {
      shareLinkId = link.id;
      salesUserId = link.sales_user_id;
    }
  }

  const durationSeconds = data.metadata?.duration_seconds as number | undefined;
  const contactName = data.metadata?.contact_name as string | undefined;
  const contactPhone = data.metadata?.contact_phone as string | undefined;
  const contactEmail = data.metadata?.contact_email as string | undefined;
  const contactWechat = data.metadata?.contact_wechat as string | undefined;

  const { data: row, error } = await db.from('survey_responses').insert({
    survey_id: data.survey_id,
    device_fingerprint: data.device_fingerprint || null,
    sales_user_id: salesUserId,
    share_link_id: shareLinkId,
    registered_user_id: data.respondent_id || null,
    respondent_name: contactName || null,
    respondent_phone: contactPhone || null,
    respondent_email: contactEmail || null,
    respondent_wechat: contactWechat || null,
    status: 'completed',
    completed_at: new Date().toISOString(),
    started_at: new Date(Date.now() - (durationSeconds || 0) * 1000).toISOString(),
    time_spent_seconds: durationSeconds || null,
  }).select().single();
  if (error) throw new Error(`Failed to submit response: ${error.message}`);

  // Insert individual answers into survey_answers
  if (data.answers && Object.keys(data.answers).length > 0) {
    const answerRows = Object.entries(data.answers).map(([questionId, value]) => ({
      response_id: row.id,
      question_id: questionId,
      answer_value: typeof value === 'object' ? value : { value },
      answered_at: new Date().toISOString(),
    }));
    await db.from('survey_answers').insert(answerRows);
  }

  // Increment share link response count
  if (shareLinkId) {
    const { data: link } = await db.from('survey_share_links')
      .select('response_count').eq('id', shareLinkId).single();
    if (link) {
      await db.from('survey_share_links')
        .update({ response_count: (link.response_count || 0) + 1 })
        .eq('id', shareLinkId);
    }
  }

  return {
    id: row.id,
    survey_id: row.survey_id,
    respondent_id: row.registered_user_id || undefined,
    device_fingerprint: row.device_fingerprint || undefined,
    answers: data.answers,
    metadata: data.metadata,
    source: data.sales_code ? 'qrcode' : 'direct',
    sales_code: data.sales_code,
    completed_at: row.completed_at,
    created_at: row.started_at || row.completed_at,
  };
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

  if (params?.sales_code) {
    // Look up share link first
    const { data: link } = await db.from('survey_share_links')
      .select('id').eq('short_code', params.sales_code).single();
    if (link) {
      query = query.eq('share_link_id', link.id);
    } else {
      return { responses: [], total: 0 };
    }
  }

  query = query.order('completed_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) throw new Error(`Failed to list responses: ${error.message}`);

  const rows = data || [];

  // Fetch answers for all responses
  const responseIds = rows.map((r: Record<string, unknown>) => r.id);
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

  // Look up share link codes for sales attribution
  const linkIds = [...new Set(rows.map((r: Record<string, unknown>) => r.share_link_id).filter(Boolean))];
  let linkCodeMap: Record<string, string> = {};
  if (linkIds.length > 0) {
    const { data: links } = await db.from('survey_share_links')
      .select('id, short_code').in('id', linkIds);
    if (links) {
      for (const l of links) linkCodeMap[l.id] = l.short_code;
    }
  }

  const responses: SurveyResponse[] = rows.map((r: Record<string, unknown>) => ({
    id: r.id as string,
    survey_id: r.survey_id as string,
    respondent_id: (r.registered_user_id as string) || undefined,
    device_fingerprint: (r.device_fingerprint as string) || undefined,
    answers: answersMap[r.id as string] || {},
    metadata: {
      duration_seconds: r.time_spent_seconds,
      respondent_name: r.respondent_name,
      respondent_email: r.respondent_email,
      respondent_phone: r.respondent_phone,
      respondent_wechat: r.respondent_wechat,
    },
    source: r.share_link_id ? 'qrcode' : 'direct',
    sales_code: r.share_link_id ? linkCodeMap[r.share_link_id as string] : undefined,
    completed_at: (r.completed_at as string) || undefined,
    created_at: (r.started_at || r.completed_at || '') as string,
  }));

  return { responses, total: count || 0 };
}

export async function getResponseById(id: string): Promise<SurveyResponse | null> {
  const { data: r } = await db.from('survey_responses').select('*').eq('id', id).single();
  if (!r) return null;

  const { data: answers } = await db.from('survey_answers')
    .select('question_id, answer_value').eq('response_id', id);
  const answersObj: Record<string, unknown> = {};
  if (answers) {
    for (const a of answers) {
      answersObj[a.question_id] = a.answer_value?.value !== undefined ? a.answer_value.value : a.answer_value;
    }
  }

  return {
    id: r.id,
    survey_id: r.survey_id,
    respondent_id: r.registered_user_id || undefined,
    device_fingerprint: r.device_fingerprint || undefined,
    answers: answersObj,
    metadata: { duration_seconds: r.time_spent_seconds },
    source: r.share_link_id ? 'qrcode' : 'direct',
    completed_at: r.completed_at || undefined,
    created_at: r.started_at || r.completed_at || '',
  };
}

export async function deleteResponse(id: string): Promise<void> {
  await db.from('survey_answers').delete().eq('response_id', id);
  const { error } = await db.from('survey_responses').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete response: ${error.message}`);
}

// ── QR Codes / Share Links ────────────────────────────

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapShareLinkRow(row: any): SurveyQRCode {
  return {
    id: row.id,
    survey_id: row.survey_id,
    sales_id: row.sales_user_id,
    sales_code: row.short_code,
    label: undefined,
    qr_image_url: row.qr_code_url || undefined,
    scan_count: row.scan_count || 0,
    response_count: row.response_count || 0,
    created_at: row.created_at,
  };
}

export async function createQRCode(data: {
  survey_id: string;
  sales_id: string;
  sales_code: string;
  label?: string;
  qr_image_url?: string;
}): Promise<SurveyQRCode> {
  const { data: row, error } = await db.from('survey_share_links').insert({
    survey_id: data.survey_id,
    sales_user_id: data.sales_id,
    short_code: data.sales_code,
    qr_code_url: data.qr_image_url || null,
    scan_count: 0,
    response_count: 0,
    registration_count: 0,
  }).select().single();
  if (error) throw new Error(`Failed to create QR code: ${error.message}`);
  const result = mapShareLinkRow(row);
  result.label = data.label;
  return result;
}

export async function listQRCodes(surveyId: string, salesId?: string): Promise<SurveyQRCode[]> {
  let query = db.from('survey_share_links').select('*').eq('survey_id', surveyId);
  if (salesId) query = query.eq('sales_user_id', salesId);
  query = query.order('created_at', { ascending: false });
  const { data } = await query;
  return (data || []).map(mapShareLinkRow);
}

export async function incrementQRScan(salesCode: string): Promise<void> {
  const { data: link } = await db.from('survey_share_links')
    .select('id, scan_count').eq('short_code', salesCode).single();
  if (link) {
    await db.from('survey_share_links')
      .update({ scan_count: (link.scan_count || 0) + 1 })
      .eq('id', link.id);
  }
}

export async function incrementQRResponse(salesCode: string): Promise<void> {
  const { data: link } = await db.from('survey_share_links')
    .select('id, response_count').eq('short_code', salesCode).single();
  if (link) {
    await db.from('survey_share_links')
      .update({ response_count: (link.response_count || 0) + 1 })
      .eq('id', link.id);
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
  // Get responses
  let responseQuery = db.from('survey_responses').select('*').eq('survey_id', surveyId);
  if (salesCode) {
    const { data: link } = await db.from('survey_share_links')
      .select('id').eq('short_code', salesCode).single();
    if (link) {
      responseQuery = responseQuery.eq('share_link_id', link.id);
    } else {
      responseQuery = responseQuery.eq('share_link_id', 'nonexistent');
    }
  }
  const { data: rawResponses } = await responseQuery;
  const allRawResponses = rawResponses || [];

  // Get questions
  const { data: questions } = await db.from('survey_questions')
    .select('*').eq('survey_id', surveyId).order('order_index', { ascending: true });
  const allQuestions = (questions || []).map(mapQuestionRow);

  // Get all answers for these responses
  const responseIds = allRawResponses.map((r: Record<string, unknown>) => r.id);
  let allAnswers: Array<{ response_id: string; question_id: string; answer_value: Record<string, unknown> }> = [];
  if (responseIds.length > 0) {
    const { data: answers } = await db.from('survey_answers')
      .select('response_id, question_id, answer_value')
      .in('response_id', responseIds);
    allAnswers = answers || [];
  }

  // Build answers map per response
  const answersPerResponse: Record<string, Record<string, unknown>> = {};
  for (const a of allAnswers) {
    if (!answersPerResponse[a.response_id]) answersPerResponse[a.response_id] = {};
    answersPerResponse[a.response_id][a.question_id] = a.answer_value?.value !== undefined
      ? a.answer_value.value : a.answer_value;
  }

  // Responses by day
  const dayMap: Record<string, number> = {};
  for (const r of allRawResponses) {
    const dateStr = (r.completed_at || r.started_at || '') as string;
    if (!dateStr) continue;
    const day = dateStr.slice(0, 10);
    dayMap[day] = (dayMap[day] || 0) + 1;
  }
  const responses_by_day = Object.entries(dayMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Responses by source
  const sourceMap: Record<string, number> = {};
  for (const r of allRawResponses) {
    const src = r.share_link_id ? 'qrcode' : 'direct';
    sourceMap[src] = (sourceMap[src] || 0) + 1;
  }
  const responses_by_source = Object.entries(sourceMap).map(([source, count]) => ({ source, count }));

  // Question stats
  const question_stats = allQuestions.map((q: SurveyQuestion) => {
    const distribution: Record<string, number> = {};
    const texts: string[] = [];
    for (const r of allRawResponses) {
      const respAnswers = answersPerResponse[r.id as string] || {};
      const answer = respAnswers[q.id];
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

  // Avg completion time
  const durations = allRawResponses
    .map((r: Record<string, unknown>) => r.time_spent_seconds as number)
    .filter((d: number | null | undefined): d is number => typeof d === 'number' && d > 0);
  const avg_completion_time_seconds = durations.length > 0
    ? Math.round(durations.reduce((a: number, b: number) => a + b, 0) / durations.length)
    : 0;

  return {
    total_responses: allRawResponses.length,
    completion_rate: allRawResponses.length > 0 ? 100 : 0,
    avg_completion_time_seconds,
    responses_by_day,
    responses_by_source,
    question_stats,
  };
}

// ── Public Survey Flow (share-link → response → registration) ──

export async function resolveShareCode(code: string): Promise<{
  survey: any;
  questions: any[];
  salesUserId: string;
  shareLinkId: string;
} | null> {
  // Look up the share link by short_code
  const { data: link, error: linkErr } = await db.from('survey_share_links')
    .select('*')
    .eq('short_code', code)
    .single();
  if (linkErr || !link) return null;

  // Fetch the survey
  const { data: survey, error: surveyErr } = await db.from('surveys')
    .select('*')
    .eq('id', link.survey_id)
    .single();
  if (surveyErr || !survey) return null;

  // Fetch questions ordered by order_index
  const { data: questions } = await db.from('survey_questions')
    .select('*')
    .eq('survey_id', survey.id)
    .order('order_index', { ascending: true });

  // Increment scan_count on the share link
  const newScanCount = (link.scan_count || 0) + 1;
  await db.from('survey_share_links')
    .update({ scan_count: newScanCount })
    .eq('id', link.id);

  return {
    survey,
    questions: questions || [],
    salesUserId: link.sales_user_id,
    shareLinkId: link.id,
  };
}

export async function startResponse(
  surveyId: string,
  salesUserId: string,
  shareLinkId: string,
  fingerprint?: string,
): Promise<any> {
  const { data: row, error } = await db.from('survey_responses').insert({
    survey_id: surveyId,
    sales_user_id: salesUserId,
    share_link_id: shareLinkId,
    device_fingerprint: fingerprint || null,
    status: 'in_progress',
    started_at: new Date().toISOString(),
  }).select().single();
  if (error) throw new Error(`Failed to start survey response: ${error.message}`);
  return row;
}

export async function saveProgress(
  responseId: string,
  answers: Record<string, unknown>,
  currentPage: number,
): Promise<void> {
  const { error: updateErr } = await db.from('survey_responses')
    .update({ current_page: currentPage })
    .eq('id', responseId);
  if (updateErr) throw new Error(`Failed to save progress: ${updateErr.message}`);

  await db.from('survey_answers').delete().eq('response_id', responseId);

  const entries = Object.entries(answers).filter(([k]) => !k.startsWith('__'));
  if (entries.length > 0) {
    const rows = entries.map(([questionId, value]) => ({
      response_id: responseId,
      question_id: questionId,
      answer_value: typeof value === 'object' ? value : { value },
      answered_at: new Date().toISOString(),
    }));
    const { error: insertErr } = await db.from('survey_answers').insert(rows);
    if (insertErr) throw new Error(`Failed to save answers: ${insertErr.message}`);
  }
}

export async function completeResponse(
  responseId: string,
  answers: Record<string, unknown>,
  metadata?: Record<string, unknown>,
): Promise<{ id: string }> {
  const contactName = metadata?.contact_name as string | undefined;
  const contactPhone = metadata?.contact_phone as string | undefined;
  const contactEmail = metadata?.contact_email as string | undefined;
  const contactWechat = metadata?.contact_wechat as string | undefined;
  const durationSeconds = metadata?.duration_seconds as number | undefined;

  const { error: updateErr } = await db.from('survey_responses')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      respondent_name: contactName || null,
      respondent_phone: contactPhone || null,
      respondent_email: contactEmail || null,
      respondent_wechat: contactWechat || null,
      time_spent_seconds: durationSeconds || null,
    })
    .eq('id', responseId);
  if (updateErr) throw new Error(`Failed to complete response: ${updateErr.message}`);

  await db.from('survey_answers').delete().eq('response_id', responseId);

  const entries = Object.entries(answers).filter(([k]) => !k.startsWith('__'));
  if (entries.length > 0) {
    const rows = entries.map(([questionId, value]) => ({
      response_id: responseId,
      question_id: questionId,
      answer_value: typeof value === 'object' ? value : { value },
      answered_at: new Date().toISOString(),
    }));
    await db.from('survey_answers').insert(rows);
  }

  // Increment response_count on the share link
  const { data: resp } = await db.from('survey_responses')
    .select('share_link_id').eq('id', responseId).single();
  if (resp?.share_link_id) {
    const { data: link } = await db.from('survey_share_links')
      .select('response_count').eq('id', resp.share_link_id).single();
    if (link) {
      await db.from('survey_share_links')
        .update({ response_count: (link.response_count || 0) + 1 })
        .eq('id', resp.share_link_id);
    }
  }

  return { id: responseId };
}

export async function registerFromSurvey(
  responseId: string,
  email: string,
  password: string,
  fullName: string,
  phone?: string,
): Promise<{ userId: string; credits: number }> {
  // a. Create the user via Supabase Auth
  const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, phone: phone || null },
  });
  if (authErr || !authData?.user) {
    throw new Error(`Failed to create user: ${authErr?.message || 'Unknown auth error'}`);
  }
  const newUserId = authData.user.id;

  // b. Upsert user_profiles
  const { error: profileErr } = await db.from('user_profiles').upsert({
    id: newUserId,
    full_name: fullName,
    phone: phone || null,
    email,
    credit_balance: 20,
  });
  if (profileErr) throw new Error(`Failed to create user profile: ${profileErr.message}`);

  // c. Update survey_responses with registered user
  const { error: respErr } = await db.from('survey_responses')
    .update({
      registered_user_id: newUserId,
      registration_credits_awarded: true,
    })
    .eq('id', responseId);
  if (respErr) throw new Error(`Failed to link response to user: ${respErr.message}`);

  // d. Insert credit transaction
  const { error: creditErr } = await db.from('credit_transactions').insert({
    user_id: newUserId,
    amount: 20,
    type: 'credit',
    source: 'survey_registration',
    description: '问卷注册奖励',
  });
  if (creditErr) throw new Error(`Failed to record credit transaction: ${creditErr.message}`);

  // e. Get the share_link from the response to increment registration_count
  const { data: resp } = await db.from('survey_responses')
    .select('share_link_id')
    .eq('id', responseId)
    .single();
  if (resp?.share_link_id) {
    const { data: linkRow } = await db.from('survey_share_links')
      .select('registration_count')
      .eq('id', resp.share_link_id)
      .single();
    const newRegCount = ((linkRow?.registration_count as number) || 0) + 1;
    await db.from('survey_share_links')
      .update({ registration_count: newRegCount })
      .eq('id', resp.share_link_id);
  }

  // f. Get survey title and upsert into sales_customers
  const { data: respForSurvey } = await db.from('survey_responses')
    .select('survey_id, sales_user_id')
    .eq('id', responseId)
    .single();
  if (respForSurvey) {
    const { data: surveyRow } = await db.from('surveys')
      .select('title_zh')
      .eq('id', respForSurvey.survey_id)
      .single();
    const surveyTitle = surveyRow?.title_zh || '未知问卷';

    const { error: custErr } = await db.from('sales_customers').upsert({
      sales_user_id: respForSurvey.sales_user_id,
      customer_user_id: newUserId,
      source: 'survey',
      registered_at: new Date().toISOString(),
      stage: 'new',
      notes: `通过调研问卷《${surveyTitle}》注册`,
    });
    if (custErr) throw new Error(`Failed to create sales customer record: ${custErr.message}`);
  }

  // g. Return result
  return { userId: newUserId, credits: 20 };
}

export async function endSurvey(
  id: string,
  userId: string,
  userRole: string,
): Promise<void> {
  // Super admins can end any survey; others can only end their own
  if (userRole !== 'super_admin') {
    const { data: survey, error: fetchErr } = await db.from('surveys')
      .select('created_by')
      .eq('id', id)
      .single();
    if (fetchErr || !survey) throw new Error('Survey not found');
    if (survey.created_by !== userId) {
      throw new Error('Permission denied: you can only end surveys you created');
    }
  }

  const { error } = await db.from('surveys')
    .update({ status: 'closed', ended_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(`Failed to end survey: ${error.message}`);
}
