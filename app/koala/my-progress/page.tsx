'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { KoalaAvatar as KoalaAvatarImg } from '../components/KoalaAvatar';

interface DashboardData {
  readinessScore: number;
  dimensions: Array<{ name: string; score: number }>;
  credits: { balance: number; subscriptionTier: string | null; monthlyCredits: number };
  stats: {
    emailsGenerated: number;
    emailsSent: number;
    emailsReplied: number;
    achievementsCount: number;
    conversationsCount: number;
    tasksCompleted: number;
  };
  achievements: Array<{ key: string; unlockedAt: string }>;
  recentConversations: Array<{ id: string; mode: string; createdAt: string }>;
}

const ACHIEVEMENT_ICONS: Record<string, string> = {
  first_cv: '📄', first_match: '🎯', first_email: '✉️', first_reply: '🎉',
  research_angle: '🔬', grant_hunter: '💰', rp_starter: '📝',
  outreach_campaign: '🚀', phd_pathway_clear: '🎓',
};

const ACHIEVEMENT_LABELS: Record<string, string> = {
  first_cv: '第一份简历', first_match: '首次教授匹配', first_email: '发出第一封申请信',
  first_reply: '收到教授回复', research_angle: '科研方向确定', grant_hunter: '发现经费信号',
  rp_starter: 'RP 起草完成', outreach_campaign: '开始批量套磁', phd_pathway_clear: 'PhD 路径清晰',
};

const ALL_ACHIEVEMENTS = Object.keys(ACHIEVEMENT_ICONS);

const MODE_LABELS: Record<string, string> = {
  path: '路径评估', research: '科研深潜', chat: '陪伴聊天', write: '文案撰写',
};

function StatCard({ icon, value, label, sub, color = '#D4A843' }: {
  icon: string; value: number | string; label: string; sub?: string; color?: string;
}) {
  return (
    <div className="rounded-2xl p-3 flex flex-col bg-white dark:bg-white/5 border border-gray-200 dark:border-[#D4A843]/10 shadow-sm">
      <span className="w-9 h-9 rounded-xl flex items-center justify-center text-lg bg-amber-100/60 dark:bg-[#D4A843]/15">{icon}</span>
      <span className="text-2xl font-bold mt-1" style={{ color }}>{value}</span>
      <span className="text-[11px] font-medium mt-0.5 text-gray-900 dark:text-[#e8e4dc]">{label}</span>
      {sub && <span className="text-[10px] mt-0.5 text-gray-400 dark:text-[#b09878]">{sub}</span>}
    </div>
  );
}

