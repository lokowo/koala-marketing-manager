'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase/client';
import { useRouter } from 'next/navigation';

interface QRCode { id: string; code: string; channel: string; label: string | null; scan_count: number; register_count: number; created_at: string }
interface Customer { id: string; customer_user_id: string; stage: string; note: string | null; created_at: string; user_profiles?: { display_name: string; email: string; avatar_url: string | null } }
interface FunnelData { funnel: Record<string, number>; total: number; conversionRate: string }
interface KpiData { leads: { current: number; target: number }; followups: { current: number; target: number }; conversions: { current: number; target: number } }
interface WorkLog { id: string; action: string; target_type: string; target_id: string | null; details: Record<string, unknown> | null; created_at: string }
interface EngagementEntry { userId: string; displayName: string; email: string; totalScore: number; level: 'high' | 'medium' | 'low' | 'dormant'; breakdown: { chatActivity: number; professorEngagement: number; profileCompleteness: number; outreachActivity: number; recency: number }; stats: { conversationCount: number; savedProfessors: number; emailsGenerated: number; profilePct: number; daysSinceLastActive: number; registeredDaysAgo: number } }
interface EngagementSummary { high: number; medium: number; low: number; dormant: number; total: number; avgScore: number }

const STAGE_LABELS: Record<string, { label: string; color: string }> = {
  lead: { label: '线索', color: '#6B7280' },
  contacted: { label: '已联系', color: '#D4A843' },
  interested: { label: '有意向', color: '#059669' },
  trial: { label: '试用中', color: '#3B82F6' },
  converted: { label: '已转化', color: '#10B981' },
  churned: { label: '流失', color: '#EF4444' },
};

const FUNNEL_STAGES = ['lead', 'contacted', 'interested', 'trial', 'converted'] as const;

const ACTION_LABELS: Record<string, string> = {
  customer_update: '客户跟进',
  create_qrcode: '生成推广码',
  customer_registered: '客户注册',
  view_customer: '查看客户',
  generate_email_for_customer: '生成套磁信',
  add_customer_note: '客户备注',
  share_qrcode: '分享二维码',
};

