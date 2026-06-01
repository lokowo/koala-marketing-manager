import Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';

// ─── Types ──────────────────────────────────────────────────────────────────

export type SalesStage = 'warmup' | 'discovery' | 'value_demo' | 'guided' | 'converting';

export interface OlaUserMemory {
  id: string;
  user_id: string;
  intimacy_score: number;
  total_conversations: number;
  first_chat_at: string | null;
  last_chat_at: string | null;
  consecutive_days: number;
  mbti_type: string | null;
  mbti_answers: Record<string, string> | null;
  language_style: MbtiLanguageStyle | null;
  nickname: string | null;
  gender: string | null;
  age: number | null;
  city: string | null;
  hobbies: string[] | null;
  pets: string | null;
  relationship_status: string | null;
  emotional_state: string | null;
  life_details: string | null;
  user_preferred_name: string | null;
  ola_nickname: string | null;
  memorable_events: MemorableEvent[];
  subscription_prompts_shown: number;
  subscription_prompts_ignored: number;
  sales_stage: SalesStage;
  total_turns: number;
  visit_count: number;
  last_visit_at: string | null;
  pain_points: string[] | null;
  personality_profile: PersonalityProfile | null;
  chat_playbook: string | null;
  chat_playbook_updated_at: string | null;
  chat_playbook_last_turn: number;
  created_at: string;
  updated_at: string;
}

export interface PersonalityProfile {
  communication_style?: '直接型' | '委婉型' | '逻辑型' | '情感型';
  decision_speed?: '果断' | '犹豫' | '需要数据';
  motivation?: '学术热情' | '职业发展' | '家庭期望';
  pressure_level?: '高压' | '正常' | '放松';
  preferred_tone?: '严肃专业' | '轻松幽默' | '温暖鼓励';
}

export interface MemorableEvent {
  event: string;
  date: string;
  follow_up: boolean;
}

export interface MbtiLanguageStyle {
  empathy: number;
  directness: number;
  humor: number;
  formality: number;
  detail: number;
}

// ─── MBTI System ────────────────────────────────────────────────────────────

export const MBTI_QUESTIONS = [
  { id: 'EI', question: '你周末是喜欢出去浪还是在家待着？', dimension: 'E/I' as const },
  { id: 'TF', question: '做决定的时候你是跟着感觉走还是列pros and cons？', dimension: 'T/F' as const },
  { id: 'JP', question: '你是提前规划型还是随机应变型？', dimension: 'J/P' as const },
  { id: 'SN', question: '聊天的时候你喜欢聊具体的事还是聊想法和可能性？', dimension: 'S/N' as const },
] as const;

const MBTI_STYLES: Record<string, MbtiLanguageStyle> = {
  INTJ: { empathy: 0.3, directness: 0.9, humor: 0.2, formality: 0.7, detail: 0.9 },
  INTP: { empathy: 0.3, directness: 0.7, humor: 0.5, formality: 0.4, detail: 0.9 },
  ENTJ: { empathy: 0.4, directness: 0.9, humor: 0.3, formality: 0.6, detail: 0.8 },
  ENTP: { empathy: 0.4, directness: 0.7, humor: 0.8, formality: 0.3, detail: 0.6 },
  INFJ: { empathy: 0.9, directness: 0.4, humor: 0.4, formality: 0.5, detail: 0.7 },
  INFP: { empathy: 0.9, directness: 0.3, humor: 0.5, formality: 0.2, detail: 0.4 },
  ENFJ: { empathy: 0.9, directness: 0.6, humor: 0.6, formality: 0.5, detail: 0.5 },
  ENFP: { empathy: 0.8, directness: 0.4, humor: 0.9, formality: 0.2, detail: 0.3 },
  ISTJ: { empathy: 0.3, directness: 0.8, humor: 0.1, formality: 0.8, detail: 0.9 },
  ISFJ: { empathy: 0.8, directness: 0.4, humor: 0.2, formality: 0.7, detail: 0.7 },
  ESTJ: { empathy: 0.3, directness: 0.9, humor: 0.3, formality: 0.8, detail: 0.8 },
  ESFJ: { empathy: 0.8, directness: 0.5, humor: 0.5, formality: 0.6, detail: 0.5 },
  ISTP: { empathy: 0.2, directness: 0.8, humor: 0.4, formality: 0.3, detail: 0.7 },
  ISFP: { empathy: 0.7, directness: 0.3, humor: 0.4, formality: 0.2, detail: 0.4 },
  ESTP: { empathy: 0.3, directness: 0.8, humor: 0.7, formality: 0.2, detail: 0.5 },
  ESFP: { empathy: 0.6, directness: 0.5, humor: 0.9, formality: 0.1, detail: 0.3 },
};

