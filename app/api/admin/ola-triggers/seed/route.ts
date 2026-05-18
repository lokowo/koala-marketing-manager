import { supabaseAdmin } from '../../../../lib/supabase/server';
import { requireAdmin } from '../../../../lib/auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const SEED_TRIGGERS = [
  {
    trigger_key: 'new_user_welcome',
    page: 'home',
    condition: { is_new_user: true },
    ola_state: 'welcome',
    message_zh: '嗨！我是小欧 🐨 想了解PhD申请？30秒帮你做个初步评估~',
    message_en: 'Hi! I\'m Ola 🐨 Interested in PhD applications? I can do a quick assessment in 30 seconds~',
    action_type: 'open_chat',
    priority: 10,
  },
  {
    trigger_key: 'professor_detail_10s',
    page: 'professors/[id]',
    condition: { time_on_page_seconds: 10 },
    ola_state: 'suggest',
    message_zh: '对这位教授感兴趣？我帮你写封套磁信？',
    message_en: 'Interested in this professor? Want me to help draft a cold email?',
    action_type: 'open_chat',
    priority: 8,
  },
  {
    trigger_key: 'deep_search_fail',
    page: 'professors',
    condition: { event: 'deep_search_failed' },
    ola_state: 'cheer',
    message_zh: '没搜到也没关系，粘贴教授主页链接给我试试？',
    message_en: 'No results? Try pasting the professor\'s homepage link and I\'ll look them up!',
    action_type: 'show_url_input',
    priority: 7,
  },
  {
    trigger_key: 'pricing_browse_15s',
    page: 'pricing',
    condition: { time_on_page_seconds: 15 },
    ola_state: 'suggest',
    message_zh: '不确定选哪个？跟我说说你的情况，我帮你推荐~',
    message_en: 'Not sure which plan? Tell me about your needs and I\'ll recommend one~',
    action_type: 'open_chat',
    priority: 6,
  },
  {
    trigger_key: 'profile_incomplete',
    page: 'my-profile',
    condition: { profile_completion: '<50%' },
    ola_state: 'cheer',
    message_zh: '完善学历信息能让推荐更精准！就差几步 🎁',
    message_en: 'Complete your profile for better recommendations! Just a few more steps 🎁',
    action_type: 'navigate',
    action_payload: { url: '/koala/my-profile' },
    priority: 5,
  },
  {
    trigger_key: 'credits_low',
    page: '*',
    condition: { credits: '<5', ai_action_attempted: true },
    ola_state: 'sleepy',
    message_zh: '积分快用完啦～邀请好友各得15积分！或看看积分包？',
    message_en: 'Running low on credits~ Invite friends to earn 15 each! Or check out credit packages?',
    action_type: 'show_pricing',
    priority: 9,
  },
  {
    trigger_key: 'returning_user',
    page: 'home',
    condition: { is_returning: true },
    ola_state: 'welcome',
    message_zh: '欢迎回来！要继续上次的对话吗？',
    message_en: 'Welcome back! Want to continue where we left off?',
    action_type: 'open_chat',
    priority: 7,
  },
  {
    trigger_key: 'first_letter_done',
    page: 'chat',
    condition: { event: 'letter_generated', count: 1 },
    ola_state: 'celebrate',
    message_zh: '第一封套磁信写好啦！🎉 记得发送前确认教授的研究方向~',
    message_en: 'Your first cold email is ready! 🎉 Double-check the professor\'s research focus before sending~',
    action_type: null,
    priority: 8,
  },
  {
    trigger_key: 'empty_favorites',
    page: 'my-profile',
    condition: { favorites_count: 0 },
    ola_state: 'sleepy',
    message_zh: '还没有收藏学者，去学者库逛逛？',
    message_en: 'No saved scholars yet. Want to browse the scholar database?',
    action_type: 'navigate',
    action_payload: { url: '/koala/professors' },
    priority: 4,
  },
  {
    trigger_key: 'idle_30s',
    page: '*',
    condition: { idle_seconds: 30, page_has_content: true },
    ola_state: 'suggest',
    message_zh: '需要帮忙吗？我可以帮你找教授、写信、审文书~',
    message_en: 'Need help? I can find professors, write emails, or review documents~',
    action_type: 'open_chat',
    priority: 1,
  },
];

export async function POST() {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    let inserted = 0;
    for (const trigger of SEED_TRIGGERS) {
      const { data: existing } = await db
        .from('ola_triggers')
        .select('id')
        .eq('trigger_key', trigger.trigger_key)
        .maybeSingle();

      if (!existing) {
        await db.from('ola_triggers').insert(trigger);
        inserted++;
      }
    }

    return Response.json({ message: `Inserted ${inserted} triggers (${SEED_TRIGGERS.length - inserted} already existed)`, inserted });
  } catch (error) {
    console.error('[ola-triggers seed]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
