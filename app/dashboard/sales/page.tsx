'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase/client';
import { useRouter } from 'next/navigation';

interface QRCode { id: string; code: string; channel: string; label: string | null; scan_count: number; register_count: number; created_at: string }

interface Client {
  id: string; type: 'registered' | 'survey_lead'; name: string; phone: string; email: string;
  wechat?: string; stage: string; source: string; source_channel: string; registered: boolean;
  value_score: number | null; survey_title: string; last_contacted_at: string | null;
  contact_count: number; notes: string; created_at: string; customer_user_id: string | null;
  email_status?: string | null;
}

interface FunnelData { funnel: Record<string, number>; total: number; conversionRate: string; lost: number }
interface KpiData { leads: { current: number; target: number }; followups: { current: number; target: number }; conversions: { current: number; target: number } }
interface WorkLog { id: string; action: string; target_type: string; target_id: string | null; details: Record<string, unknown> | null; created_at: string }
interface EngagementEntry { userId: string; displayName: string; email: string; totalScore: number; level: 'high' | 'medium' | 'low' | 'dormant'; breakdown: { chatActivity: number; professorEngagement: number; profileCompleteness: number; outreachActivity: number; recency: number }; stats: { conversationCount: number; savedProfessors: number; emailsGenerated: number; profilePct: number; daysSinceLastActive: number; registeredDaysAgo: number } }
interface EngagementSummary { high: number; medium: number; low: number; dormant: number; total: number; avgScore: number }

interface DashboardStats {
  visits: { current: number; lastMonth: number; target: number };
  registrations: { current: number; lastMonth: number; target: number };
  conversions: { current: number; lastMonth: number; target: number };
  commission: { current: number; lastMonth: number; target: number };
}

interface PerfData {
  my_stats: { total_scans: number; total_registers: number; conversion_rate: string };
  my_by_category: {
    survey: { scans: number; registers: number; items: { code: string; label: string; scans: number; registers: number }[] };
    social: { scans: number; registers: number; items: { code: string; channel: string; label: string; scans: number; registers: number }[] };
  };
  team_stats: { total_scans: number; total_registers: number; avg_conversion_rate: string; total_sales: number };
  my_rank: { scan_rank: number | null; register_rank: number | null; conversion_rank: number | null; total_sales: number };
  sales_leaderboard?: { name: string; scans: number; registers: number; conversion: string }[];
  channel_breakdown?: { channel: string; scans: number; registers: number }[];
  ai_insight: string;
}