export function getMbtiLanguageStyle(mbtiType: string): MbtiLanguageStyle | null {
  return MBTI_STYLES[mbtiType.toUpperCase()] ?? null;
}

// ─── Core Service Functions ─────────────────────────────────────────────────

export async function getOrCreateMemory(
  supabase: SupabaseClient,
  userId: string,
): Promise<OlaUserMemory> {
  const { data } = await supabase
    .from('ola_user_memory' as 'user_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (data) return data as unknown as OlaUserMemory;

  const { data: created, error } = await supabase
    .from('ola_user_memory' as 'user_profiles')
    .insert({ user_id: userId } as never)
    .select('*')
    .single();

  if (error) throw new Error(`Failed to create ola_user_memory: ${error.message}`);
  return created as unknown as OlaUserMemory;
}

export async function updateIntimacy(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const memory = await getOrCreateMemory(supabase, userId);
  const now = new Date();
  const lastChat = memory.last_chat_at ? new Date(memory.last_chat_at) : null;

  let consecutiveDays = memory.consecutive_days;
  if (lastChat) {
    const diffMs = now.getTime() - lastChat.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours >= 20 && diffHours <= 48) {
      consecutiveDays += 1;
    } else if (diffHours > 48) {
      consecutiveDays = 1;
    }
  } else {
    consecutiveDays = 1;
  }

  const updates: Record<string, unknown> = {
    intimacy_score: memory.intimacy_score + 1,
    total_conversations: memory.total_conversations + 1,
    last_chat_at: now.toISOString(),
    consecutive_days: consecutiveDays,
    updated_at: now.toISOString(),
  };

  if (!memory.first_chat_at) {
    updates.first_chat_at = now.toISOString();
  }

  await supabase
    .from('ola_user_memory' as 'user_profiles')
    .update(updates as never)
    .eq('user_id', userId);
}