export default function SalesDashboard() {
  const router = useRouter();
  const [qrcodes, setQrcodes] = useState<QRCode[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [kpi, setKpi] = useState<KpiData | null>(null);
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [engagement, setEngagement] = useState<EngagementEntry[]>([]);
  const [engSummary, setEngSummary] = useState<EngagementSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState('');
  const [newChannel, setNewChannel] = useState('wechat');
  const [showQrCreate, setShowQrCreate] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/login'); return; }
      loadData();
    });
  }, [router]);

  async function loadData() {
    setLoading(true);
    const [qr, cust, fn, kpiRes, logsRes, engRes] = await Promise.all([
      fetch('/api/sales/qrcode').then(r => r.json()),
      fetch('/api/sales/customers').then(r => r.json()),
      fetch('/api/sales/funnel').then(r => r.json()),
      fetch('/api/sales/my-kpi').then(r => r.ok ? r.json() : null),
      fetch('/api/sales/my-logs?limit=10').then(r => r.ok ? r.json() : { data: [] }),
      fetch('/api/sales/customer-engagement').then(r => r.ok ? r.json() : { data: [], summary: null }),
    ]);
    setQrcodes(qr.data ?? []);
    setCustomers(cust.data ?? []);
    setFunnel(fn);
    setKpi(kpiRes);
    setLogs(logsRes.data ?? []);
    setEngagement(engRes.data ?? []);
    setEngSummary(engRes.summary ?? null);
    setLoading(false);
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://koalaphd.com';

  function getQrUrl(code: string) {
    return `${baseUrl}/r/${code}`;
  }

  function getQrImageUrl(code: string) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&format=png&data=${encodeURIComponent(getQrUrl(code))}`;
  }

  async function createQRCode() {
    if (!newLabel.trim()) { alert('请填写备注，方便追踪不同渠道的效果'); return; }
    const res = await fetch('/api/sales/qrcode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: newChannel, label: newLabel.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.existing) {
        alert(`该渠道已有推广码：${data.data.code}`);
      }
      setNewLabel('');
      setShowQrCreate(false);
      loadData();
    }
  }

  function downloadQR(code: string) {
    window.open(getQrImageUrl(code), '_blank');
  }

  function shareQR(code: string, label: string | null) {
    const url = getQrUrl(code);
    if (navigator.share) {
      navigator.share({ title: label || 'Koala PhD 推广链接', url });
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

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827]">
      {/* Top nav */}
      <div className="bg-white border-b border-[#E5E7EB] px-4 sm:px-6 py-3 flex items-center justify-between">
        <h1 className="text-base font-bold text-[#111827]">Sales Dashboard</h1>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/koala/surveys" className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#D4A843] bg-[#D4A843]/10 no-underline hover:bg-[#D4A843]/20 transition">
            📋 调研问卷
          </Link>
          <Link href="/dashboard/koala" className="px-3 py-1.5 rounded-lg text-xs text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] no-underline transition">
            管理后台 →
          </Link>
          <Link href="/koala/home" className="px-3 py-1.5 rounded-lg text-xs text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] no-underline transition">
            🏠 主页
          </Link>
        </div>
      </div>

      <div className="p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* Quick actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link href="/dashboard/koala/surveys" className="rounded-xl p-4 bg-white border border-[#E5E7EB] hover:border-[#D4A843]/40 hover:shadow-sm transition no-underline group">
            <div className="text-2xl mb-2">📋</div>
            <div className="text-sm font-medium text-[#111827] group-hover:text-[#D4A843]">调研问卷</div>
            <div className="text-[10px] text-[#6B7280] mt-0.5">创建 · 编辑 · 推广</div>
          </Link>
          <Link href="/dashboard/koala/surveys?tab=plaza" className="rounded-xl p-4 bg-white border border-[#E5E7EB] hover:border-[#D4A843]/40 hover:shadow-sm transition no-underline group">
            <div className="text-2xl mb-2">📱</div>
            <div className="text-sm font-medium text-[#111827] group-hover:text-[#D4A843]">生成推广码</div>
            <div className="text-[10px] text-[#6B7280] mt-0.5">为问卷生成二维码</div>
          </Link>
          <Link href="/dashboard/koala/surveys/create" className="rounded-xl p-4 bg-white border border-[#E5E7EB] hover:border-[#D4A843]/40 hover:shadow-sm transition no-underline group">
            <div className="text-2xl mb-2">✏️</div>
            <div className="text-sm font-medium text-[#111827] group-hover:text-[#D4A843]">新建问卷</div>
            <div className="text-[10px] text-[#6B7280] mt-0.5">创建新调研</div>
          </Link>
          <Link href="/dashboard/koala/my-logs" className="rounded-xl p-4 bg-white border border-[#E5E7EB] hover:border-[#D4A843]/40 hover:shadow-sm transition no-underline group">
            <div className="text-2xl mb-2">📝</div>
            <div className="text-sm font-medium text-[#111827] group-hover:text-[#D4A843]">操作记录</div>
            <div className="text-[10px] text-[#6B7280] mt-0.5">我的工作日志</div>
          </Link>
        </div>

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
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          background: met ? '#10B981' : pct > 60 ? '#D4A843' : '#EF4444',
                        }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      {Array.from({ length: item.target }, (_, i) => (
                        <div
                          key={i}
                          className="size-2 rounded-sm"
                          style={{ background: i < item.current ? (met ? '#10B981' : '#D4A843') : '#E5E7EB' }}
                        />
                      )).slice(0, 20)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Funnel + QR Code side by side on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Funnel */}
          {funnel && (
            <div className="rounded-xl p-5 bg-white border border-[#E5E7EB]">
              <h2 className="text-sm font-semibold mb-3 text-[#374151]">客户漏斗</h2>
              <div className="space-y-2">
                {FUNNEL_STAGES.map(key => {
                  const count = funnel.funnel[key] ?? 0;
                  const pct = (count / maxFunnel) * 100;
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <span className="text-[10px] w-12 text-right" style={{ color: STAGE_LABELS[key].color }}>{STAGE_LABELS[key].label}</span>
                      <div className="flex-1 h-5 rounded bg-[#F3F4F6]">
                        <div className="h-full rounded flex items-center justify-end pr-2 transition-all" style={{ width: `${Math.max(pct, 8)}%`, background: `${STAGE_LABELS[key].color}20` }}>
                          <span className="text-[10px] font-bold" style={{ color: STAGE_LABELS[key].color }}>{count}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-between text-[10px] text-[#6B7280]">
                <span>总计 {funnel.total}</span>
                <span>转化率 {funnel.conversionRate}%</span>
              </div>
            </div>
          )}

          {/* QR Codes */}
          <div className="rounded-xl p-5 bg-white border border-[#E5E7EB]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[#374151]">推广码</h2>
              <button
                onClick={() => setShowQrCreate(!showQrCreate)}
                className="text-[10px] px-2.5 py-1 rounded-lg bg-[#D4A843]/10 text-[#D4A843]"
              >
                + 新建
              </button>
            </div>

            {showQrCreate && (
              <div className="space-y-2 mb-3">
                <div className="flex gap-2">
                  <input
                    placeholder="备注（必填，如：微信群A、线下活动B）"
                    value={newLabel}
                    onChange={e => setNewLabel(e.target.value)}
                    className="flex-1 rounded-lg px-3 py-2 text-xs focus:outline-none bg-[#F9FAFB] border border-[#E5E7EB] text-[#111827] placeholder:text-[#9CA3AF]"
                  />
                  <select
                    value={newChannel}
                    onChange={e => setNewChannel(e.target.value)}
                    className="rounded-lg px-3 py-2 text-xs focus:outline-none bg-[#F9FAFB] border border-[#E5E7EB] text-[#111827]"
                  >
                    <option value="wechat">微信</option>
                    <option value="xiaohongshu">小红书</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="offline">线下活动</option>
                    <option value="douyin">抖音</option>
                    <option value="other">其他</option>
                  </select>
                  <button
                    onClick={createQRCode}
                    disabled={!newLabel.trim()}
                    className="px-3 py-2 rounded-lg text-xs font-medium bg-[#D4A843] text-white disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    生成
                  </button>
                </div>
                {!newLabel.trim() && (
                  <p className="text-[10px] text-[#EF4444]">请填写备注，方便追踪不同渠道的效果</p>
                )}
              </div>
            )}

            {qrcodes.length > 0 ? (
              <div className="space-y-3">
                {qrcodes.map(qr => {
                  const chLabel: Record<string, string> = { wechat: '📱 微信', xiaohongshu: '📕 小红书', linkedin: '💼 LinkedIn', offline: '🏫 线下', douyin: '🎵 抖音', survey: '📋 调研', other: '🔗 其他' };
                  return (
                    <div key={qr.id} className="rounded-lg p-3 bg-[#F9FAFB] border border-[#E5E7EB]">
                      <div className="flex items-start gap-3">
                        <img
                          src={getQrImageUrl(qr.code)}
                          alt={`QR: ${qr.label || qr.code}`}
                          width={100}
                          height={100}
                          className="rounded border border-[#E5E7EB] bg-white flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#D4A843]/10 text-[#374151]">
                              {chLabel[qr.channel] || qr.channel}
                            </span>
                            {qr.label && <span className="text-xs font-medium text-[#111827]">{qr.label}</span>}
                          </div>
                          <div className="text-[10px] font-mono text-[#D4A843]">{qr.code}</div>
                          <div className="flex items-center gap-3 text-[10px] text-[#6B7280]">
                            <span>👁 {qr.scan_count} 扫描</span>
                            <span>📥 {qr.register_count} 注册</span>
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => downloadQR(qr.code)}
                              className="text-[10px] px-2 py-0.5 rounded bg-[#D4A843]/10 text-[#D4A843]"
                            >
                              下载大图
                            </button>
                            <button
                              onClick={() => shareQR(qr.code, qr.label)}
                              className="text-[10px] px-2 py-0.5 rounded bg-[#D4A843]/10 text-[#D4A843]"
                            >
                              分享链接
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
                  { label: '平均分', value: engSummary.avgScore, icon: '📈', color: '#D4A843' },
                  { label: '🔥 高活跃', value: engSummary.high, icon: '', color: '#10B981' },
                  { label: '🟡 中等', value: engSummary.medium, icon: '', color: '#D4A843' },
                  { label: '🔵 低活跃', value: engSummary.low, icon: '', color: '#3B82F6' },
                  { label: '⚪ 沉默', value: engSummary.dormant, icon: '', color: '#6B7280' },
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
                    <div className="size-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: levelConfig.bg, color: levelConfig.color }}>
                      {e.totalScore}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium truncate text-[#111827]">{e.displayName || e.email || '未知'}</span>
                        <span className="text-[10px]" style={{ color: levelConfig.color }}>{levelConfig.emoji}</span>
                      </div>
                      <div className="flex gap-2 mt-0.5 text-[10px] text-[#6B7280]">
                        <span>💬{e.stats.conversationCount}</span>
                        <span>📌{e.stats.savedProfessors}</span>
                        <span>✉️{e.stats.emailsGenerated}</span>
                        <span>📝{e.stats.profilePct}%</span>
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

        {/* Customers */}
        <div className="rounded-xl p-5 bg-white border border-[#E5E7EB]">
          <h2 className="text-sm font-semibold mb-3 text-[#374151]">客户列表</h2>
          {customers.length > 0 ? (
            <div className="space-y-2">
              {customers.map(c => (
                <Link
                  key={c.id}
                  href={`/dashboard/sales/customer/${c.id}`}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg no-underline hover:bg-[#F3F4F6] transition bg-[#F9FAFB] border border-[#E5E7EB]"
                >
                  <div className="flex items-center gap-2">
                    <div className="size-7 rounded-full flex items-center justify-center text-[10px] font-bold bg-[#D4A843] text-white">
                      {(c.user_profiles?.display_name || c.user_profiles?.email || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs text-[#111827]">{c.user_profiles?.display_name || c.user_profiles?.email || '未知'}</p>
                      <p className="text-[10px] text-[#6B7280]">{new Date(c.created_at).toLocaleDateString('zh-CN')}</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${STAGE_LABELS[c.stage]?.color}20`, color: STAGE_LABELS[c.stage]?.color }}>
                    {STAGE_LABELS[c.stage]?.label || c.stage}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-xs py-4 text-center text-[#6B7280]">暂无客户</p>
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
                      {log.target_type && (
                        <span className="text-[10px] text-[#6B7280]">{log.target_type}</span>
                      )}
                    </div>
                    {log.details && (
                      <p className="text-[10px] mt-0.5 truncate text-[#6B7280]">
                        {typeof (log.details as Record<string, unknown>).stage === 'string' ? (log.details as Record<string, unknown>).stage as string : ''}
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
    </div>
  );
}
