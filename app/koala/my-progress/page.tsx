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

function StatCard({ icon, value, label, sub, color = '#c4a050' }: {
  icon: string; value: number | string; label: string; sub?: string; color?: string;
}) {
  return (
    <div className="rounded-2xl p-3 flex flex-col" style={{ background: '#fff', border: '1px solid #e8dcc8' }}>
      <span className="text-xl">{icon}</span>
      <span className="text-2xl font-bold mt-1" style={{ color }}>{value}</span>
      <span className="text-[11px] font-medium mt-0.5" style={{ color: '#1a2332' }}>{label}</span>
      {sub && <span className="text-[10px] mt-0.5" style={{ color: '#b09878' }}>{sub}</span>}
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
  const color = score >= 70 ? '#5a8060' : score >= 50 ? '#c4a050' : '#b06040';

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen" style={{ background: '#faf6ec' }}>
        <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid #eee4cc' }}>
          <h1 className="text-base font-bold" style={{ color: '#1a2332' }}>我的申请进度</h1>
          <p className="text-[11px] mt-0.5" style={{ color: '#907858' }}>Research Readiness · 加载中…</p>
        </div>
        <div className="flex items-center justify-center flex-1">
          <div className="animate-pulse text-sm" style={{ color: '#907858' }}>加载中…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#faf6ec', paddingBottom: 80 }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid #eee4cc' }}>
        <h1 className="text-base font-bold" style={{ color: '#1a2332' }}>我的申请进度</h1>
        <p className="text-[11px] mt-0.5" style={{ color: '#907858' }}>Research Readiness · 你距离拿到 offer 还有多远</p>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4 max-w-lg mx-auto w-full">
        {/* Research Readiness Score */}
        <div className="rounded-2xl p-4" style={{ background: '#fff', border: '1.5px solid #e8dcc8' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-bold" style={{ color: '#1a2332' }}>研究准备度</div>
              <div className="text-[11px]" style={{ color: '#907858' }}>Research Readiness Score</div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold" style={{ color }}>{score}</div>
              <div className="text-[10px]" style={{ color: '#b09878' }}>/ 100</div>
            </div>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden mb-4" style={{ background: '#f0e8d4' }}>
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
                  <span style={{ color: '#584838' }}>{dim.name}</span>
                  <span style={{ color: '#7d6340' }}>{dim.score}/20</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#f0e8d4' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(dim.score / 20) * 100}%`, background: '#c4a050' }}
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
            color="#c4a050"
          />
          <StatCard
            icon="⭐"
            value={data?.credits.balance ?? 0}
            label="剩余积分"
            sub={data?.credits.subscriptionTier ? `${data.credits.subscriptionTier} 订阅` : '按需购买'}
            color="#7d6340"
          />
        </div>

        {/* Credits / Subscription */}
        <div className="rounded-2xl p-4 space-y-2" style={{ background: '#fff', border: '1px solid #e8dcc8' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: '#1a2332' }}>💳 积分与订阅</span>
            <Link href="/koala/tools" className="text-[11px] no-underline" style={{ color: '#c4a050' }}>管理 →</Link>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px]" style={{ color: '#584838' }}>可用积分</span>
            <span className="text-sm font-bold" style={{ color: '#c4a050' }}>{data?.credits.balance ?? 0}</span>
          </div>
          {data?.credits.subscriptionTier && (
            <div className="flex items-center justify-between">
              <span className="text-[11px]" style={{ color: '#584838' }}>订阅套餐</span>
              <span
                className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                style={{ background: '#f5e8c4', color: '#8a6c30' }}
              >
                {data.credits.subscriptionTier.toUpperCase()}
              </span>
            </div>
          )}
          {!data?.credits.subscriptionTier && (
            <Link
              href="/koala/tools"
              className="block text-center py-2 rounded-xl text-[11px] font-medium no-underline mt-1"
              style={{ background: '#c4a050', color: '#fff' }}
            >
              升级订阅，每月获得更多积分
            </Link>
          )}
        </div>

        {/* Achievements */}
        <div className="rounded-2xl p-4 space-y-3" style={{ background: '#fff', border: '1px solid #e8dcc8' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: '#1a2332' }}>🏅 成就</span>
            <span className="text-[11px]" style={{ color: '#907858' }}>
              {data?.stats.achievementsCount ?? 0}/{ALL_ACHIEVEMENTS.length} 已解锁
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {ALL_ACHIEVEMENTS.map(key => {
              const unlocked = data?.achievements.some(a => a.key === key);
              return (
                <div
                  key={key}
                  className="flex flex-col items-center rounded-xl py-2.5 px-1"
                  style={{
                    background: unlocked ? '#f5e8c4' : '#f2ead6',
                    border: `1px solid ${unlocked ? '#d8b870' : '#e8dcc8'}`,
                    opacity: unlocked ? 1 : 0.45,
                  }}
                >
                  <span className="text-xl">{ACHIEVEMENT_ICONS[key]}</span>
                  <span className="text-[9px] text-center mt-1 leading-tight" style={{ color: '#7d6340' }}>
                    {ACHIEVEMENT_LABELS[key]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent conversations */}
        {(data?.recentConversations.length ?? 0) > 0 && (
          <div className="rounded-2xl p-4 space-y-2" style={{ background: '#fff', border: '1px solid #e8dcc8' }}>
            <div className="text-xs font-semibold" style={{ color: '#1a2332' }}>💬 最近对话</div>
            {data?.recentConversations.map(conv => (
              <div key={conv.id} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    {conv.mode === 'path' ? '🎯' : conv.mode === 'research' ? '🔬' : conv.mode === 'write' ? '✍️' : '💬'}
                  </span>
                  <span className="text-xs" style={{ color: '#584838' }}>{MODE_LABELS[conv.mode] ?? conv.mode}</span>
                </div>
                <span className="text-[10px]" style={{ color: '#b09878' }}>
                  {new Date(conv.createdAt).toLocaleDateString('zh-CN')}
                </span>
              </div>
            ))}
            <Link
              href="/koala/chat"
              className="block text-center py-2 rounded-xl text-[11px] font-medium no-underline mt-1"
              style={{ background: '#f2ead6', color: '#7d6340' }}
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
            <div className="text-sm font-semibold mb-1" style={{ color: '#1a2332' }}>开始你的 PhD 之旅</div>
            <p className="text-xs mb-4" style={{ color: '#907858' }}>和考拉学长聊聊，AI 会自动帮你记录进度</p>
            <Link
              href="/koala/chat"
              className="inline-block px-6 py-2.5 rounded-xl text-sm font-semibold no-underline"
              style={{ background: '#c4a050', color: '#fff' }}
            >
              开始路径评估
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