export default function MyProgressPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/user/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const score = data?.readinessScore ?? 0;
  const color = score >= 70 ? '#5a8060' : score >= 50 ? '#D4A843' : '#b06040';

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-[#080c10]">
        <div className="px-4 pt-4 pb-3 border-b border-gray-200 dark:border-[#D4A843]/15">
          <h1 className="text-base font-bold text-gray-900 dark:text-[#e8e4dc]">我的申请进度</h1>
          <p className="text-[11px] mt-0.5 text-gray-500 dark:text-[#6a7a7e]">Research Readiness · 加载中…</p>
        </div>
        <div className="flex items-center justify-center flex-1">
          <div className="animate-pulse text-sm text-gray-500 dark:text-[#6a7a7e]">加载中…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-[#080c10]" style={{ paddingBottom: 80 }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-200 dark:border-[#D4A843]/15">
        <h1 className="text-base font-bold text-gray-900 dark:text-[#e8e4dc]">我的申请进度</h1>
        <p className="text-[11px] mt-0.5 text-gray-500 dark:text-[#6a7a7e]">Research Readiness · 你距离拿到 offer 还有多远</p>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4 max-w-lg mx-auto w-full">
        {/* Research Readiness Score */}
        <div className="rounded-2xl p-4 bg-white dark:bg-white/5 border-[1.5px] border-gray-200 dark:border-[#D4A843]/10 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-bold text-gray-900 dark:text-[#e8e4dc]">研究准备度</div>
              <div className="text-[11px] text-gray-500 dark:text-[#6a7a7e]">Research Readiness Score</div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold" style={{ color }}>{score}</div>
              <div className="text-[10px] text-gray-400 dark:text-[#b09878]">/ 100</div>
            </div>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden mb-4 bg-amber-50 dark:bg-[#D4A843]/6">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, background: color }} />
          </div>
          <div className="space-y-2">
            {(data?.dimensions ?? [
              { name: '背景完善度', score: 0 },
              { name: '教授匹配', score: 0 },
              { name: '套磁进度', score: 0 },
              { name: '学习参与度', score: 0 },
              { name: '回复率', score: 0 },
            ]).map(dim => (
              <div key={dim.name}>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="text-gray-500 dark:text-[#a8b8ac]">{dim.name}</span>
                  <span className="text-amber-600 dark:text-[#D4A843]">{dim.score}/20</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden bg-amber-50 dark:bg-[#D4A843]/6">
                  <div
                    className="h-full rounded-full bg-[#D4A843]"
                    style={{ width: `${(dim.score / 20) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2">
          <StatCard
            icon="✉️"
            value={data?.stats.emailsSent ?? 0}
            label="已发申请信"
            sub={`共生成 ${data?.stats.emailsGenerated ?? 0} 封`}
            color="#5a8060"
          />
          <StatCard
            icon="🎉"
            value={data?.stats.emailsReplied ?? 0}
            label="收到回复"
            sub={data?.stats.emailsSent ? `回复率 ${Math.round((data.stats.emailsReplied / data.stats.emailsSent) * 100)}%` : '—'}
            color="#D4A843"
          />
          <StatCard
            icon="⭐"
            value={data?.credits.balance ?? 0}
            label="剩余积分"
            sub={data?.credits.subscriptionTier ? `${data.credits.subscriptionTier} 订阅` : '按需购买'}
            color="#D4A843"
          />
        </div>

        {/* Credits / Subscription */}
        <div className="rounded-2xl p-4 space-y-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-[#D4A843]/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-900 dark:text-[#e8e4dc]">💳 积分与订阅</span>
            <Link href="/koala/tools" className="text-[11px] no-underline text-[#1A1A2E] dark:text-[#D4A843]">管理 →</Link>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-500 dark:text-[#a8b8ac]">可用积分</span>
            <span className="text-sm font-bold text-amber-600 dark:text-[#D4A843]">{data?.credits.balance ?? 0}</span>
          </div>
          {data?.credits.subscriptionTier && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-500 dark:text-[#a8b8ac]">订阅套餐</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-amber-50 dark:bg-[#D4A843]/10 text-amber-700 dark:text-[#D4A843]">
                {data.credits.subscriptionTier.toUpperCase()}
              </span>
            </div>
          )}
          {!data?.credits.subscriptionTier && (
            <Link
              href="/koala/tools"
              className="block text-center py-2 rounded-xl text-[11px] font-medium no-underline mt-1 bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]"
            >
              升级订阅，每月获得更多积分
            </Link>
          )}
        </div>

        {/* Achievements */}
        <div className="rounded-2xl p-4 space-y-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-[#D4A843]/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-900 dark:text-[#e8e4dc]">🏅 成就</span>
            <span className="text-[11px] text-gray-500 dark:text-[#6a7a7e]">
              {data?.stats.achievementsCount ?? 0}/{ALL_ACHIEVEMENTS.length} 已解锁
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {ALL_ACHIEVEMENTS.map(key => {
              const unlocked = data?.achievements.some(a => a.key === key);
              return (
                <div
                  key={key}
                  className={[
                    'flex flex-col items-center rounded-xl py-2.5 px-1 border transition-all',
                    unlocked
                      ? 'bg-amber-50 dark:bg-[#D4A843]/10 border-[#D4A843]/40 ring-2 ring-[#D4A843]/30 shadow-sm'
                      : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 opacity-40 grayscale',
                  ].join(' ')}
                >
                  <span className="text-xl">{ACHIEVEMENT_ICONS[key]}</span>
                  <span className="text-[9px] text-center mt-1 leading-tight text-amber-700 dark:text-[#D4A843]">
                    {ACHIEVEMENT_LABELS[key]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent conversations */}
        {(data?.recentConversations.length ?? 0) > 0 && (
          <div className="rounded-2xl p-4 space-y-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-[#D4A843]/10">
            <div className="text-xs font-semibold text-gray-900 dark:text-[#e8e4dc]">💬 最近对话</div>
            {data?.recentConversations.map(conv => (
              <div key={conv.id} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    {conv.mode === 'path' ? '🎯' : conv.mode === 'research' ? '🔬' : conv.mode === 'write' ? '✍️' : '💬'}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-[#a8b8ac]">{MODE_LABELS[conv.mode] ?? conv.mode}</span>
                </div>
                <span className="text-[10px] text-gray-400 dark:text-[#b09878]">
                  {new Date(conv.createdAt).toLocaleDateString('zh-CN')}
                </span>
              </div>
            ))}
            <Link
              href="/koala/chat"
              className="block text-center py-2 rounded-xl text-[11px] font-medium no-underline mt-1 bg-amber-50 dark:bg-[#D4A843]/6 text-amber-700 dark:text-[#D4A843]"
            >
              继续和考拉学长聊 →
            </Link>
          </div>
        )}

        {/* Empty state */}
        {!data || score === 0 ? (
          <div className="text-center py-6">
            <div className="flex justify-center mb-3">
              <KoalaAvatarImg size={56} />
            </div>
            <div className="text-sm font-semibold mb-1 text-gray-900 dark:text-[#e8e4dc]">开始你的 PhD 之旅</div>
            <p className="text-xs mb-4 text-gray-500 dark:text-[#6a7a7e]">和考拉学长聊聊，AI 会自动帮你记录进度</p>
            <Link
              href="/koala/chat"
              className="inline-block px-6 py-2.5 rounded-xl text-sm font-semibold no-underline bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]"
            >
              开始路径评估
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
