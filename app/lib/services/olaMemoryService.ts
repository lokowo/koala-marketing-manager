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

export async function updateMemoryFromConversation(
  supabase: SupabaseClient,
  userId: string,
  userMessage: string,
  olaResponse: string,
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

  // Academic info extraction — sync to user_profiles + education_history
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

      if (Object.keys(profileUpdates).length > 0) {
        await supabase
          .from('user_profiles' as 'user_profiles')
          .update(profileUpdates as never)
          .eq('id', userId);
      }

      const edu = academicInfo.education as { institution?: string; degree?: string; field?: string; start_year?: number; end_year?: number } | null;
      if (edu?.institution) {
        const { data: existing } = await supabase
          .from('education_history' as 'user_profiles')
          .select('id')
          .eq('user_id', userId)
          .ilike('institution', `%${edu.institution}%`)
          .limit(1);

        if (!existing || existing.length === 0) {
          await supabase
            .from('education_history' as 'user_profiles')
            .insert({
              user_id: userId,
              institution: edu.institution,
              degree_type: edu.degree || 'Other',
              major: edu.field || null,
              start_year: edu.start_year || null,
              end_year: edu.end_year || null,
              status: edu.end_year ? 'completed' : 'current',
            } as never);
        }
      }
    } catch (err) {
      console.error('[olaMemory] academic info sync failed:', err);
    }
  }
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
