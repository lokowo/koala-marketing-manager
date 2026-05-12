'use client';
import { useState, useEffect } from 'react';

const ACHIEVEMENT_ICONS: Record<string, string> = {
  first_cv: '📄',
  first_match: '🎯',
  first_email: '✉️',
  first_reply: '🎉',
  research_angle: '🔬',
  grant_hunter: '💰',
  rp_starter: '📝',
  outreach_campaign: '🚀',
  phd_pathway_clear: '🎓',
};

const ACHIEVEMENT_LABELS: Record<string, string> = {
  first_cv: '第一份简历',
  first_match: '首次教授匹配',
  first_email: '发出第一封申请信',
  first_reply: '收到第一封回信',
  research_angle: '科研方向确定',
  grant_hunter: '发现经费信号',
  rp_starter: 'Research Proposal 起草',
  outreach_campaign: '开始批量套磁',
  phd_pathway_clear: 'PhD 路径清晰',
};

interface AchievementBadgeProps {
  achievementKey: string;
  unlockedAt?: string;
  mode?: 'toast' | 'card' | 'inline';
  onDismiss?: () => void;
}

export function AchievementBadge({ achievementKey, unlockedAt, mode = 'toast', onDismiss }: AchievementBadgeProps) {
  const [visible, setVisible] = useState(true);
  const icon = ACHIEVEMENT_ICONS[achievementKey] ?? '🏅';
  const label = ACHIEVEMENT_LABELS[achievementKey] ?? achievementKey;

  useEffect(() => {
    if (mode === 'toast') {
      const t = setTimeout(() => { setVisible(false); onDismiss?.(); }, 4000);
      return () => clearTimeout(t);
    }
  }, [mode, onDismiss]);

  if (!visible && mode === 'toast') return null;

  if (mode === 'toast') {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-lg bg-gray-100 dark:bg-[#e8e4dc] text-gray-900 dark:text-white max-w-[300px]">
        <span className="text-xl">{icon}</span>
        <div>
          <div className="text-[11px] opacity-70">成就解锁</div>
          <div className="text-sm font-semibold">{label}</div>
        </div>
        <button onClick={() => { setVisible(false); onDismiss?.(); }} className="ml-2 opacity-50 hover:opacity-100 text-xs">✕</button>
      </div>
    );
  }

  if (mode === 'inline') {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#f5e8c4] dark:bg-[#f5e8c4] text-amber-700 dark:text-[#D4A843]">
        {icon} {label}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-4 rounded-2xl text-center bg-gray-50 dark:bg-white/[0.04] border border-amber-200/50 dark:border-[#D4A843]/10">
      <div className="text-4xl mb-2">{icon}</div>
      <div className="text-xs font-bold text-gray-900 dark:text-[#e8e4dc]">{label}</div>
      {unlockedAt && (
        <div className="text-[10px] mt-1 text-gray-500 dark:text-[#b09878]">
          {new Date(unlockedAt).toLocaleDateString('zh-CN')} 解锁
        </div>
      )}
    </div>
  );
}