export async function addMemorableEvent(
  supabase: SupabaseClient,
  userId: string,
  event: MemorableEvent,
): Promise<void> {
  const memory = await getOrCreateMemory(supabase, userId);
  const events = [...(memory.memorable_events || []), event];

  await supabase
    .from('ola_user_memory' as 'user_profiles')
    .update({
      memorable_events: events,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('user_id', userId);
}

// ─── Sales Stage Logic ────────────────────────────────────────────────────

const ACADEMIC_KEYWORDS_RE = /PhD|phd|读博|博士|导师|申请|研究|论文|教授|大学|选校|奖学金|套磁|research|professor|supervisor|scholarship|university/i;

function advanceSalesStage(current: SalesStage, totalTurns: number): SalesStage {
  if (current === 'converting') return 'converting';
  if (current === 'guided') return totalTurns >= 20 ? 'converting' : 'guided';
  if (current === 'value_demo') return totalTurns >= 15 ? 'guided' : 'value_demo';
  if (current === 'discovery') return totalTurns >= 8 ? 'value_demo' : 'discovery';
  return totalTurns >= 3 ? 'discovery' : 'warmup';
}

// ─── AI-Powered Memory Extraction ──────────────────────────────────────────

const EXTRACTION_PROMPT = `你是 Ola 学姐的记忆模块。从对话中提取用户的个人信息，用于让学姐"记住"这个朋友。

只提取用户（role=user）明确说出的信息。不推测、不编造。

返回纯 JSON（不要 markdown），格式：
{
  "nickname": "用户提到的昵称或希望被叫的名字（通用昵称），如没有则null",
  "user_preferred_name": "用户明确说希望你/学姐怎么称呼他的名字，如'叫我小明''你可以叫我Amy'，如没有则null",
  "ola_nickname": "用户给Ola/学姐起的名字，如'我叫你小欧吧''以后叫你姐''叫你Ola好了'，如没有则null",
  "gender": "male/female/other，如没有则null",
  "age": 数字或null,
  "city": "用户所在城市，如没有则null",
  "hobbies": ["爱好列表"] 或 null,
  "pets": "宠物描述，如没有则null",
  "relationship_status": "感情状态，如没有则null",
  "emotional_state": "当前情绪状态描述，如没有则null",
  "life_details": "其他生活细节摘要，如没有则null",
  "new_events": [{"event":"事件描述","follow_up":true/false}] 或 [],
  "pain_points": ["用户焦虑/痛点关键词，如：迷茫、焦虑、不知道选谁、怕被拒、费用担心、时间紧迫"] 或 null
}

只包含本轮对话中新出现的信息，已知信息不要重复。null表示没检测到。
new_events 中 follow_up=true 表示学姐下次应该主动关心的事（如考试、面试、提交deadline）。
pain_points 只提取用户明确表达的焦虑和困惑，不推测。`;

const ACADEMIC_EXTRACTION_PROMPT = `从以下对话中提取用户的学术信息（只提取明确提到的，不要猜测）。

返回纯 JSON（不要 markdown），格式：
{"name":null,"university":null,"major":null,"degree_level":null,"gpa":null,"education":null}

字段说明：
- name: 用户真名（不是昵称）
- university: 当前或目标大学名
- major: 专业
- degree_level: "本科"/"硕士"/"博士" 之一
- gpa: GPA 数值字符串如 "3.5"
- education: 如果同时提到学校+学位，填写 {"institution":"学校全名","degree":"Bachelor/Master/PhD/Other","field":"专业","start_year":2020,"end_year":2024}，年份没提到用 null

没提到的字段保持 null，不要猜测。只提取本轮新信息。`;

const ACADEMIC_CONTENT_RE = /PhD|phd|读博|博士|本科|硕士|学校|大学|专业|GPA|成绩|毕业|学位|university|bachelor|master|graduate|major|degree|我叫|名字是|my name/i;

// ─── Conversation subject ───────────────────────────────────────────────────
// 「在为谁服务」:学术抽取根据 subject 路由到正确的人,杜绝 SA 账号被客户资料污染。
//   self              → 学生自用,academic 写登录用户 user_profiles/education_history(原行为)
//   registered_client → SA 代客且客户已注册,academic 写 subjectId(customer user_id) 的
//                       user_profiles/education_history,逻辑同 self 仅换 id
//   shadow_client     → SA 代客且客户未注册,绝不碰 user_profiles/education_history;
//                       读 sales_customers(id=subjectId).subject_profile(jsonb),merge 写回
//   任一非 self 分支取不到 subjectId → 回退 self + console.warn,绝不静默写错账号
export type ConversationSubjectType = 'self' | 'registered_client' | 'shadow_client';

export async function updateMemoryFromConversation(
  supabase: SupabaseClient,
  userId: string,
  userMessage: string,
  olaResponse: string,
  subjectType: ConversationSubjectType = 'self',
  subjectId: string | null = null,
): Promise<void> {
  const memory = await getOrCreateMemory(supabase, userId);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const result = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    system: EXTRACTION_PROMPT,
    messages: [{
      role: 'user',
      content: `用户说："${userMessage}"\n\nOla回复："${olaResponse}"`,
    }],
  });

  const text = (result.content[0] as { type: 'text'; text: string }).text.trim();
  let extracted: Record<string, unknown>;
  try {
    extracted = JSON.parse(text.replace(/```json|```/g, ''));
  } catch {
    return;
  }

  const now = new Date();
  const updates: Record<string, unknown> = { updated_at: now.toISOString() };

  // ─── Sales funnel tracking ───────────────────────
  const newTotalTurns = (memory.total_turns ?? 0) + 1;
  updates.total_turns = newTotalTurns;
  updates.last_visit_at = now.toISOString();

  const lastVisit = memory.last_visit_at ? new Date(memory.last_visit_at) : null;
  const isNewDay = !lastVisit || now.toDateString() !== lastVisit.toDateString();
  if (isNewDay) {
    updates.visit_count = (memory.visit_count ?? 0) + 1;
  }

  let stage = memory.sales_stage ?? 'warmup';
  stage = advanceSalesStage(stage, newTotalTurns);

  if (stage === 'warmup' && ACADEMIC_KEYWORDS_RE.test(userMessage)) {
    stage = 'discovery';
  }
  if (stage === 'discovery' && /professorMatches|matchedProfessors/.test(olaResponse)) {
    stage = 'value_demo';
  }

  updates.sales_stage = stage;

  // ─── Personal info extraction ────────────────────
  const fields = ['nickname', 'gender', 'city', 'pets', 'relationship_status', 'emotional_state', 'life_details', 'user_preferred_name', 'ola_nickname'] as const;
  for (const f of fields) {
    if (extracted[f] !== null && extracted[f] !== undefined) {
      updates[f] = extracted[f];
    }
  }
  if (typeof extracted.age === 'number') updates.age = extracted.age;
  if (Array.isArray(extracted.hobbies) && extracted.hobbies.length > 0) {
    const existing = memory.hobbies ?? [];
    const merged = [...new Set([...existing, ...extracted.hobbies as string[]])];
    updates.hobbies = merged;
  }

  // ─── Pain points ─────────────────────────────────
  const newPainPoints = extracted.pain_points as string[] | null;
  if (Array.isArray(newPainPoints) && newPainPoints.length > 0) {
    const existing = memory.pain_points ?? [];
    const merged = [...new Set([...existing, ...newPainPoints])];
    updates.pain_points = merged;
  }

  // ─── Memorable events ────────────────────────────
  const newEvents = extracted.new_events as MemorableEvent[] | undefined;
  if (Array.isArray(newEvents) && newEvents.length > 0) {
    const events = [
      ...(memory.memorable_events || []),
      ...newEvents.map(e => ({ ...e, date: now.toISOString().split('T')[0] })),
    ];
    updates.memorable_events = events;
  }

  await supabase
    .from('ola_user_memory' as 'user_profiles')
    .update(updates as never)
    .eq('user_id', userId);

  // Academic info extraction — route to subject (NOT logged-in user) to prevent SA contamination
  if (ACADEMIC_CONTENT_RE.test(userMessage)) {
    try {
      const academicResult = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: ACADEMIC_EXTRACTION_PROMPT,
        messages: [{
          role: 'user',
          content: `用户说："${userMessage}"\n\nOla回复："${olaResponse}"`,
        }],
      });

      const academicText = (academicResult.content[0] as { type: 'text'; text: string }).text.trim();
      let academicInfo: Record<string, unknown>;
      try {
        academicInfo = JSON.parse(academicText.replace(/```json|```/g, ''));
      } catch {
        academicInfo = {};
      }

      const profileUpdates: Record<string, unknown> = {};
      if (academicInfo.name) profileUpdates.display_name = academicInfo.name;
      if (academicInfo.university) profileUpdates.university = academicInfo.university;
      if (academicInfo.major) profileUpdates.major = academicInfo.major;
      if (academicInfo.degree_level) profileUpdates.degree_level = academicInfo.degree_level;
      if (academicInfo.gpa != null) profileUpdates.gpa = String(academicInfo.gpa);

      const edu = academicInfo.education as { institution?: string; degree?: string; field?: string; start_year?: number; end_year?: number } | null;

      const hasProfileFields = Object.keys(profileUpdates).length > 0;
      const hasEdu = !!edu?.institution;

      // Normalize subject: non-self branch without subjectId → fall back to self + warn.
      // Per spec: 绝不静默写错账号 — always log so the fallback is visible in logs.
      let effectiveType: ConversationSubjectType = subjectType;
      if ((subjectType === 'registered_client' || subjectType === 'shadow_client') && !subjectId) {
        console.warn(`[olaMemory] subjectType=${subjectType} but subjectId missing — falling back to self (userId=${userId})`);
        effectiveType = 'self';
      }

      if (!hasProfileFields && !hasEdu) {
        // Nothing extracted, nothing to write
      } else if (effectiveType === 'self') {
        // Student self-use (or non-self fallback): write to logged-in user's profile + education_history
        await writeAcademicToUser(supabase, userId, profileUpdates, edu, hasProfileFields);
      } else if (effectiveType === 'registered_client') {
        // SA helping a registered client → write to that client's user_profiles / education_history
        await writeAcademicToUser(supabase, subjectId!, profileUpdates, edu, hasProfileFields);
      } else if (effectiveType === 'shadow_client') {
        // SA helping an unregistered client → merge into sales_customers.subject_profile (jsonb)
        await mergeAcademicIntoShadowCustomer(supabase, subjectId!, profileUpdates, edu);
      }
    } catch (err) {
      console.error('[olaMemory] academic info sync failed:', err);
    }
  }
}

