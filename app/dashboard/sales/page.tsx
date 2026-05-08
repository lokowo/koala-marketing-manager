'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase/client';
import { useRouter } from 'next/navigation';

interface QRCode { id: string; code: string; channel: string; label: string | null; scan_count: number; created_at: string }
interface Customer { id: string; customer_user_id: string; stage: string; note: string | null; created_at: string; user_profiles?: { display_name: string; email: string; avatar_url: string | null } }
interface FunnelData { funnel: Record<string, number>; total: number; conversionRate: string }
interface KpiData { leads: { current: number; target: number }; followups: { current: number; target: number }; conversions: { current: number; target: number } }
interface WorkLog { id: string; action: string; target_type: string; target_id: string | null; details: Record<string, unknown> | null; created_at: string }

const STAGE_LABELS: Record<string, { label: string; color: string }> = {
  lead: { label: '线索', color: '#6a7a7e' },
  contacted: { label: '已联系', color: '#c9a96e' },
  interested: { label: '有意向', color: '#5a8060' },
  trial: { label: '试用中', color: '#4a90d9' },
  converted: { label: '已转化', color: '#2ecc71' },
  churned: { label: '流失', color: '#b06040' },
};

const FUNNEL_STAGES = ['lead', 'contacted', 'interested', 'trial', 'converted'] as const;

const ACTION_LABELS: Record<string, string> = {
  customer_update: '客户跟进',
  blog_generate: '生成博客',
  blog_generate_professor: '教授文章',
  professor_create: '新建教授',
};

