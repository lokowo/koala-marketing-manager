import { supabaseAdmin } from '../supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export interface MilestoneResult {
  milestone_key: string;
  name_zh: string;
  name_en: string;
  description_zh: string | null;
  description_en: string | null;
  reward_credits: number;
  icon: string | null;
  ola_state: string;
}

type MilestoneAction = 'search' | 'letter' | 'review' | 'interview' | 'favorite';

const ACTION_MILESTONES: Record<MilestoneAction, string[]> = {
  search: ['first_search'],
  letter: ['first_letter', 'three_letters'],
  review: ['first_review'],
  interview: ['first_interview'],
  favorite: ['five_favorites'],
};

async function isFullPrepComplete(userId: string): Promise<boolean> {
  const { data } = await db
    .from('user_milestones')
    .select('milestone_key')
    .eq('user_id', userId)
    .in('milestone_key', ['first_search', 'first_letter', 'first_review', 'first_interview']);

  return (data?.length ?? 0) >= 4;
}

export async function checkMilestone(
  userId: string,
  action: MilestoneAction,
  context?: { count?: number },
): Promise<MilestoneResult | null> {
  const candidateKeys = ACTION_MILESTONES[action] ?? [];
  if (candidateKeys.length === 0) return null;

  for (const key of candidateKeys) {
    // Skip count-based milestones if count doesn't match
    if (key === 'three_letters' && (context?.count ?? 0) < 3) continue;
    if (key === 'five_favorites' && (context?.count ?? 0) < 5) continue;

    // Check if already achieved
    const { data: existing } = await db
      .from('user_milestones')
      .select('id')
      .eq('user_id', userId)
      .eq('milestone_key', key)
      .maybeSingle();

    if (existing) continue;

    // Get milestone definition
    const { data: milestone } = await db
      .from('ola_milestones')
      .select('*')
      .eq('milestone_key', key)
      .maybeSingle();

    if (!milestone) continue;

    // Award the milestone
    await db.from('user_milestones').insert({
      user_id: userId,
      milestone_key: key,
      reward_claimed: true,
    });

    // Award credits
    if (milestone.reward_credits > 0) {
      await db.rpc('increment_credits', {
        p_user_id: userId,
        p_amount: milestone.reward_credits,
      }).catch(() => {
        // Fallback: try direct update if RPC doesn't exist
        db.from('user_profiles')
          .update({ credits: db.raw(`credits + ${milestone.reward_credits}`) })
          .eq('id', userId)
          .catch(() => {});
      });
    }

    return {
      milestone_key: milestone.milestone_key,
      name_zh: milestone.name_zh,
      name_en: milestone.name_en,
      description_zh: milestone.description_zh,
      description_en: milestone.description_en,
      reward_credits: milestone.reward_credits,
      icon: milestone.icon,
      ola_state: milestone.ola_state,
    };
  }

  // Check full_prep after any action
  if (await isFullPrepComplete(userId)) {
    const { data: existing } = await db
      .from('user_milestones')
      .select('id')
      .eq('user_id', userId)
      .eq('milestone_key', 'full_prep')
      .maybeSingle();

    if (!existing) {
      const { data: milestone } = await db
        .from('ola_milestones')
        .select('*')
        .eq('milestone_key', 'full_prep')
        .maybeSingle();

      if (milestone) {
        await db.from('user_milestones').insert({
          user_id: userId,
          milestone_key: 'full_prep',
          reward_claimed: true,
        });

        if (milestone.reward_credits > 0) {
          await db.rpc('increment_credits', {
            p_user_id: userId,
            p_amount: milestone.reward_credits,
          }).catch(() => {});
        }

        return {
          milestone_key: milestone.milestone_key,
          name_zh: milestone.name_zh,
          name_en: milestone.name_en,
          description_zh: milestone.description_zh,
          description_en: milestone.description_en,
          reward_credits: milestone.reward_credits,
          icon: milestone.icon,
          ola_state: milestone.ola_state,
        };
      }
    }
  }

  return null;
}