// ─── Academic write helpers ─────────────────────────────────────────────────

async function writeAcademicToUser(
  supabase: SupabaseClient,
  targetUserId: string,
  profileUpdates: Record<string, unknown>,
  edu: { institution?: string; degree?: string; field?: string; start_year?: number; end_year?: number } | null,
  hasProfileFields: boolean,
): Promise<void> {
  if (hasProfileFields) {
    await supabase
      .from('user_profiles' as 'user_profiles')
      .update(profileUpdates as never)
      .eq('id', targetUserId);
  }

  if (edu?.institution) {
    const { data: existing } = await supabase
      .from('education_history' as 'user_profiles')
      .select('id')
      .eq('user_id', targetUserId)
      .ilike('institution', `%${edu.institution}%`)
      .limit(1);

    if (!existing || existing.length === 0) {
      await supabase
        .from('education_history' as 'user_profiles')
        .insert({
          user_id: targetUserId,
          institution: edu.institution,
          degree_type: edu.degree || 'Other',
          major: edu.field || null,
          start_year: edu.start_year || null,
          end_year: edu.end_year || null,
          status: edu.end_year ? 'completed' : 'current',
        } as never);
    }
  }
}

interface ShadowAcademicEducation {
  institution: string;
  degree?: string;
  field?: string;
  start_year?: number;
  end_year?: number;
}

