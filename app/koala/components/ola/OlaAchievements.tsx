'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase/client';

interface Milestone {
  milestone_key: string;
  name_zh: string;
  name_en: string;
  description_zh: string | null;
  icon: string | null;
  reward_credits: number;
  sort_order: number;
}

interface UserMilestone {
  milestone_key: string;
  achieved_at: string;
}

export function OlaAchievements({ userId }: { userId: string }) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [achieved, setAchieved] = useState<UserMilestone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [{ data: all }, { data: user }] = await Promise.all([
          supabase.from('ola_milestones').select('milestone_key, name_zh, name_en, description_zh, icon, reward_credits, sort_order').order('sort_order'),
          supabase.from('user_milestones').select('milestone_key, achieved_at').eq('user_id', userId),
        ]);
        setMilestones(all ?? []);
        setAchieved(user ?? []);
      } catch {}
      finally { setLoading(false); }
    }
    load();
  }, [userId]);

  if (loading) return null;
  if (milestones.length === 0) return null;

  const achievedKeys = new Set(achieved.map(a => a.milestone_key));
  const total = milestones.length;
  const done = achieved.length;

  return (
    <div className="mx-4 lg:mx-0 mb-3 rounded-xl overflow-hidden bg-white dark:bg-[#111c28] border border-gray-200 dark:border-gray-700/50">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-gray-700/50">
        <span className="text-xs font-semibold text-gray-900 dark:text-[#e8e4dc]">
          🏅 成就 <span className="font-normal text-gray-500 dark:text-[#6a7a7e]">({done}/{total})</span>
        </span>
      </div>

      {/* Progress bar */}
      <div className="px-4 pt-3 pb-1">
        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#c9a96e] to-[#0D7C5F] rounded-full transition-all duration-500"
            style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div className="px-4 py-3 grid grid-cols-2 gap-2">
        {milestones.map(m => {
          const unlocked = achievedKeys.has(m.milestone_key);
          const achievedEntry = achieved.find(a => a.milestone_key === m.milestone_key);

          return (
            <div
              key={m.milestone_key}
              className={`flex items-start gap-2 p-2 rounded-lg ${unlocked ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-800/50 opacity-60'}`}
            >
              <span className={`text-lg flex-shrink-0 ${unlocked ? '' : 'grayscale'}`}>
                {m.icon || '🎯'}
              </span>
              <div className="min-w-0">
                <p className={`text-xs font-medium ${unlocked ? 'text-gray-900 dark:text-[#e8e4dc]' : 'text-gray-500 dark:text-gray-500'}`}>
                  {m.name_zh}
                </p>
                {unlocked && achievedEntry ? (
                  <p className="text-[10px] text-green-600 dark:text-green-400">
                    +{m.reward_credits} 积分 · {new Date(achievedEntry.achieved_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                  </p>
                ) : (
                  <p className="text-[10px] text-gray-400 dark:text-gray-600">
                    {m.description_zh || `+${m.reward_credits} 积分`}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
