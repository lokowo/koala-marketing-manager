import Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';

const MEMORY_CATEGORIES = [
  'education',
  'academic',
  'research',
  'publication',
  'preference',
  'personal',
  'experience',
  'skill',
  'language',
] as const;

export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

export interface Memory {
  id?: string;
  user_id: string;
  memory_text: string;
  category: MemoryCategory;
  confidence: number;
  source_conversation_id?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface GroupedMemories {
  [category: string]: Memory[];
}

const EXTRACTION_PROMPT = `你是一个记忆提取引擎。从用户与AI的对话中提取用户明确说过的关键事实。

规则：
1. 只提取用户（role=user）明确说出的事实，不提取AI的回复内容
2. 不推测、不编造、不扩展用户没说的信息
3. 每条记忆是一个独立的、可验证的事实陈述
4. confidence 表示确定程度：1.0=用户明确说了, 0.8=从上下文可合理推断, 0.6=隐含但不完全确定
5. 不要提取太泛的信息（如"想读PhD"这种几乎所有用户都有的意图）
6. 合并同类信息为一条记忆（如多次提到同一个学校，只记一条）
7. 记忆文本用简洁的陈述句，保留关键细节

category 枚举：
- education: 学校、专业、学历、GPA、毕业时间
- academic: 学术背景、课程、成绩、学术荣誉
- research: 研究方向、研究经历、实验室、课题
- publication: 论文、发表、引用、期刊
- preference: 偏好城市、目标学校、入学时间、预算
- personal: 姓名、年龄、国籍、性格特点
- experience: 工作经历、实习、项目经验
- skill: 技能、语言能力、编程、工具
- language: 英语水平、雅思/托福成绩、其他语言

返回纯 JSON 数组，不要 markdown 代码块：
[{"memory_text": "...", "category": "...", "confidence": 0.8}]

如果对话中没有可提取的新事实，返回空数组 []。`;

export async function extractMemories(
  messages: Array<{ role: string; content: string }>,
  userId: string,
  conversationId?: string,
): Promise<Array<{ memory_text: string; category: MemoryCategory; confidence: number }>> {
  if (messages.length === 0) return [];

  const userMessages = messages.filter(m => m.role === 'user');
  if (userMessages.length === 0) return [];

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[memoryService] extractMemories skipped: no ANTHROPIC_API_KEY');
    return [];
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const conversationText = messages
    .map(m => `[${m.role}]: ${m.content}`)
    .join('\n\n');

  let response;
  try {
    response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      system: EXTRACTION_PROMPT,
      messages: [
        {
          role: 'user',
          content: `从以下对话中提取用户的关键事实：\n\n${conversationText}`,
        },
      ],
    });
  } catch (err) {
    console.error('[memoryService] Failed to call AI for memory extraction:', err);
    return [];
  }

  const raw = (response.content[0] as { type: 'text'; text: string }).text.trim();
  const cleaned = raw.replace(/```json|```/g, '').trim();

  try {
    const parsed = JSON.parse(cleaned) as Array<{
      memory_text: string;
      category: string;
      confidence: number;
    }>;

    return parsed
      .filter(
        m =>
          m.memory_text &&
          MEMORY_CATEGORIES.includes(m.category as MemoryCategory) &&
          typeof m.confidence === 'number' &&
          m.confidence >= 0.6,
      )
      .map(m => ({
        memory_text: m.memory_text,
        category: m.category as MemoryCategory,
        confidence: Math.min(1, Math.max(0, m.confidence)),
      }));
  } catch (parseErr) {
    console.error('[memoryService] Failed to parse extracted memories. Raw:', cleaned.slice(0, 200), 'Error:', parseErr);
    return [];
  }
}

