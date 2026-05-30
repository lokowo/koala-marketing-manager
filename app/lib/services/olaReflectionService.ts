import Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getOrCreateMemory } from './olaMemoryService';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function generateChatPlaybook(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  try {
    const memory = await getOrCreateMemory(supabase, userId);

    const { data: recentMsgs } = await supabase
      .from('chat_messages' as 'user_profiles')
      .select('role, content, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    const chatHistory = (recentMsgs as unknown as { role: string; content: string; created_at: string }[] | null)
      ?.reverse()
      .map(m => `[${m.role}] ${m.content.slice(0, 300)}`)
      .join('\n') || '(无最近对话)';

    const memorySnapshot = [
      memory.mbti_type ? `MBTI: ${memory.mbti_type}` : null,
      memory.personality_profile ? `性格档案: ${JSON.stringify(memory.personality_profile)}` : null,
      `亲密度: ${memory.intimacy_score}, 总对话: ${memory.total_conversations}, 连续天数: ${memory.consecutive_days}`,
      `销售阶段: ${memory.sales_stage}`,
      memory.pain_points?.length ? `痛点: ${memory.pain_points.join('、')}` : null,
      memory.gender ? `性别: ${memory.gender}` : null,
      memory.age ? `年龄: ${memory.age}` : null,
      memory.city ? `城市: ${memory.city}` : null,
      memory.hobbies?.length ? `爱好: ${memory.hobbies.join('、')}` : null,
      memory.emotional_state ? `情绪状态: ${memory.emotional_state}` : null,
      memory.life_details ? `生活细节: ${memory.life_details}` : null,
      memory.user_preferred_name ? `称呼: ${memory.user_preferred_name}` : null,
    ].filter(Boolean).join('\n');

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `你是 Ola 的记忆分析助手。根据以下客户的记忆数据和最近对话，总结出"怎么跟这个客户聊"的打法，≤300字。

包含：
①他喜欢的对话方式/语气
②内容偏好和关注点
③痛点和异议
④转化切入点
⑤要避免什么

用第二人称写给Ola看（如"这个同学是i人，少热情轰炸…"）。只输出总结，不要解释。

## 客户记忆数据
${memorySnapshot}

## 最近对话（最新10轮）
${chatHistory}`,
      }],
    });

    const playbook = (response.content[0] as { type: string; text: string }).text?.trim();
    if (!playbook) return;

    await supabase
      .from('ola_user_memory' as 'user_profiles')
      .update({
        chat_playbook: playbook,
        chat_playbook_updated_at: new Date().toISOString(),
        chat_playbook_last_turn: memory.total_turns ?? 0,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('user_id', userId);

    console.log(`[REFLECT] chat_playbook generated for ${userId} (${playbook.length} chars)`);
  } catch (err) {
    console.error('[REFLECT] generateChatPlaybook failed:', err);
  }
}