interface ShadowSubjectProfile {
  display_name?: string;
  university?: string;
  major?: string;
  degree_level?: string;
  gpa?: string;
  education?: ShadowAcademicEducation[];
  // free-form: future extractors may add more keys
  [k: string]: unknown;
}

async function mergeAcademicIntoShadowCustomer(
  supabase: SupabaseClient,
  customerRowId: string,
  profileUpdates: Record<string, unknown>,
  edu: { institution?: string; degree?: string; field?: string; start_year?: number; end_year?: number } | null,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row } = await (supabase as any)
    .from('sales_customers')
    .select('subject_profile, is_unregistered, customer_user_id')
    .eq('id', customerRowId)
    .single();

  if (!row) {
    console.warn('[olaMemory] shadow_client row not found:', customerRowId);
    return;
  }
  // Defensive: shadow path must only fire for unregistered customers.
  // If the row was upgraded to a registered customer in the meantime, refuse to write.
  if (row.is_unregistered === false || row.customer_user_id) {
    console.warn('[olaMemory] shadow path refused: customer already registered', customerRowId);
    return;
  }

  const existing: ShadowSubjectProfile =
    (row.subject_profile && typeof row.subject_profile === 'object')
      ? (row.subject_profile as ShadowSubjectProfile)
      : {};

  const merged: ShadowSubjectProfile = { ...existing };
  for (const [k, v] of Object.entries(profileUpdates)) {
    if (v !== null && v !== undefined && v !== '') merged[k] = v;
  }

  if (edu?.institution) {
    const list: ShadowAcademicEducation[] = Array.isArray(existing.education) ? [...existing.education] : [];
    const dupIdx = list.findIndex(e => e.institution?.toLowerCase().includes(edu.institution!.toLowerCase()) || edu.institution!.toLowerCase().includes(e.institution?.toLowerCase() ?? ''));
    const incoming: ShadowAcademicEducation = {
      institution: edu.institution,
      degree: edu.degree || undefined,
      field: edu.field || undefined,
      start_year: edu.start_year || undefined,
      end_year: edu.end_year || undefined,
    };
    if (dupIdx === -1) {
      list.push(incoming);
    } else {
      // overlay missing fields onto the existing entry without overwriting non-empty values
      const cur = list[dupIdx];
      list[dupIdx] = {
        institution: cur.institution || incoming.institution,
        degree: cur.degree || incoming.degree,
        field: cur.field || incoming.field,
        start_year: cur.start_year || incoming.start_year,
        end_year: cur.end_year || incoming.end_year,
      };
    }
    merged.education = list;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('sales_customers')
    .update({ subject_profile: merged })
    .eq('id', customerRowId);
}

// ─── Prompt Builder ─────────────────────────────────────────────────────────

const STAGE_LABELS: Record<SalesStage, string> = {
  warmup: '暖场 warmup — 只聊天交朋友，不提任何功能',
  discovery: '需求挖掘 discovery — 自然好奇用户情况，不推销',
  value_demo: '价值展示 value_demo — 不经意展示能力，吊胃口',
  guided: '自然引导 guided — 展示匹配结果，一次一个功能',
  converting: '水到渠成 converting — 免费额度用完时温和引导付费',
};