export default function SalesDashboard() {
  const router = useRouter();
  const [qrcodes, setQrcodes] = useState<QRCode[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [kpi, setKpi] = useState<KpiData | null>(null);
  const [logs, setLogs] = useState<WorkLog[]>([]);
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
    const [qr, cust, fn, kpiRes, logsRes] = await Promise.all([
      fetch('/api/sales/qrcode').then(r => r.json()),
      fetch('/api/sales/customers').then(r => r.json()),
      fetch('/api/sales/funnel').then(r => r.json()),
      fetch('/api/sales/my-kpi').then(r => r.ok ? r.json() : null),
      fetch('/api/sales/my-logs?limit=10').then(r => r.ok ? r.json() : { data: [] }),
    ]);
    setQrcodes(qr.data ?? []);
    setCustomers(cust.data ?? []);
    setFunnel(fn);
    setKpi(kpiRes);
    setLogs(logsRes.data ?? []);
    setLoading(false);
  }

  async function createQRCode() {
    const res = await fetch('/api/sales/qrcode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: newChannel, label: newLabel }),
    });
    if (res.ok) {
      setNewLabel('');
      setShowQrCreate(false);
      loadData();
    }
  }

  function downloadQR(code: string) {
    const url = `${window.location.origin}/r/${code}`;
    const text = encodeURIComponent(url);
    window.open(`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${text}`, '_blank');
  }

  function shareQR(code: string, label: string | null) {
    const url = `${window.location.origin}/r/${code}`;
    if (navigator.share) {
      navigator.share({ title: label || 'Koala PhD 推广链接', url });
    } else {
      navigator.clipboard.writeText(url);
      alert('链接已复制到剪贴板');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#080c10' }}>
        <p className="text-sm" style={{ color: '#6a7a7e' }}>加载中…</p>
      </div>
    );
  }

  const maxFunnel = Math.max(...FUNNEL_STAGES.map(s => funnel?.funnel[s] ?? 0), 1);

  return (
    <div className="min-h-screen p-4 sm:p-6" style={{ background: '#080c10', color: '#e8e4dc' }}>
      <div className="max-w-4xl mx-auto space-y-5">
        <h1 className="text-xl font-bold" style={{ color: '#c9a96e' }}>Sales Dashboard</h1>

        {/* KPI Progress */}
        {kpi && (
          <div className="rounded-xl p-5" style={{ background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.1)' }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: '#a8b8ac' }}>本周 KPI</h2>
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
                      <span className="text-xs" style={{ color: '#a8b8ac' }}>{item.icon} {item.label}</span>
                      <span className="text-xs font-bold" style={{ color: met ? '#2ecc71' : '#c9a96e' }}>
                        {item.current}/{item.target} {met && '✓'}
                      </span>
                    </div>
                    <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          background: met ? '#2ecc71' : pct > 60 ? '#c9a96e' : '#b06040',
                        }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      {Array.from({ length: item.target }, (_, i) => (
                        <div
                          key={i}
                          className="size-2 rounded-sm"
                          style={{ background: i < item.current ? (met ? '#2ecc71' : '#c9a96e') : 'rgba(255,255,255,0.08)' }}
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
            <div className="rounded-xl p-5" style={{ background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.1)' }}>
              <h2 className="text-sm font-semibold mb-3" style={{ color: '#a8b8ac' }}>客户漏斗</h2>
              <div className="space-y-2">
                {FUNNEL_STAGES.map(key => {
                  const count = funnel.funnel[key] ?? 0;
                  const pct = (count / maxFunnel) * 100;
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <span className="text-[10px] w-12 text-right" style={{ color: STAGE_LABELS[key].color }}>{STAGE_LABELS[key].label}</span>
                      <div className="flex-1 h-5 rounded" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <div className="h-full rounded flex items-center justify-end pr-2 transition-all" style={{ width: `${Math.max(pct, 8)}%`, background: `${STAGE_LABELS[key].color}40` }}>
                          <span className="text-[10px] font-bold" style={{ color: STAGE_LABELS[key].color }}>{count}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-between text-[10px]" style={{ color: '#6a7a7e' }}>
                <span>总计 {funnel.total}</span>
                <span>转化率 {funnel.conversionRate}%</span>
              </div>
            </div>
          )}

          {/* QR Codes */}
          <div className="rounded-xl p-5" style={{ background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.1)' }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold" style={{ color: '#a8b8ac' }}>推广码</h2>
              <button
                onClick={() => setShowQrCreate(!showQrCreate)}
                className="text-[10px] px-2.5 py-1 rounded-lg"
                style={{ background: 'rgba(201,169,110,0.15)', color: '#c9a96e' }}
              >
                + 新建
              </button>
            </div>

            {showQrCreate && (
              <div className="flex gap-2 mb-3">
                <input
                  placeholder="标签（如：朋友圈）"
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  className="flex-1 rounded-lg px-3 py-2 text-xs focus:outline-none"
                  style={{ background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.1)', color: '#e8e4dc' }}
                />
                <select
                  value={newChannel}
                  onChange={e => setNewChannel(e.target.value)}
                  className="rounded-lg px-3 py-2 text-xs focus:outline-none"
                  style={{ background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.1)', color: '#e8e4dc' }}
                >
                  <option value="wechat">微信</option>
                  <option value="xiaohongshu">小红书</option>
                  <option value="douyin">抖音</option>
                  <option value="other">其他</option>
                </select>
                <button onClick={createQRCode} className="px-3 py-2 rounded-lg text-xs font-medium" style={{ background: '#c9a96e', color: '#080c10' }}>
                  生成
                </button>
              </div>
            )}

            {qrcodes.length > 0 ? (
              <div className="space-y-2">
                {qrcodes.map(qr => (
                  <div key={qr.id} className="rounded-lg px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-mono" style={{ color: '#c9a96e' }}>{qr.code}</span>
                        {qr.label && <span className="text-[10px] ml-2" style={{ color: '#6a7a7e' }}>{qr.label}</span>}
                      </div>
                      <span className="text-[10px]" style={{ color: '#6a7a7e' }}>{qr.scan_count} 扫描</span>
                    </div>
                    <div className="flex gap-2 mt-1.5">
                      <button
                        onClick={() => downloadQR(qr.code)}
                        className="text-[10px] px-2 py-0.5 rounded"
                        style={{ background: 'rgba(201,169,110,0.1)', color: '#c9a96e' }}
                      >
                        保存二维码
                      </button>
                      <button
                        onClick={() => shareQR(qr.code, qr.label)}
                        className="text-[10px] px-2 py-0.5 rounded"
                        style={{ background: 'rgba(201,169,110,0.1)', color: '#c9a96e' }}
                      >
                        分享
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs py-4 text-center" style={{ color: '#6a7a7e' }}>暂无推广码，点击上方「新建」创建</p>
            )}
          </div>
        </div>

        {/* Customers */}
        <div className="rounded-xl p-5" style={{ background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.1)' }}>
          <h2 className="text-sm font-semibold mb-3" style={{ color: '#a8b8ac' }}>客户列表</h2>
          {customers.length > 0 ? (
            <div className="space-y-2">
              {customers.map(c => (
                <Link
                  key={c.id}
                  href={`/dashboard/sales/customer/${c.id}`}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg no-underline hover:bg-white/5 transition"
                  style={{ background: 'rgba(255,255,255,0.02)' }}
                >
                  <div className="flex items-center gap-2">
                    <div className="size-7 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: '#c9a96e', color: '#080c10' }}>
                      {(c.user_profiles?.display_name || c.user_profiles?.email || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: '#e8e4dc' }}>{c.user_profiles?.display_name || c.user_profiles?.email || '未知'}</p>
                      <p className="text-[10px]" style={{ color: '#6a7a7e' }}>{new Date(c.created_at).toLocaleDateString('zh-CN')}</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${STAGE_LABELS[c.stage]?.color}20`, color: STAGE_LABELS[c.stage]?.color }}>
                    {STAGE_LABELS[c.stage]?.label || c.stage}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-xs py-4 text-center" style={{ color: '#6a7a7e' }}>暂无客户</p>
          )}
        </div>

        {/* Work Log */}
        <div className="rounded-xl p-5" style={{ background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.1)' }}>
          <h2 className="text-sm font-semibold mb-3" style={{ color: '#a8b8ac' }}>我的工作日志</h2>
          {logs.length > 0 ? (
            <div className="space-y-0">
              {logs.map(log => (
                <div key={log.id} className="flex items-start gap-3 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <div className="mt-1.5 size-1.5 rounded-full flex-shrink-0" style={{ background: '#c9a96e' }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(201,169,110,0.1)', color: '#a8b8ac' }}>
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                      {log.target_type && (
                        <span className="text-[10px]" style={{ color: '#6a7a7e' }}>{log.target_type}</span>
                      )}
                    </div>
                    {log.details && (
                      <p className="text-[10px] mt-0.5 truncate" style={{ color: '#6a7a7e' }}>
                        {(log.details as Record<string, unknown>).stage as string || (log.details as Record<string, unknown>).note as string || ''}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] flex-shrink-0" style={{ color: '#6a7a7e' }}>
                    {new Date(log.created_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs py-4 text-center" style={{ color: '#6a7a7e' }}>暂无工作记录</p>
          )}
        </div>
      </div>
    </div>
  );
}