export async function saveMemories(
  supabase: SupabaseClient,
  userId: string,
  memories: Array<{ memory_text: string; category: MemoryCategory; confidence: number }>,
  conversationId?: string,
): Promise<void> {
  if (memories.length === 0) return;

  const { data: existing } = await supabase
    .from('user_memories')
    .select('id, memory_text, category, confidence')
    .eq('user_id', userId)
    .eq('is_active', true);

  const existingMemories = existing ?? [];

  for (const mem of memories) {
    const conflicts = existingMemories.filter(e => e.category === mem.category);

    const conflicting = conflicts.find(e => isConflicting(e.memory_text, mem.memory_text, mem.category));

    if (conflicting) {
      await supabase
        .from('user_memories')
        .update({
          memory_text: mem.memory_text,
          confidence: mem.confidence,
          source_conversation_id: conversationId ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conflicting.id);
    } else {
      const isDuplicate = conflicts.some(
        e => e.memory_text.toLowerCase() === mem.memory_text.toLowerCase(),
      );
      if (!isDuplicate) {
        await supabase.from('user_memories').insert({
          user_id: userId,
          memory_text: mem.memory_text,
          category: mem.category,
          confidence: mem.confidence,
          source_conversation_id: conversationId ?? null,
          is_active: true,
        });
      }
    }
  }
}

function isConflicting(oldText: string, newText: string, category: MemoryCategory): boolean {
  const old = oldText.toLowerCase();
  const neu = newText.toLowerCase();

  if (old === neu) return false;

  if (category === 'education') {
    if (/gpa/i.test(old) && /gpa/i.test(neu)) return true;
    if (/学校|大学|university/i.test(old) && /学校|大学|university/i.test(neu)) return true;
    if (/专业|major/i.test(old) && /专业|major/i.test(neu)) return true;
    if (/学历|学位|degree/i.test(old) && /学历|学位|degree/i.test(neu)) return true;
  }

  if (category === 'language') {
    if (/雅思|ielts/i.test(old) && /雅思|ielts/i.test(neu)) return true;
    if (/托福|toefl/i.test(old) && /托福|toefl/i.test(neu)) return true;
  }

  if (category === 'preference') {
    if (/入学|start|semester/i.test(old) && /入学|start|semester/i.test(neu)) return true;
    if (/预算|budget/i.test(old) && /预算|budget/i.test(neu)) return true;
  }

  if (category === 'personal') {
    if (/姓名|名字|name/i.test(old) && /姓名|名字|name/i.test(neu)) return true;
  }

  return false;
}

export async function loadMemories(
  supabase: SupabaseClient,
  userId: string,
): Promise<GroupedMemories> {
  const { data, error } = await supabase
    .from('user_memories')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('category')
    .order('confidence', { ascending: false });

  if (error || !data) return {};

  const grouped: GroupedMemories = {};
  for (const row of data) {
    const cat = row.category as string;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(row as Memory);
  }

  return grouped;
}

export function formatMemoriesForPrompt(memories: GroupedMemories): string {
  const entries = Object.entries(memories);
  if (entries.length === 0) return '';

  const CATEGORY_LABELS: Record<string, string> = {
    education: '教育背景',
    academic: '学术背景',
    research: '研究方向',
    publication: '论文发表',
    preference: '申请偏好',
    personal: '个人信息',
    experience: '工作经历',
    skill: '技能特长',
    language: '语言能力',
  };

  const lines = entries.map(([cat, mems]) => {
    const label = CATEGORY_LABELS[cat] || cat;
    const items = mems.map(m => m.memory_text).join('；');
    return `【${label}】${items}`;
  });

  return `## 你对这个用户已有的了解（来自历史对话的模糊记忆）
${lines.join('\n')}

基于这些已知信息自然对话，不要重复询问已知信息。
当用户提供新信息时自然接收，不需要确认"你之前说的是XX，现在改了吗？"`;
}

export async function syncToProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  let memories: GroupedMemories;
  try {
    memories = await loadMemories(supabase, userId);
  } catch (err) {
    console.error('[memoryService] syncToProfile failed to load memories:', err);
    return;
  }

  const entries = Object.entries(memories);
  if (entries.length === 0) return;

  const allTexts = entries
    .map(([cat, mems]) => `[${cat}] ${mems.map(m => m.memory_text).join('; ')}`)
    .join('\n');

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[memoryService] syncToProfile skipped: no ANTHROPIC_API_KEY');
    return;
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let response;
  try {
    response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: `将以下用户记忆碎片合成为结构化 JSON，用于 user_profiles 表更新。
只包含有明确信息的字段，不确定的不要填。返回纯 JSON。

可用字段（全部可选）：
{
  "university": "学校名",
  "major": "专业",
  "degree_level": "本科/硕士/博士",
  "gpa": "GPA数值字符串",
  "gpa_scale": "满分制",
  "target_field": "目标研究方向",
  "target_universities": ["目标大学数组"],
  "english_level": "英语水平",
  "has_research_experience": true/false,
  "research_description": "科研经历",
  "has_publications": true/false,
  "publication_details": "论文详情",
  "career_goal": "职业目标",
  "preferred_city": ["偏好城市"],
  "budget": "经费情况",
  "start_semester": "入学时间",
  "work_experience": "工作经历",
  "strengths": ["特长数组"],
  "research_interests": ["研究兴趣数组"],
  "language_preference": "语言偏好"
}`,
      messages: [
        {
          role: 'user',
          content: `用户记忆碎片：\n${allTexts}`,
        },
      ],
    });
  } catch (err) {
    console.error('[memoryService] syncToProfile AI call failed:', err);
    return;
  }

  try {
    const raw = (response.content[0] as { type: 'text'; text: string }).text.trim();
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const profile = JSON.parse(cleaned) as Record<string, unknown>;

    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(profile)) {
      if (value !== null && value !== undefined && value !== '') {
        updates[key] = value;
      }
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from('user_profiles').update(updates).eq('id', userId);
    }
  } catch {
    console.error('[memoryService] syncToProfile parse failed');
  }
}

