import type { NextRequest } from 'next/server';
import { requireAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

type GraphNode = {
  id: string;
  label: string;
  category: 'center' | 'personality' | 'interests' | 'pain_points' | 'conversion' | 'stage';
  detail?: string;
  size?: number;
};

type GraphLink = {
  source: string;
  target: string;
  category: GraphNode['category'];
};

type PersonalityProfile = {
  communication_style?: string;
  decision_speed?: string;
  motivation?: string;
  pressure_level?: string;
  preferred_tone?: string;
} | null;

type MemoryRow = {
  user_id: string;
  nickname: string | null;
  user_preferred_name: string | null;
  mbti_type: string | null;
  hobbies: string[] | null;
  pain_points: string[] | null;
  personality_profile: PersonalityProfile;
  sales_stage: string | null;
  total_turns: number | null;
  total_conversations: number | null;
  intimacy_score: number | null;
  last_chat_at: string | null;
  chat_playbook: string | null;
  chat_playbook_updated_at: string | null;
};

const STAGE_LABEL: Record<string, string> = {
  warmup: '暖场 warmup',
  discovery: '需求挖掘 discovery',
  value_demo: '价值展示 value_demo',
  guided: '自然引导 guided',
  converting: '水到渠成 converting',
};

const PERSONALITY_FIELD_LABEL: Record<string, string> = {
  communication_style: '沟通风格',
  decision_speed: '决策速度',
  motivation: '主要动力',
  pressure_level: '压力水平',
  preferred_tone: '偏好语气',
};

const CONVERSION_KEYWORDS = [
  { re: /费用|价格|贵|多少钱|学费|奖学金|预算/i, label: '费用/奖学金敏感' },
  { re: /deadline|截止|时间紧|赶|来不及/i, label: '时间紧迫' },
  { re: /怕被拒|怕失败|没把握|担心拒/i, label: '拒信焦虑' },
  { re: /不知道选|选谁|怎么选|哪个导师/i, label: '选择困难' },
  { re: /迷茫|不确定|没方向/i, label: '方向迷茫' },
  { re: /家里|父母|家人/i, label: '家庭压力' },
];

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const userId = req.nextUrl.searchParams.get('userId');

    // ── No userId: list mode ──────────────────────────────
    if (!userId) {
      const search = (req.nextUrl.searchParams.get('search') || '').trim();

      let query = db
        .from('ola_user_memory')
        .select(
          'user_id, nickname, user_preferred_name, mbti_type, total_conversations, intimacy_score, last_chat_at, sales_stage'
        )
        .order('intimacy_score', { ascending: false })
        .limit(100);

      const { data: memories, error } = await query;
      if (error) throw error;

      const rows = (memories ?? []) as Array<{
        user_id: string;
        nickname: string | null;
        user_preferred_name: string | null;
        mbti_type: string | null;
        total_conversations: number | null;
        intimacy_score: number | null;
        last_chat_at: string | null;
        sales_stage: string | null;
      }>;

      const ids = rows.map((r) => r.user_id);
      const profilesMap = new Map<string, { display_name: string | null; email: string | null }>();
      if (ids.length > 0) {
        const { data: profiles } = await db
          .from('user_profiles')
          .select('id, display_name, email')
          .in('id', ids);
        for (const p of (profiles ?? []) as Array<{ id: string; display_name: string | null; email: string | null }>) {
          profilesMap.set(p.id, { display_name: p.display_name, email: p.email });
        }
      }

      let users = rows.map((r) => {
        const profile = profilesMap.get(r.user_id);
        const displayName = r.user_preferred_name || r.nickname || profile?.display_name || profile?.email?.split('@')[0] || '未命名用户';
        return {
          user_id: r.user_id,
          display_name: displayName,
          email: profile?.email ?? null,
          mbti_type: r.mbti_type,
          total_conversations: r.total_conversations ?? 0,
          intimacy_score: r.intimacy_score ?? 0,
          sales_stage: r.sales_stage ?? 'warmup',
          last_chat_at: r.last_chat_at,
        };
      });

      if (search) {
        const s = search.toLowerCase();
        users = users.filter(
          (u) =>
            u.display_name.toLowerCase().includes(s) ||
            (u.email ?? '').toLowerCase().includes(s) ||
            (u.mbti_type ?? '').toLowerCase().includes(s)
        );
      }

      return Response.json({ users });
    }

    // ── userId: graph mode ────────────────────────────────
    const { data: memoryRaw, error: memErr } = await db
      .from('ola_user_memory')
      .select(
        'user_id, nickname, user_preferred_name, mbti_type, hobbies, pain_points, personality_profile, sales_stage, total_turns, total_conversations, intimacy_score, last_chat_at, chat_playbook, chat_playbook_updated_at'
      )
      .eq('user_id', userId)
      .maybeSingle();

    if (memErr) throw memErr;
    if (!memoryRaw) return Response.json({ error: 'Memory not found' }, { status: 404 });

    const memory = memoryRaw as MemoryRow;

    const { data: profile } = await db
      .from('user_profiles')
      .select('display_name, email, avatar_url')
      .eq('id', userId)
      .maybeSingle();

    const profileRow = (profile ?? null) as { display_name: string | null; email: string | null; avatar_url: string | null } | null;

    const centerLabel =
      memory.user_preferred_name ||
      memory.nickname ||
      profileRow?.display_name ||
      profileRow?.email?.split('@')[0] ||
      '未命名用户';

    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];

    // Center node
    nodes.push({
      id: 'center',
      label: centerLabel,
      category: 'center',
      detail: memory.mbti_type ? `MBTI ${memory.mbti_type}` : undefined,
      size: 32,
    });

    // Personality nodes (from personality_profile + mbti_type)
    if (memory.mbti_type) {
      const pid = 'p-mbti';
      nodes.push({ id: pid, label: memory.mbti_type, category: 'personality', detail: 'MBTI', size: 18 });
      links.push({ source: 'center', target: pid, category: 'personality' });
    }
    if (memory.personality_profile) {
      const pp = memory.personality_profile;
      const traits: Array<[string, string]> = [];
      if (pp.communication_style) traits.push(['communication_style', pp.communication_style]);
      if (pp.decision_speed) traits.push(['decision_speed', pp.decision_speed]);
      if (pp.motivation) traits.push(['motivation', pp.motivation]);
      if (pp.pressure_level) traits.push(['pressure_level', pp.pressure_level]);
      if (pp.preferred_tone) traits.push(['preferred_tone', pp.preferred_tone]);
      traits.forEach(([field, val], i) => {
        const id = `p-${i}`;
        nodes.push({ id, label: val, category: 'personality', detail: PERSONALITY_FIELD_LABEL[field] || field, size: 16 });
        links.push({ source: 'center', target: id, category: 'personality' });
      });
    }

    // Interests nodes (hobbies)
    (memory.hobbies ?? []).slice(0, 12).forEach((h, i) => {
      const id = `i-${i}`;
      nodes.push({ id, label: h, category: 'interests', size: 14 });
      links.push({ source: 'center', target: id, category: 'interests' });
    });

    // Pain points
    (memory.pain_points ?? []).slice(0, 12).forEach((p, i) => {
      const id = `pp-${i}`;
      nodes.push({ id, label: p, category: 'pain_points', size: 16 });
      links.push({ source: 'center', target: id, category: 'pain_points' });
    });

    // Conversion triggers (derived from pain_points + playbook keywords)
    const haystack = `${(memory.pain_points ?? []).join(' ')} ${memory.chat_playbook ?? ''}`;
    const triggers = new Set<string>();
    for (const { re, label } of CONVERSION_KEYWORDS) {
      if (re.test(haystack)) triggers.add(label);
    }
    Array.from(triggers).slice(0, 8).forEach((t, i) => {
      const id = `c-${i}`;
      nodes.push({ id, label: t, category: 'conversion', detail: '转化点', size: 16 });
      links.push({ source: 'center', target: id, category: 'conversion' });
    });

    // Sales stage
    const stage = memory.sales_stage ?? 'warmup';
    const stageId = 's-stage';
    nodes.push({
      id: stageId,
      label: STAGE_LABEL[stage] || stage,
      category: 'stage',
      detail: `${memory.total_turns ?? 0} 轮对话`,
      size: 18,
    });
    links.push({ source: 'center', target: stageId, category: 'stage' });

    return Response.json({
      user: {
        user_id: userId,
        display_name: centerLabel,
        email: profileRow?.email ?? null,
        avatar_url: profileRow?.avatar_url ?? null,
        mbti_type: memory.mbti_type,
        sales_stage: stage,
        total_conversations: memory.total_conversations ?? 0,
        total_turns: memory.total_turns ?? 0,
        intimacy_score: memory.intimacy_score ?? 0,
        last_chat_at: memory.last_chat_at,
      },
      nodes,
      links,
      chat_playbook: memory.chat_playbook,
      chat_playbook_updated_at: memory.chat_playbook_updated_at,
    });
  } catch (error) {
    const msg = (error as Error).message;
    if (msg === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg === 'Forbidden') return Response.json({ error: 'Forbidden' }, { status: 403 });
    console.error('[admin/memory-graph]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