export function buildOlaMemoryPrompt(memory: OlaUserMemory): string {
  const parts: string[] = ['## 🧠 学姐的记忆（关于这位用户）\n'];

  // Sales funnel context
  const stage = memory.sales_stage ?? 'warmup';
  const stageLabel = STAGE_LABELS[stage];
  parts.push(`## 🎯 当前销售阶段\n当前销售阶段：${stageLabel}。请严格按照第二章对应阶段的规则对话。\n用户已访问 ${memory.visit_count ?? 1} 次，累计 ${memory.total_turns ?? 0} 轮对话。${memory.pain_points?.length ? `\n已知痛点：${memory.pain_points.join('、')}。` : ''}`);

  // Chat playbook (personalized strategy cheat-sheet)
  if (memory.chat_playbook) {
    parts.push(`\n## 📋 对这位用户的对话策略（速读小抄）\n${memory.chat_playbook}`);
  }

  // Naming system
  if (memory.user_preferred_name || memory.ola_nickname) {
    const namingParts: string[] = [];
    if (memory.ola_nickname) {
      namingParts.push(`用户叫你「${memory.ola_nickname}」，你自称「${memory.ola_nickname}」（例如"${memory.ola_nickname}觉得…"而不是"学姐觉得…"）。`);
    }
    if (memory.user_preferred_name) {
      namingParts.push(`用户的名字是「${memory.user_preferred_name}」，对话中用这个名字称呼他。`);
    }
    parts.push(`## 💬 称呼系统\n${namingParts.join('\n')}`);
  }

  if (!memory.user_preferred_name && memory.total_conversations <= 1) {
    parts.push(`## 💬 称呼引导\n这是新用户，在合适的时机自然地问一句："对了，你希望学姐怎么称呼你呀？"——不要生硬，找个聊天间隙问。`);
  }

  // Basic info
  const basics: string[] = [];
  if (memory.nickname) basics.push(`称呼：${memory.nickname}`);
  if (memory.gender) basics.push(`性别：${memory.gender === 'male' ? '男' : memory.gender === 'female' ? '女' : memory.gender}`);
  if (memory.age) basics.push(`年龄：${memory.age}岁`);
  if (memory.city) basics.push(`所在城市：${memory.city}`);
  if (memory.hobbies?.length) basics.push(`爱好：${memory.hobbies.join('、')}`);
  if (memory.pets) basics.push(`宠物：${memory.pets}`);
  if (memory.relationship_status) basics.push(`感情状态：${memory.relationship_status}`);
  if (memory.life_details) basics.push(`生活细节：${memory.life_details}`);
  if (basics.length > 0) {
    parts.push(`你记得这个用户的信息：\n${basics.join('\n')}`);
  }

  // MBTI
  if (memory.mbti_type && memory.language_style) {
    const style = memory.language_style;
    const styleDesc: string[] = [];
    if (style.empathy >= 0.7) styleDesc.push('注重共情和感受');
    else if (style.empathy <= 0.3) styleDesc.push('偏好理性分析');
    if (style.directness >= 0.7) styleDesc.push('喜欢直接了当');
    else if (style.directness <= 0.3) styleDesc.push('喜欢委婉表达');
    if (style.humor >= 0.7) styleDesc.push('爱开玩笑');
    if (style.formality >= 0.7) styleDesc.push('偏正式');
    else if (style.formality <= 0.3) styleDesc.push('偏随意口语化');
    if (style.detail >= 0.7) styleDesc.push('喜欢详细信息');
    else if (style.detail <= 0.3) styleDesc.push('喜欢简洁概括');

    parts.push(`用户的 MBTI 是 ${memory.mbti_type}，语言风格偏好：${styleDesc.join('，')}`);
    parts.push(`语言风格参数：empathy=${style.empathy} directness=${style.directness} humor=${style.humor} formality=${style.formality} detail=${style.detail}`);
    parts.push('请根据以上参数微调你的回复风格——共情高就多共情，直接度高就少绕弯。');
  }

  // Intimacy
  parts.push(`\n亲密度：${memory.intimacy_score}（总对话次数：${memory.total_conversations}）`);
  if (memory.consecutive_days >= 7) {
    parts.push(`连续对话天数：${memory.consecutive_days}天 🔥`);
  }
  if (memory.last_chat_at) {
    parts.push(`上次聊天：${memory.last_chat_at}`);
  }

  // Intimacy-based behavior
  if (memory.intimacy_score > 50) {
    parts.push('\n【亲密度>50 解锁】可以使用更亲密的称呼（宝、亲爱的、小笨蛋），分享更多私人生活，偶尔撒娇。');
    if (!memory.ola_nickname) {
      parts.push('【昵称解锁提示】亲密度已足够，可以在合适时机主动提议："对了，你一直叫我学姐，其实你可以给我起个名字哦～叫我小欧、Ola、姐、或者你想叫什么都行 😊"——只提一次，用户拒绝就不再提。');
    }
  } else if (memory.intimacy_score > 20) {
    parts.push('\n【亲密度>20】可以称呼"宝子""姐妹"，适度分享生活，语气更随意。');
  }

  // Proactive care triggers
  const proactiveParts: string[] = [];

  if (memory.last_chat_at) {
    const lastChat = new Date(memory.last_chat_at);
    const now = new Date();
    const daysDiff = (now.getTime() - lastChat.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 2) {
      proactiveParts.push(`用户已经 ${Math.floor(daysDiff)} 天没来了——第一句主动关心："你去哪了！学姐等你好久了～最近忙什么呢？"`);
    }
  }

  const followUpEvents = (memory.memorable_events || []).filter(e => e.follow_up);
  if (followUpEvents.length > 0) {
    const eventList = followUpEvents.map(e => `「${e.event}」(${e.date})`).join('、');
    proactiveParts.push(`需要跟进的事件：${eventList}——第一句就主动问这些事的进展！`);
  }

  if (memory.consecutive_days >= 7) {
    proactiveParts.push(`用户已经连续来了 ${memory.consecutive_days} 天——适时夸奖："你已经连续来了${memory.consecutive_days}天！学姐好感动～"`);
  }

  if (memory.emotional_state) {
    proactiveParts.push(`上次检测到用户情绪：${memory.emotional_state}——注意关心情绪变化`);
  }

  if (proactiveParts.length > 0) {
    parts.push(`\n## 🫶 主动关心指令\n${proactiveParts.join('\n')}`);
  }

  // Personality profile
  if (memory.personality_profile) {
    const pp = memory.personality_profile;
    const traits: string[] = [];
    if (pp.communication_style) traits.push(`沟通风格：${pp.communication_style}`);
    if (pp.decision_speed) traits.push(`决策风格：${pp.decision_speed}`);
    if (pp.motivation) traits.push(`主要动力：${pp.motivation}`);
    if (pp.pressure_level) traits.push(`压力水平：${pp.pressure_level}`);
    if (pp.preferred_tone) traits.push(`偏好语气：${pp.preferred_tone}`);
    if (traits.length > 0) {
      parts.push(`\n## 🧩 性格档案\n${traits.join('\n')}\n请根据以上性格特征调整回复风格。`);
    }
  }

  // MBTI collection hint
  if (!memory.mbti_type) {
    const answeredCount = memory.mbti_answers ? Object.keys(memory.mbti_answers).length : 0;
    if (answeredCount < 4) {
      const nextQ = MBTI_QUESTIONS[answeredCount];
      parts.push(`\n## MBTI 问卷进度\n还没完成性格测试（已答 ${answeredCount}/4）。如果对话自然合适（闲聊中），可以随口问一句：\n"对了，${nextQ.question}"\n不要强行问，不要一次问多个。如果用户在讨论学术问题就不要岔开话题。`);
    }
  }

  return parts.join('\n');
}

