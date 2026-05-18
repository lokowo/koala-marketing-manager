'use client';

import { useEffect, useState, useCallback } from 'react';

type Tab = 'overview' | 'details' | 'emails';

interface KPIData {
  todaySessions: number;
  avgRating30d: number;
  activeUsers7d: number;
  totalSessions30d: number;
}

interface FunnelItem {
  stage: string;
  count: number;
  percentage: number;
}

interface RatingsData {
  distribution: Record<number, number>;
  lowRated: Array<{
    sessionId: string;
    rating: number;
    comment: string | null;
    ratedAt: string;
    userId: string;
  }>;
}

interface TriggerItem {
  triggerKey: string;
  shown: number;
  clicked: number;
  dismissed: number;
  clickRate: number;
}

interface EmailTemplate {
  id: string;
  template_key: string;
  subject_zh: string;
  enabled: boolean;
  stats: { sent: number; opened: number; clicked: number };
}

const STAGE_LABELS: Record<string, string> = {
  greeting: '问候',
  background_collection: '背景收集',
  goal_clarification: '目标明确',
  assessment: '评估',
  matching: '教授匹配',
  outreach: '套磁信',
  follow_up: '跟进',
  completed: '完成',
  unknown: '未知',
};

const TEMPLATE_LABELS: Record<string, string> = {
  inactive_3d: '3天未使用',
  letter_unsent_7d: '套磁信未发送7天',
  deadline_30d: '截止日30天',
  deadline_7d: '截止日7天',
  dormant_30d: '30天未登录',
};

export default function OlaAnalyticsPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [kpi, setKpi] = useState<KPIData | null>(null);
  const [funnel, setFunnel] = useState<FunnelItem[]>([]);
  const [ratings, setRatings] = useState<RatingsData | null>(null);
  const [triggers, setTriggers] = useState<TriggerItem[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSection = useCallback(async (section: string) => {
    const res = await fetch(`/api/admin/ola-analytics?section=${section}`);
    if (!res.ok) return null;
    return res.json();
  }, []);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    const [k, f, r] = await Promise.all([
      fetchSection('kpi'),
      fetchSection('funnel'),
      fetchSection('ratings'),
    ]);
    if (k) setKpi(k);
    if (f) setFunnel(f);
    if (r) setRatings(r);
    setLoading(false);
  }, [fetchSection]);

  const loadDetails = useCallback(async () => {
    setLoading(true);
    const t = await fetchSection('triggers');
    if (t) setTriggers(t);
    setLoading(false);
  }, [fetchSection]);

  const loadEmails = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/ola-email-templates');
    if (res.ok) {
      const data = await res.json();
      setTemplates(data.templates ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (tab === 'overview') loadOverview();
    else if (tab === 'details') loadDetails();
    else if (tab === 'emails') loadEmails();
  }, [tab, loadOverview, loadDetails, loadEmails]);

  async function toggleTemplate(id: string, enabled: boolean) {
    await fetch('/api/admin/ola-email-templates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, enabled }),
    });
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, enabled } : t));
  }

  async function manualTrigger(templateKey: string) {
    const userId = prompt('输入测试用户 ID:');
    if (!userId) return;
    const res = await fetch('/api/ola/send-reengagement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, templateKey }),
    });
    if (res.ok) {
      alert('发送成功');
    } else {
      const err = await res.json();
      alert(`发送失败: ${err.error}`);
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: '概览' },
    { key: 'details', label: '详情' },
    { key: 'emails', label: '再激活邮件' },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">Ola 分析</h1>

      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-400 text-sm py-12 text-center">加载中...</div>
      ) : (
        <>
          {tab === 'overview' && <OverviewTab kpi={kpi} funnel={funnel} ratings={ratings} />}
          {tab === 'details' && <DetailsTab triggers={triggers} />}
          {tab === 'emails' && <EmailsTab templates={templates} onToggle={toggleTemplate} onManualTrigger={manualTrigger} />}
        </>
      )}
    </div>
  );
}