export function profileCardToMemories(
  profile: Record<string, unknown>,
): Array<{ memory_text: string; category: MemoryCategory; confidence: number }> {
  const memories: Array<{ memory_text: string; category: MemoryCategory; confidence: number }> = [];

  if (profile.university) {
    memories.push({
      memory_text: `就读于${profile.university}`,
      category: 'education',
      confidence: 1.0,
    });
  }
  if (profile.major) {
    memories.push({
      memory_text: `专业是${profile.major}`,
      category: 'education',
      confidence: 1.0,
    });
  }
  if (profile.degree_level) {
    memories.push({
      memory_text: `学历：${profile.degree_level}`,
      category: 'education',
      confidence: 1.0,
    });
  }
  if (profile.gpa) {
    const scale = profile.gpa_scale ? `/${profile.gpa_scale}` : '';
    memories.push({
      memory_text: `GPA ${profile.gpa}${scale}`,
      category: 'education',
      confidence: 1.0,
    });
  }
  if (profile.english_level) {
    memories.push({
      memory_text: `英语水平：${profile.english_level}`,
      category: 'language',
      confidence: 1.0,
    });
  }
  if (profile.target_field) {
    memories.push({
      memory_text: `目标研究方向：${profile.target_field}`,
      category: 'preference',
      confidence: 1.0,
    });
  }
  if (profile.career_goal) {
    memories.push({
      memory_text: `职业目标：${profile.career_goal}`,
      category: 'preference',
      confidence: 1.0,
    });
  }
  if (Array.isArray(profile.research_interests) && profile.research_interests.length > 0) {
    memories.push({
      memory_text: `研究兴趣：${(profile.research_interests as string[]).join('、')}`,
      category: 'research',
      confidence: 1.0,
    });
  }
  if (profile.has_research_experience) {
    const desc = profile.research_description ? `：${profile.research_description}` : '';
    memories.push({
      memory_text: `有科研经历${desc}`,
      category: 'research',
      confidence: 1.0,
    });
  }
  if (Array.isArray(profile.publications) && profile.publications.length > 0) {
    for (const pub of profile.publications as string[]) {
      memories.push({
        memory_text: `发表论文：${pub}`,
        category: 'publication',
        confidence: 1.0,
      });
    }
  }
  if (Array.isArray(profile.strengths) && profile.strengths.length > 0) {
    memories.push({
      memory_text: `特长：${(profile.strengths as string[]).join('、')}`,
      category: 'skill',
      confidence: 1.0,
    });
  }
  if (Array.isArray(profile.preferred_universities) && profile.preferred_universities.length > 0) {
    memories.push({
      memory_text: `目标大学：${(profile.preferred_universities as string[]).join('、')}`,
      category: 'preference',
      confidence: 1.0,
    });
  }
  if (profile.start_semester) {
    memories.push({
      memory_text: `计划入学时间：${profile.start_semester}`,
      category: 'preference',
      confidence: 1.0,
    });
  }
  if (profile.work_experience) {
    memories.push({
      memory_text: `工作经历：${profile.work_experience}`,
      category: 'experience',
      confidence: 1.0,
    });
  }
  if (profile.name) {
    memories.push({
      memory_text: `姓名：${profile.name}`,
      category: 'personal',
      confidence: 1.0,
    });
  }

  return memories;
}
