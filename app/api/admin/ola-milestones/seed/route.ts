import { supabaseAdmin } from '../../../../lib/supabase/server';
import { requireAdmin } from '../../../../lib/auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const SEED_MILESTONES = [
  {
    milestone_key: 'first_search',
    name_zh: '首次搜索教授',
    name_en: 'First Professor Search',
    description_zh: '使用教授搜索功能找到你的第一位潜在导师',
    description_en: 'Use the professor search to find your first potential supervisor',
    reward_credits: 2,
    icon: '🎯',
    sort_order: 1,
  },
  {
    milestone_key: 'first_letter',
    name_zh: '首封套磁信',
    name_en: 'First Cold Email',
    description_zh: '生成你的第一封个性化套磁信',
    description_en: 'Generate your first personalized cold email',
    reward_credits: 5,
    icon: '📝',
    sort_order: 2,
  },
  {
    milestone_key: 'first_review',
    name_zh: '首次文书审阅',
    name_en: 'First Document Review',
    description_zh: '让 Ola 审阅你的 Research Proposal 或 CV',
    description_en: 'Have Ola review your Research Proposal or CV',
    reward_credits: 5,
    icon: '📄',
    sort_order: 3,
  },
  {
    milestone_key: 'first_interview',
    name_zh: '首次面试模拟',
    name_en: 'First Interview Practice',
    description_zh: '完成一次 PhD 面试模拟练习',
    description_en: 'Complete a PhD interview simulation',
    reward_credits: 5,
    icon: '🎤',
    sort_order: 4,
  },
  {
    milestone_key: 'five_favorites',
    name_zh: '收藏5位教授',
    name_en: 'Five Favorites',
    description_zh: '收藏 5 位感兴趣的教授',
    description_en: 'Save 5 professors to your favorites',
    reward_credits: 3,
    icon: '⭐',
    sort_order: 5,
  },
  {
    milestone_key: 'three_letters',
    name_zh: '生成3封套磁信',
    name_en: 'Three Emails Drafted',
    description_zh: '累计生成 3 封套磁信',
    description_en: 'Generate 3 cold emails in total',
    reward_credits: 10,
    icon: '📬',
    sort_order: 6,
  },
  {
    milestone_key: 'full_prep',
    name_zh: '完成所有功能',
    name_en: 'Full Prep Master',
    description_zh: '使用过搜索、套磁信、文书审阅、面试模拟所有功能',
    description_en: 'Use all features: search, email, review, and interview',
    reward_credits: 20,
    icon: '🏆',
    sort_order: 7,
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
    for (const milestone of SEED_MILESTONES) {
      const { data: existing } = await db
        .from('ola_milestones')
        .select('id')
        .eq('milestone_key', milestone.milestone_key)
        .maybeSingle();

      if (!existing) {
        await db.from('ola_milestones').insert(milestone);
        inserted++;
      }
    }

    return Response.json({ message: `Inserted ${inserted} milestones (${SEED_MILESTONES.length - inserted} already existed)`, inserted });
  } catch (error) {
    console.error('[ola-milestones seed]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