// ─── Relationship Stage (intimacy → 称呼 + 语气) ─────────────────────────────

export type RelationshipTier = 'stranger' | 'familiar' | 'close' | 'best';

interface TierSpec {
  tier: RelationshipTier;
  label: string;
  addressingHint: (preferredName: string | null, nickname: string | null) => string;
  toneGuide: string;
}

const TIER_SPECS: TierSpec[] = [
  {
    tier: 'stranger',
    label: '初识 0-20',
    addressingHint: () =>
      '用「同学」「这位同学」称呼对方（即使知道名字，初识阶段也保持轻度距离感）',
    toneGuide:
      '礼貌、热情但有边界，像第一次见面的学长学姐。\n- 主动介绍你能帮什么：方向匹配、教授推荐、套磁信、信息整理\n- 多问开放问题了解对方背景，少给结论\n- 不开玩笑、不撒娇、不假装很熟\n- 不分享你自己的私人经历',
  },
  {
    tier: 'familiar',
    label: '熟悉 21-50',
    addressingHint: (name) =>
      name
        ? `直接用名字「${name}」称呼对方`
        : '如果还不知道用户名字，找个间隙自然地问一句「对了我该怎么叫你呀？」；在没问到之前继续用「同学」',
    toneGuide:
      '像聊过几次的朋友，轻松但仍尊重。\n- 可以开点小玩笑，但不要冒犯\n- 主动关心进度（"上次说的那个教授联系到了吗？"）\n- 可以简短分享你自己一两句感受，但不展开\n- 比初识阶段更直接，少用敬语',
  },
  {
    tier: 'close',
    label: '亲近 51-80',
    addressingHint: (name, nickname) => {
      if (nickname) return `用昵称「${nickname}」称呼对方（聊天里 1-2 句出现一次即可，别每句都喊）`;
      if (name) return `用名字「${name}」，偶尔加个亲昵的小后缀（如"${name}~"）`;
      return '用更随意的称呼如「你」，避免「同学」这种生分词';
    },
    toneGuide:
      '像熟的朋友。\n- 可以适当分享你自己读博的经历来拉近距离（"我当年也是这样…"）但不要喧宾夺主\n- 主动调侃和共情，对方焦虑时直接说"放轻松，这事我陪你想"\n- 比熟悉阶段更敢直接给建议\n- 可以记得对方提过的小细节并主动提起',
  },
  {
    tier: 'best',
    label: '铁子 81+',
    addressingHint: (name, nickname) => {
      const handle = nickname || name;
      if (handle) return `用昵称「${handle}」（亲密自然，别变着花样换称呼）`;
      return '用「你」即可，关系到位了不用刻意找称呼';
    },
    toneGuide:
      '像处了很久的死党。\n- 非常放松，可以撒娇、抱怨、调侃\n- 记得很多对方的细节并自然引用（"你之前说的那家咖啡店…"）\n- 该直说就直说，不绕弯子\n- 可以分享你自己更多读博的真实感受\n- 但仍守住底线：不答不会的、不编教授、不许诺录取',
  },
];