const STAGE_CFG: Record<string, { label: string; color: string; bg: string }> = {
  lead: { label: '线索', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
  contacted: { label: '已联系', color: '#D4A843', bg: 'rgba(212,168,67,0.1)' },
  interested: { label: '有意向', color: '#059669', bg: 'rgba(5,150,105,0.1)' },
  trial: { label: '试用中', color: '#7C3AED', bg: 'rgba(124,58,237,0.1)' },
  converted: { label: '已转化', color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
  lost: { label: '已流失', color: '#9CA3AF', bg: 'rgba(156,163,175,0.1)' },
};

const FUNNEL_STAGES = ['lead', 'contacted', 'interested', 'trial', 'converted'] as const;

const ALL_STAGES = ['lead', 'contacted', 'interested', 'trial', 'converted', 'lost'] as const;

const ACTION_LABELS: Record<string, string> = {
  customer_update: '客户跟进', customer_stage_change: '阶段变更',
  create_qrcode: '生成推广码', customer_registered: '客户注册',
  view_customer: '查看客户', generate_email_for_customer: '生成套磁信',
  add_customer_note: '客户备注', share_qrcode: '分享二维码',
};

const CH_LABELS: Record<string, string> = {
  wechat: '📱 微信', xiaohongshu: '📕 小红书', linkedin: '💼 LinkedIn',
  offline: '🏫 线下', douyin: '🎵 抖音', survey: '📋 调研', other: '🔗 其他',
};

export default function SalesDashboard() {
  const router = useRouter();
  const [qrcodes, setQrcodes] = useState<QRCode[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [kpi, setKpi] = useState<KpiData | null>(null);
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [engagement, setEngagement] = useState<EngagementEntry[]>([]);
  const [engSummary, setEngSummary] = useState<EngagementSummary | null>(null);
  const [perf, setPerf] = useState<PerfData | null>(null);
  const [dashStats, setDashStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [newChannel, setNewChannel] = useState('wechat');
  const [showQrCreate, setShowQrCreate] = useState(false);
  const [filterStage, setFilterStage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [updatingStage, setUpdatingStage] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [qr, cust, fn, kpiRes, logsRes, engRes, perfRes, dashStatsRes] = await Promise.all([
      fetch('/api/sales/qrcode').then(r => r.json()),
      fetch('/api/sales/customers').then(r => r.json()),
      fetch('/api/sales/funnel').then(r => r.json()),
      fetch('/api/sales/my-kpi').then(r => r.ok ? r.json() : null),
      fetch('/api/sales/my-logs?limit=10').then(r => r.ok ? r.json() : { data: [] }),
      fetch('/api/sales/customer-engagement').then(r => r.ok ? r.json() : { data: [], summary: null }),
      fetch('/api/sales/performance').then(r => r.ok ? r.json() : null),
      fetch('/api/sales/dashboard-stats').then(r => r.ok ? r.json() : null),
    ]);
    setQrcodes(qr.data ?? []);
    setClients(cust.data ?? []);
    setFunnel(fn.funnel ? fn : null);
    setKpi(kpiRes);
    setLogs(logsRes.data ?? []);
    setEngagement(engRes.data ?? []);
    setEngSummary(engRes.summary ?? null);
    setPerf(perfRes);
    setDashStats(dashStatsRes);
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/login'); return; }
      const res = await fetch('/api/admin/me');
      if (res.ok) {
        const { role: r } = await res.json();
        setRole(r);
      }
      loadData();
    });
  }, [router, loadData]);

  async function updateClientStage(client: Client, newStage: string) {
    setUpdatingStage(client.id);
    try {
      const url = client.type === 'survey_lead'
        ? `/api/sales/survey-leads/${client.id}/stage`
        : `/api/sales/customers/${client.id}/stage`;
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      });
      if (res.ok) {
        // Refresh funnel + client list
        const [fn, cust] = await Promise.all([
          fetch('/api/sales/funnel').then(r => r.json()),
          fetch('/api/sales/customers').then(r => r.json()),
        ]);
        setFunnel(fn.funnel ? fn : null);
        setClients(cust.data ?? []);
      }
    } catch { /* ignore */ }
    setUpdatingStage(null);
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://koalaphd.com';
  function getQrUrl(code: string) { return `${baseUrl}/r/${code}`; }
  function getQrImageUrl(code: string) { return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&format=png&data=${encodeURIComponent(getQrUrl(code))}`; }

  async function createQRCode() {
    if (!newLabel.trim()) { alert('请填写备注，方便追踪不同渠道的效果'); return; }
    const res = await fetch('/api/sales/qrcode', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: newChannel, label: newLabel.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.existing) alert(`该渠道已有推广码：${data.data.code}`);
      setNewLabel(''); setShowQrCreate(false); loadData();
    }
  }

  function downloadQR(code: string) { window.open(getQrImageUrl(code), '_blank'); }
  async function shareQR(code: string, label: string | null) {
    if (isSharing) return;
    const url = getQrUrl(code);
    if (navigator.share) {
      setIsSharing(true);
      try {
        await navigator.share({ title: label || 'Koala PhD 推广链接', url });
      } catch (e: unknown) {
        if (e instanceof Error && e.name !== 'AbortError') console.error(e);
      } finally {
        setIsSharing(false);
      }
    } else {
      navigator.clipboard.writeText(url);
      alert('链接已复制到剪贴板');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <p className="text-sm text-[#6B7280]">加载中…</p>
      </div>
    );
  }

  const maxFunnel = Math.max(...FUNNEL_STAGES.map(s => funnel?.funnel[s] ?? 0), 1);
  const isAdmin = role === 'admin' || role === 'super_admin';
  const surveyQrcodes = qrcodes.filter(q => q.channel === 'survey');
  const socialQrcodes = qrcodes.filter(q => q.channel !== 'survey');
  const surveySubtotal = { scans: surveyQrcodes.reduce((s, q) => s + q.scan_count, 0), registers: surveyQrcodes.reduce((s, q) => s + q.register_count, 0) };
  const socialSubtotal = { scans: socialQrcodes.reduce((s, q) => s + q.scan_count, 0), registers: socialQrcodes.reduce((s, q) => s + q.register_count, 0) };

  // Filter + search clients
  let filteredClients = filterStage ? clients.filter(c => c.stage === filterStage) : clients;
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filteredClients = filteredClients.filter(c =>
      c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.email.toLowerCase().includes(q),
    );
  }

  return (
    <div className="text-[#111827]">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* Distribution KPI Cards */}
        {dashStats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: '本月访问量', icon: '👁', ...dashStats.visits, unit: '' },
              { label: '本月注册量', icon: '📥', ...dashStats.registrations, unit: '' },
              { label: '本月付费转化', icon: '🎯', ...dashStats.conversions, unit: '' },
              { label: '本月佣金', icon: '💰', ...dashStats.commission, unit: 'AUD' },
            ].map(item => {
              const pct = item.target > 0 ? Math.min((item.current / item.target) * 100, 100) : 0;
              const trend = item.lastMonth > 0 ? ((item.current - item.lastMonth) / item.lastMonth * 100) : 0;
              const trendUp = trend >= 0;
              return (
                <div key={item.label} className="rounded-xl p-4 bg-white border border-[#E5E7EB]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-[#6B7280]">{item.icon} {item.label}</span>
                    {item.lastMonth > 0 && (
                      <span className={`text-[10px] font-medium ${trendUp ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                        {trendUp ? '↑' : '↓'} {Math.abs(trend).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-bold text-[#111827]">
                    {item.unit === 'AUD' ? `$${item.current.toFixed(2)}` : item.current}
                  </div>
                  {item.target > 0 && (
                    <>
                      <div className="mt-2 h-2 rounded-full overflow-hidden bg-[#F3F4F6]">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: pct >= 100 ? '#10B981' : pct > 60 ? '#D4A843' : '#EF4444' }}
                        />
                      </div>
                      <div className="mt-1 text-[10px] text-[#6B7280]">
                        {pct.toFixed(0)}% · 目标 {item.unit === 'AUD' ? `$${item.target}` : item.target}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link href="/dashboard/sales/surveys" className="rounded-xl p-4 bg-white border border-[#E5E7EB] hover:border-[#D4A843]/40 hover:shadow-sm transition no-underline group">
            <div className="text-2xl mb-2">📋</div>
            <div className="text-sm font-medium text-[#111827] group-hover:text-[#D4A843]">调研问卷</div>
            <div className="text-[10px] text-[#6B7280] mt-0.5">创建 · 编辑 · 推广</div>
          </Link>
          <Link href="/dashboard/sales/surveys?tab=plaza" className="rounded-xl p-4 bg-white border border-[#E5E7EB] hover:border-[#D4A843]/40 hover:shadow-sm transition no-underline group">
            <div className="text-2xl mb-2">📱</div>
            <div className="text-sm font-medium text-[#111827] group-hover:text-[#D4A843]">生成推广码</div>
            <div className="text-[10px] text-[#6B7280] mt-0.5">为问卷生成二维码</div>
          </Link>
          <Link href="/dashboard/sales/surveys/create" className="rounded-xl p-4 bg-white border border-[#E5E7EB] hover:border-[#D4A843]/40 hover:shadow-sm transition no-underline group">
            <div className="text-2xl mb-2">✏️</div>
            <div className="text-sm font-medium text-[#111827] group-hover:text-[#D4A843]">新建问卷</div>
            <div className="text-[10px] text-[#6B7280] mt-0.5">创建新调研</div>
          </Link>
          <Link href="/dashboard/sales/my-logs" className="rounded-xl p-4 bg-white border border-[#E5E7EB] hover:border-[#D4A843]/40 hover:shadow-sm transition no-underline group">
            <div className="text-2xl mb-2">📝</div>
            <div className="text-sm font-medium text-[#111827] group-hover:text-[#D4A843]">操作记录</div>
            <div className="text-[10px] text-[#6B7280] mt-0.5">我的工作日志</div>
          </Link>
        </div>

        {/* ── Performance Analytics Panel ── */}
        {perf && (
          <div className="rounded-xl p-5 bg-white border border-[#E5E7EB]">
            <h2 className="text-sm font-semibold mb-4 text-[#374151]">
              📊 {isAdmin ? '推广总览' : '我的推广业绩'}
            </h2>
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: '总扫码', value: isAdmin ? perf.team_stats.total_scans : perf.my_stats.total_scans, rank: perf.my_rank.scan_rank },
                { label: '总注册', value: isAdmin ? perf.team_stats.total_registers : perf.my_stats.total_registers, rank: perf.my_rank.register_rank },
                { label: '转化率', value: `${isAdmin ? perf.team_stats.avg_conversion_rate : perf.my_stats.conversion_rate}%`, rank: perf.my_rank.conversion_rank },
              ].map(item => (
                <div key={item.label} className="rounded-xl p-3 text-center bg-[#F9FAFB] border border-[#E5E7EB]">
                  <div className="text-xl font-bold text-[#D4A843]">{item.value}</div>
                  <div className="text-[10px] text-[#6B7280]">{item.label}</div>
                  {!isAdmin && item.rank && perf.my_rank.total_sales > 1 && (
                    <div className="text-[10px] mt-1 text-[#6B7280]">
                      团队排名 <span className="font-bold text-[#374151]">#{item.rank}</span>/{perf.my_rank.total_sales}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {isAdmin && perf.sales_leaderboard && perf.sales_leaderboard.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-[#6B7280] mb-2">── Sales 排名 ──</h3>
                <div className="space-y-1.5">
                  {perf.sales_leaderboard.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#F9FAFB]">
                      <span className="text-xs font-bold w-6 text-[#D4A843]">#{i + 1}</span>
                      <span className="text-xs font-medium flex-1 text-[#111827]">{s.name}</span>
                      <span className="text-[10px] text-[#6B7280]">扫码{s.scans}</span>
                      <span className="text-[10px] text-[#6B7280]">注册{s.registers}</span>
                      <span className="text-[10px] font-medium text-[#D4A843]">{s.conversion}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {isAdmin && perf.channel_breakdown && perf.channel_breakdown.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-[#6B7280] mb-2">── 按渠道 ──</h3>
                <div className="space-y-1">
                  {perf.channel_breakdown.map(ch => (
                    <div key={ch.channel} className="flex items-center gap-3 px-3 py-1.5 text-xs">
                      <span className="w-24 text-[#374151]">{CH_LABELS[ch.channel] || ch.channel}</span>
                      <span className="text-[#6B7280]">扫码 {ch.scans}</span>
                      <span className="text-[#6B7280]">注册 {ch.registers}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!isAdmin && (
              <>
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="text-xs font-semibold text-[#374151]">📋 调研工具</h3>
                    <span className="text-[10px] text-[#6B7280]">注册 {perf.my_by_category.survey.registers}</span>
                  </div>
                  {perf.my_by_category.survey.items.length > 0 ? (
                    <div className="space-y-1">
                      {perf.my_by_category.survey.items.map(item => (
                        <div key={item.code} className="flex items-center gap-3 px-3 py-1.5 rounded bg-[#F9FAFB] text-xs">
                          <span className="flex-1 text-[#374151] truncate">{item.label || item.code}</span>
                          <span className="text-[#6B7280]">扫码{item.scans}</span>
                          <span className="text-[#6B7280]">注册{item.registers}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-[#9CA3AF] px-3">暂无调研推广</p>
                  )}
                </div>
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="text-xs font-semibold text-[#374151]">📱 社交媒体推广</h3>
                    <span className="text-[10px] text-[#6B7280]">注册 {perf.my_by_category.social.registers}</span>
                  </div>
                  {perf.my_by_category.social.items.length > 0 ? (
                    <div className="space-y-1">
                      {perf.my_by_category.social.items.map(item => (
                        <div key={item.code} className="flex items-center gap-3 px-3 py-1.5 rounded bg-[#F9FAFB] text-xs">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#D4A843]/10 text-[#374151]">{CH_LABELS[item.channel] || item.channel}</span>
                          <span className="flex-1 text-[#374151] truncate">{item.label}</span>
                          <span className="text-[#6B7280]">扫码{item.scans}</span>
                          <span className="text-[#6B7280]">注册{item.registers}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-[#9CA3AF] px-3">暂无社交媒体推广</p>
                  )}
                </div>
                {perf.my_rank.total_sales > 1 && (
                  <div className="rounded-lg p-3 bg-[#F9FAFB] border border-[#E5E7EB] mb-3">
                    <h3 className="text-xs font-semibold text-[#6B7280] mb-1.5">── 团队对比 ──</h3>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="text-[#6B7280]">
                        全团队总扫码：<span className="font-medium text-[#374151]">{perf.team_stats.total_scans}</span>
                        {perf.team_stats.total_scans > 0 && <span className="ml-1">我占比 {((perf.my_stats.total_scans / perf.team_stats.total_scans) * 100).toFixed(1)}%</span>}
                      </div>
                      <div className="text-[#6B7280]">
                        全团队总注册：<span className="font-medium text-[#374151]">{perf.team_stats.total_registers}</span>
                        {perf.team_stats.total_registers > 0 && <span className="ml-1">我占比 {((perf.my_stats.total_registers / perf.team_stats.total_registers) * 100).toFixed(1)}%</span>}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            {perf.ai_insight && !isAdmin && (
              <div className="rounded-lg p-3 bg-[#FFFBEB] border border-[#D4A843]/20">
                <p className="text-xs text-[#92400E]">💡 {perf.ai_insight}</p>
              </div>
            )}
          </div>
        )}

        {/* KPI Progress */}
        {kpi && (
          <div className="rounded-xl p-5 bg-white border border-[#E5E7EB]">
            <h2 className="text-sm font-semibold mb-4 text-[#374151]">本周 KPI</h2>
            <div className="space-y-4">
              {[
                { label: '注册', icon: '📥', ...kpi.leads },
                { label: '跟进', icon: '📞', ...kpi.followups },
                { label: '转化', icon: '🎯', ...kpi.conversions },
              ].map(item => {
                const pct = Math.min((item.current / item.target) * 100, 100);
                const met = item.current >= item.target;
                return (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-[#374151]">{item.icon} {item.label}</span>
                      <span className="text-xs font-bold" style={{ color: met ? '#10B981' : '#D4A843' }}>
                        {item.current}/{item.target} {met && '✓'}
                      </span>
                    </div>
                    <div className="h-3 rounded-full overflow-hidden bg-[#F3F4F6]">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: met ? '#10B981' : pct > 60 ? '#D4A843' : '#EF4444' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Funnel + QR Code side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Funnel — clickable */}
          {funnel && (
            <div className="rounded-xl p-5 bg-white border border-[#E5E7EB]">
              <h2 className="text-sm font-semibold mb-3 text-[#374151]">客户漏斗</h2>
              <div className="space-y-2">
                {FUNNEL_STAGES.map(key => {
                  const count = funnel.funnel[key] ?? 0;
                  const pct = (count / maxFunnel) * 100;
                  const cfg = STAGE_CFG[key];
                  const active = filterStage === key;
                  return (
                    <div
                      key={key}
                      onClick={() => setFilterStage(active ? null : key)}
                      className={`flex items-center gap-3 cursor-pointer rounded-lg px-1 py-0.5 transition ${active ? 'bg-[#F3F4F6]' : 'hover:bg-[#F9FAFB]'}`}
                      style={active ? { outline: `1px solid ${cfg.color}` } : undefined}
                    >
                      <span className="text-[10px] w-14 text-right font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
                      <div className="flex-1 h-5 rounded bg-[#F3F4F6]">
                        <div className="h-full rounded flex items-center justify-end pr-2 transition-all" style={{ width: `${Math.max(pct, 8)}%`, background: cfg.bg }}>
                          <span className="text-[10px] font-bold" style={{ color: cfg.color }}>{count}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-between text-[10px] text-[#6B7280]">
                <span>总计 {funnel.total}{funnel.lost > 0 ? ` (已流失 ${funnel.lost})` : ''}</span>
                <span>转化率 {funnel.conversionRate}%</span>
              </div>
              {filterStage && (
                <button onClick={() => setFilterStage(null)} className="mt-2 text-[10px] text-[#D4A843] hover:underline">
                  清除筛选
                </button>
              )}
            </div>
          )}

          {/* QR Codes — Grouped */}
          <div className="rounded-xl p-5 bg-white border border-[#E5E7EB]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[#374151]">推广码</h2>
              <button onClick={() => setShowQrCreate(!showQrCreate)} className="text-[10px] px-2.5 py-1 rounded-lg bg-[#D4A843]/10 text-[#D4A843]">+ 新建</button>
            </div>
            {showQrCreate && (
              <div className="space-y-2 mb-3">
                <div className="flex gap-2">
                  <input placeholder="备注（必填）" value={newLabel} onChange={e => setNewLabel(e.target.value)} className="flex-1 rounded-lg px-3 py-2 text-xs focus:outline-none bg-[#F9FAFB] border border-[#E5E7EB] text-[#111827] placeholder:text-[#9CA3AF]" />
                  <select value={newChannel} onChange={e => setNewChannel(e.target.value)} className="rounded-lg px-3 py-2 text-xs focus:outline-none bg-[#F9FAFB] border border-[#E5E7EB] text-[#111827]">
                    <option value="wechat">微信</option>
                    <option value="xiaohongshu">小红书</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="offline">线下活动</option>
                    <option value="douyin">抖音</option>
                    <option value="other">其他</option>
                  </select>
                  <button onClick={createQRCode} disabled={!newLabel.trim()} className="px-3 py-2 rounded-lg text-xs font-medium bg-[#D4A843] text-white disabled:opacity-40 disabled:cursor-not-allowed">生成</button>
                </div>
              </div>
            )}
            {qrcodes.length > 0 ? (
              <div className="space-y-4">
                {surveyQrcodes.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#374151]">📋 调研问卷</span>
                        <span className="text-[10px] text-[#6B7280]">{surveyQrcodes.length} 个</span>
                      </div>
                      <span className="text-[10px] text-[#6B7280]">扫码 {surveySubtotal.scans} / 注册 {surveySubtotal.registers}</span>
                    </div>
                    <div className="space-y-2">
                      {surveyQrcodes.map(qr => (
                        <QRCodeRow key={qr.id} qr={qr} getQrImageUrl={getQrImageUrl} onDownload={downloadQR} onShare={shareQR} />
                      ))}
                    </div>
                  </div>
                )}
                {socialQrcodes.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#374151]">📱 社交媒体</span>
                        <span className="text-[10px] text-[#6B7280]">{socialQrcodes.length} 个</span>
                      </div>
                      <span className="text-[10px] text-[#6B7280]">扫码 {socialSubtotal.scans} / 注册 {socialSubtotal.registers}</span>
                    </div>
                    <div className="space-y-2">
                      {socialQrcodes.map(qr => (
                        <QRCodeRow key={qr.id} qr={qr} getQrImageUrl={getQrImageUrl} onDownload={downloadQR} onShare={shareQR} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs py-4 text-center text-[#6B7280]">暂无推广码，点击上方「新建」创建</p>
            )}
          </div>
        </div>

        {/* Customer Engagement */}
        {engagement.length > 0 && (
          <div className="rounded-xl p-5 bg-white border border-[#E5E7EB]">
            <h2 className="text-sm font-semibold mb-3 text-[#374151]">📊 客户活跃度</h2>
            {engSummary && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
                {[
                  { label: '平均分', value: engSummary.avgScore, color: '#D4A843' },
                  { label: '🔥 高活跃', value: engSummary.high, color: '#10B981' },
                  { label: '🟡 中等', value: engSummary.medium, color: '#D4A843' },
                  { label: '🔵 低活跃', value: engSummary.low, color: '#3B82F6' },
                  { label: '⚪ 沉默', value: engSummary.dormant, color: '#6B7280' },
                ].map(item => (
                  <div key={item.label} className="rounded-lg px-3 py-2 text-center bg-[#F9FAFB] border border-[#E5E7EB]">
                    <div className="text-lg font-bold" style={{ color: item.color }}>{item.value}</div>
                    <div className="text-[10px] text-[#6B7280]">{item.label}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-1.5">
              {engagement.map(e => {
                const levelConfig = {
                  high: { emoji: '🔥', color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
                  medium: { emoji: '🟡', color: '#D4A843', bg: 'rgba(212,168,67,0.1)' },
                  low: { emoji: '🔵', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
                  dormant: { emoji: '⚪', color: '#6B7280', bg: 'rgba(107,114,128,0.1)' },
                }[e.level];
                return (
                  <div key={e.userId} className="flex items-center gap-3 rounded-lg px-3 py-2 bg-[#F9FAFB]">
                    <div className="size-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: levelConfig.bg, color: levelConfig.color }}>{e.totalScore}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium truncate text-[#111827]">{e.displayName || e.email || '未知'}</span>
                        <span className="text-[10px]" style={{ color: levelConfig.color }}>{levelConfig.emoji}</span>
                      </div>
                      <div className="flex gap-2 mt-0.5 text-[10px] text-[#6B7280]">
                        <span>💬{e.stats.conversationCount}</span>
                        <span>📌{e.stats.savedProfessors}</span>
                        <span>✉️{e.stats.emailsGenerated}</span>
                        {e.stats.daysSinceLastActive <= 3 && <span className="text-[#10B981]">● 近期活跃</span>}
                        {e.stats.daysSinceLastActive > 14 && <span className="text-[#EF4444]">● {e.stats.daysSinceLastActive}天未活跃</span>}
                      </div>
                    </div>
                    <div className="w-16 h-2 rounded-full overflow-hidden flex-shrink-0 bg-[#E5E7EB]">
                      <div className="h-full rounded-full" style={{ width: `${e.totalScore}%`, background: levelConfig.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Client Management ── */}
        <div className="rounded-xl p-5 bg-white border border-[#E5E7EB]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#374151]">客户管理</h2>
            <span className="text-[10px] text-[#6B7280]">{filteredClients.length} 人</span>
          </div>

          {/* Stage filter tabs */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            <button
              onClick={() => setFilterStage(null)}
              className={`text-[10px] px-2.5 py-1 rounded-full transition ${!filterStage ? 'bg-[#111827] text-white' : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]'}`}
            >
              全部 {clients.length}
            </button>
            {ALL_STAGES.map(s => {
              const count = clients.filter(c => c.stage === s).length;
              if (count === 0 && s !== filterStage) return null;
              const cfg = STAGE_CFG[s];
              return (
                <button
                  key={s}
                  onClick={() => setFilterStage(filterStage === s ? null : s)}
                  className="text-[10px] px-2.5 py-1 rounded-full transition"
                  style={{
                    background: filterStage === s ? cfg.color : cfg.bg,
                    color: filterStage === s ? 'white' : cfg.color,
                  }}
                >
                  {cfg.label} {count}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <input
            placeholder="搜索姓名/手机/邮箱..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-xs mb-3 focus:outline-none bg-[#F9FAFB] border border-[#E5E7EB] text-[#111827] placeholder:text-[#9CA3AF]"
          />

          {/* Client list */}
          {filteredClients.length > 0 ? (
            <div className="space-y-2">
              {filteredClients.map(c => {
                const cfg = STAGE_CFG[c.stage] || STAGE_CFG.lead;
                const isExpanded = expandedClient === c.id;
                return (
                  <div key={c.id} className="rounded-lg border border-[#E5E7EB] overflow-hidden">
                    {/* Row */}
                    <div
                      className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-[#F9FAFB] transition"
                      onClick={() => setExpandedClient(isExpanded ? null : c.id)}
                    >
                      <div className="size-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: cfg.bg, color: cfg.color }}>
                        {c.name[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium truncate text-[#111827]">{c.name}</span>
                          {c.registered ? (
                            <span className="text-[8px] px-1 rounded bg-[#10B981]/10 text-[#10B981]">✅ 已注册</span>
                          ) : (
                            <span className="text-[8px] px-1 rounded bg-[#EF4444]/10 text-[#EF4444]">⚠️ 未注册</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#6B7280]">
                          {c.source === 'survey' && <span>📋 {c.survey_title || '调研'}</span>}
                          {c.source !== 'survey' && c.source_channel && <span>{CH_LABELS[c.source_channel] || c.source_channel}</span>}
                          {c.phone && <span>📱{c.phone.slice(-4)}</span>}
                          {c.email && <span>📧{c.email.split('@')[0]}{c.email_status === 'valid' ? '✓' : c.email_status === 'invalid' ? '✗' : ''}</span>}
                        </div>
                      </div>
                      {c.value_score !== null && (
                        <span className="text-[10px] font-medium text-[#D4A843] flex-shrink-0">⭐{c.value_score}</span>
                      )}
                      {/* Stage dropdown */}
                      <select
                        value={c.stage}
                        onClick={e => e.stopPropagation()}
                        onChange={e => { e.stopPropagation(); updateClientStage(c, e.target.value); }}
                        disabled={updatingStage === c.id}
                        className="text-[10px] px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none flex-shrink-0"
                        style={{ background: cfg.bg, color: cfg.color }}
                      >
                        {ALL_STAGES.map(s => (
                          <option key={s} value={s}>{STAGE_CFG[s].label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Expanded detail panel */}
                    {isExpanded && (
                      <div className="px-3 pb-3 pt-1 border-t border-[#F3F4F6] bg-[#FAFAFA]">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] mb-3">
                          {c.phone && <div><span className="text-[#6B7280]">📱 手机：</span><span className="text-[#111827]">{c.phone}</span></div>}
                          {c.email && <div><span className="text-[#6B7280]">📧 邮箱：</span><span className="text-[#111827]">{c.email}</span>{c.email_status === 'valid' ? <span className="ml-1 text-green-600" title="邮箱已验证">✓</span> : c.email_status === 'invalid' ? <span className="ml-1 text-red-500" title="邮箱无效">✗</span> : c.type === 'survey_lead' ? <span className="ml-1 text-[#9CA3AF]" title="验证中">⏳</span> : null}</div>}
                          {c.wechat && <div><span className="text-[#6B7280]">💬 微信：</span><span className="text-[#111827]">{c.wechat}</span></div>}
                          {c.survey_title && <div><span className="text-[#6B7280]">📋 来源：</span><span className="text-[#111827]">{c.survey_title}</span></div>}
                          <div><span className="text-[#6B7280]">📅 获取时间：</span><span className="text-[#111827]">{new Date(c.created_at).toLocaleDateString('zh-CN')}</span></div>
                          {c.contact_count > 0 && <div><span className="text-[#6B7280]">📞 联系次数：</span><span className="text-[#111827]">{c.contact_count}</span></div>}
                          {c.last_contacted_at && <div><span className="text-[#6B7280]">🕐 最后联系：</span><span className="text-[#111827]">{new Date(c.last_contacted_at).toLocaleDateString('zh-CN')}</span></div>}
                          {c.value_score !== null && <div><span className="text-[#6B7280]">⭐ 价值评分：</span><span className="font-medium text-[#D4A843]">{c.value_score}/100</span></div>}
                        </div>
                        {c.notes && (
                          <div className="text-[10px] mb-3">
                            <span className="text-[#6B7280]">备注：</span>
                            <span className="text-[#374151]">{c.notes}</span>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1.5">
                          {ALL_STAGES.filter(s => s !== c.stage).map(s => (
                            <button
                              key={s}
                              onClick={() => updateClientStage(c, s)}
                              disabled={updatingStage === c.id}
                              className="text-[10px] px-2 py-1 rounded-lg transition disabled:opacity-50"
                              style={{ background: STAGE_CFG[s].bg, color: STAGE_CFG[s].color }}
                            >
                              标记{STAGE_CFG[s].label}
                            </button>
                          ))}
                          {c.type === 'registered' && (
                            <Link
                              href={`/dashboard/sales/customer/${c.id}`}
                              className="text-[10px] px-2 py-1 rounded-lg bg-[#D4A843]/10 text-[#D4A843] no-underline"
                            >
                              查看详情 →
                            </Link>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : clients.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-[#6B7280] mb-3">还没有客户？去问卷广场选择一份调研来推广吧！</p>
              <Link
                href="/dashboard/sales/surveys?tab=plaza"
                className="inline-block px-4 py-2 rounded-lg bg-[#D4A843] text-white text-xs font-medium no-underline hover:opacity-90 transition"
              >
                去问卷广场 →
              </Link>
            </div>
          ) : (
            <p className="text-xs py-4 text-center text-[#6B7280]">没有匹配的客户</p>
          )}
        </div>

        {/* Work Log */}
        <div className="rounded-xl p-5 bg-white border border-[#E5E7EB]">
          <h2 className="text-sm font-semibold mb-3 text-[#374151]">我的工作日志</h2>
          {logs.length > 0 ? (
            <div className="space-y-0">
              {logs.map(log => (
                <div key={log.id} className="flex items-start gap-3 py-2.5 border-b border-[#F3F4F6] last:border-0">
                  <div className="mt-1.5 size-1.5 rounded-full flex-shrink-0 bg-[#D4A843]" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#D4A843]/10 text-[#374151]">
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                      {log.target_type && <span className="text-[10px] text-[#6B7280]">{log.target_type}</span>}
                    </div>
                    {log.details && (
                      <p className="text-[10px] mt-0.5 truncate text-[#6B7280]">
                        {typeof (log.details as Record<string, unknown>).old_stage === 'string' && typeof (log.details as Record<string, unknown>).new_stage === 'string'
                          ? `${STAGE_CFG[(log.details as Record<string, unknown>).old_stage as string]?.label || (log.details as Record<string, unknown>).old_stage} → ${STAGE_CFG[(log.details as Record<string, unknown>).new_stage as string]?.label || (log.details as Record<string, unknown>).new_stage}`
                          : typeof (log.details as Record<string, unknown>).stage === 'string' ? (log.details as Record<string, unknown>).stage as string : ''}
                        {typeof (log.details as Record<string, unknown>).note === 'string' ? ` ${(log.details as Record<string, unknown>).note as string}` : ''}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] flex-shrink-0 text-[#6B7280]">
                    {new Date(log.created_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs py-4 text-center text-[#6B7280]">暂无工作记录</p>
          )}
        </div>
      </div>
    </div>
  );
}

function QRCodeRow({ qr, getQrImageUrl, onDownload, onShare }: {
  qr: QRCode;
  getQrImageUrl: (code: string) => string;
  onDownload: (code: string) => void;
  onShare: (code: string, label: string | null) => void;
}) {
  return (
    <div className="rounded-lg p-3 bg-[#F9FAFB] border border-[#E5E7EB]">
      <div className="flex items-start gap-3">
        <img src={getQrImageUrl(qr.code)} alt={`QR: ${qr.label || qr.code}`} width={80} height={80} className="rounded border border-[#E5E7EB] bg-white flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#D4A843]/10 text-[#374151]">{CH_LABELS[qr.channel] || qr.channel}</span>
            {qr.label && <span className="text-xs font-medium text-[#111827]">{qr.label}</span>}
          </div>
          <div className="text-[10px] font-mono text-[#D4A843]">{qr.code}</div>
          <div className="flex items-center gap-3 text-[10px] text-[#6B7280]">
            <span>👁 {qr.scan_count} 扫码</span>
            <span>📥 {qr.register_count} 注册</span>
            {qr.scan_count > 0 && <span className="text-[#D4A843]">{((qr.register_count / qr.scan_count) * 100).toFixed(0)}%</span>}
          </div>
          <div className="flex gap-2 pt-0.5">
            <button onClick={() => onDownload(qr.code)} className="text-[10px] px-2 py-0.5 rounded bg-[#D4A843]/10 text-[#D4A843]">下载</button>
            <button onClick={() => onShare(qr.code, qr.label)} className="text-[10px] px-2 py-0.5 rounded bg-[#D4A843]/10 text-[#D4A843]">分享</button>
          </div>
        </div>
      </div>
    </div>
  );
}