function OverviewTab({ kpi, funnel, ratings }: { kpi: KPIData | null; funnel: FunnelItem[]; ratings: RatingsData | null }) {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      {kpi && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard label="今日对话" value={kpi.todaySessions} />
          <KPICard label="平均评分 (30天)" value={kpi.avgRating30d} suffix="/5" />
          <KPICard label="活跃用户 (7天)" value={kpi.activeUsers7d} />
          <KPICard label="总对话 (30天)" value={kpi.totalSessions30d} />
        </div>
      )}

      {/* Funnel Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">对话漏斗</h2>
        {funnel.length === 0 ? (
          <p className="text-gray-400 text-sm">暂无数据</p>
        ) : (
          <div className="space-y-3">
            {funnel.map(item => {
              const maxCount = Math.max(...funnel.map(f => f.count), 1);
              return (
                <div key={item.stage} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-20 shrink-0 text-right">
                    {STAGE_LABELS[item.stage] || item.stage}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-7 relative overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-500 flex items-center"
                      style={{ width: `${Math.max((item.count / maxCount) * 100, 2)}%` }}
                    >
                      <span className="text-xs font-medium text-amber-900 px-2 whitespace-nowrap">
                        {item.count} ({item.percentage}%)
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rating Distribution */}
      {ratings && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">评分分布 (30天)</h2>
          <div className="flex items-end gap-3 h-32 mb-4">
            {[1, 2, 3, 4, 5].map(star => {
              const count = ratings.distribution[star] || 0;
              const maxCount = Math.max(...Object.values(ratings.distribution), 1);
              const height = Math.max((count / maxCount) * 100, 4);
              return (
                <div key={star} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-500">{count}</span>
                  <div className="w-full flex items-end" style={{ height: '100px' }}>
                    <div
                      className={`w-full rounded-t transition-all duration-500 ${star <= 2 ? 'bg-red-400' : star === 3 ? 'bg-amber-400' : 'bg-green-400'}`}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-600">{star}★</span>
                </div>
              );
            })}
          </div>

          {ratings.lowRated.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-gray-600 mb-2">差评列表 (≤2分)</h3>
              <div className="space-y-2">
                {ratings.lowRated.slice(0, 10).map(lr => (
                  <div key={lr.sessionId} className="flex items-center gap-3 text-xs bg-red-50 rounded-lg p-3">
                    <span className="text-red-500 font-bold">{lr.rating}★</span>
                    <span className="text-gray-600 flex-1 truncate">{lr.comment || '无评论'}</span>
                    <span className="text-gray-400 shrink-0">{new Date(lr.ratedAt).toLocaleDateString('zh-CN')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function KPICard({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">
        {value}{suffix && <span className="text-sm font-normal text-gray-400">{suffix}</span>}
      </p>
    </div>
  );
}

function DetailsTab({ triggers }: { triggers: TriggerItem[] }) {
  return (
    <div className="space-y-6">
      {/* Trigger Effectiveness */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">触发规则效果</h2>
        {triggers.length === 0 ? (
          <p className="text-gray-400 text-sm">暂无触发数据</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">触发规则</th>
                  <th className="text-right py-2 px-3 text-gray-500 font-medium">展示</th>
                  <th className="text-right py-2 px-3 text-gray-500 font-medium">点击</th>
                  <th className="text-right py-2 px-3 text-gray-500 font-medium">关闭</th>
                  <th className="text-right py-2 px-3 text-gray-500 font-medium">点击率</th>
                </tr>
              </thead>
              <tbody>
                {triggers.map(t => (
                  <tr key={t.triggerKey} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 px-3 text-gray-900 font-mono text-xs">{t.triggerKey}</td>
                    <td className="py-2 px-3 text-right text-gray-600">{t.shown}</td>
                    <td className="py-2 px-3 text-right text-gray-600">{t.clicked}</td>
                    <td className="py-2 px-3 text-right text-gray-600">{t.dismissed}</td>
                    <td className="py-2 px-3 text-right">
                      <span className={`font-medium ${t.clickRate > 10 ? 'text-green-600' : t.clickRate > 5 ? 'text-amber-600' : 'text-gray-600'}`}>
                        {t.clickRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tool Stats Placeholder */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-2">Tool 使用统计</h2>
        <p className="text-gray-400 text-sm">暂无数据 — 需要 ola_events 埋点后启用</p>
      </div>

      {/* Knowledge Gaps Placeholder */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-2">知识盲区 Top 10</h2>
        <p className="text-gray-400 text-sm">功能开发中 — 需要 RAG 引擎记录 miss 事件</p>
      </div>
    </div>
  );
}

function EmailsTab({
  templates,
  onToggle,
  onManualTrigger,
}: {
  templates: EmailTemplate[];
  onToggle: (id: string, enabled: boolean) => void;
  onManualTrigger: (templateKey: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">再激活邮件模板</h2>
        {templates.length === 0 ? (
          <p className="text-gray-400 text-sm">暂无模板 — 请先运行 seed API</p>
        ) : (
          <div className="space-y-3">
            {templates.map(t => (
              <div key={t.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <button
                  onClick={() => onToggle(t.id, !t.enabled)}
                  className={`w-10 h-6 rounded-full relative transition-colors ${t.enabled ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${t.enabled ? 'left-[18px]' : 'left-0.5'}`}
                  />
                </button>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {TEMPLATE_LABELS[t.template_key] || t.template_key}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{t.subject_zh}</p>
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-500 shrink-0">
                  <span>发送 {t.stats.sent}</span>
                  <span>打开 {t.stats.sent > 0 ? Math.round((t.stats.opened / t.stats.sent) * 100) : 0}%</span>
                  <span>点击 {t.stats.sent > 0 ? Math.round((t.stats.clicked / t.stats.sent) * 100) : 0}%</span>
                </div>

                <button
                  onClick={() => onManualTrigger(t.template_key)}
                  className="px-3 py-1.5 text-xs bg-[#1A1A2E] text-white rounded-lg hover:bg-[#2a2a4e] transition-colors shrink-0"
                >
                  手动触发
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