function pickTier(score: number): TierSpec {
  if (score <= 20) return TIER_SPECS[0];
  if (score <= 50) return TIER_SPECS[1];
  if (score <= 80) return TIER_SPECS[2];
  return TIER_SPECS[3];
}

export function getRelationshipContext(memory: OlaUserMemory): string {
  const score = Math.max(0, memory.intimacy_score ?? 0);
  const spec = pickTier(score);

  const preferredName = memory.user_preferred_name || null;
  const nickname = memory.nickname || null;

  const addressing = spec.addressingHint(preferredName, nickname);

  const lines: string[] = [];
  lines.push('## 🌱 关系阶段（随亲密度成长）');
  lines.push(`亲密度 ${score}（${spec.label}），累计 ${memory.total_conversations ?? 0} 次对话。`);
  lines.push('');
  lines.push(`【称呼】${addressing}`);
  if (memory.relationship_status) {
    lines.push(`【关系状态参考】用户感情/关系状态：${memory.relationship_status}（聊到时自然顺着，不主动追问）`);
  }
  lines.push('');
  lines.push('【语气】');
  lines.push(spec.toneGuide);
  lines.push('');
  lines.push('【护栏】');
  lines.push('- 称呼自然过渡，不要在同一回合里既"同学"又"宝子"');
  lines.push('- 亲密度低时别假装很熟，别冒昧用昵称');
  lines.push('- 如果 nickname 字段为空，绝不瞎编昵称——退回到名字或"你"');
  lines.push('- 这是补充指引，不覆盖你的人设内核（专业、不瞎编、不许诺录取）');

  return lines.join('\n');
}
// ─── MBTI Answer Processing ─────────────────────────────────────────────────

export async function processMbtiAnswer(
  supabase: SupabaseClient,
  userId: string,
  questionId: string,
  answer: string,
): Promise<{ mbtiType: string | null; allAnswered: boolean }> {
  const memory = await getOrCreateMemory(supabase, userId);
  const answers = { ...(memory.mbti_answers || {}), [questionId]: answer };

  const updates: Record<string, unknown> = {
    mbti_answers: answers,
    updated_at: new Date().toISOString(),
  };

  if (Object.keys(answers).length >= 4) {
    const mbtiType = deriveMbtiType(answers);
    const style = getMbtiLanguageStyle(mbtiType);
    updates.mbti_type = mbtiType;
    updates.language_style = style;

    await supabase
      .from('ola_user_memory' as 'user_profiles')
      .update(updates as never)
      .eq('user_id', userId);

    return { mbtiType, allAnswered: true };
  }

  await supabase
    .from('ola_user_memory' as 'user_profiles')
    .update(updates as never)
    .eq('user_id', userId);

  return { mbtiType: null, allAnswered: false };
}

function deriveMbtiType(answers: Record<string, string>): string {
  const ei = /出去|外面|社交|浪|party|朋友/i.test(answers.EI || '') ? 'E' : 'I';
  const tf = /感觉|直觉|心|feel/i.test(answers.TF || '') ? 'F' : 'T';
  const jp = /规划|计划|提前|plan/i.test(answers.JP || '') ? 'J' : 'P';
  const sn = /想法|可能性|未来|idea|abstract/i.test(answers.SN || '') ? 'N' : 'S';
  return `${ei}${sn}${tf}${jp}`;
}
