'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase/client';
import { useRouter } from 'next/navigation';

interface QRCode { id: string; code: string; channel: string; label: string | null; scan_count: number; created_at: string }
interface Customer { id: string; customer_user_id: string; stage: string; note: string | null; created_at: string; user_profiles?: { display_name: string; email: string; avatar_url: string | null } }
interface FunnelData { funnel: Record<string, number>; total: number; conversionRate: string }

const STAGE_LABELS: Record<string, { label: string; color: string }> = {
  lead: { label: '线索', color: '#6a7a7e' },
  contacted: { label: '已联系', color: '#c9a96e' },
  interested: { label: '有意向', color: '#5a8060' },
  trial: { label: '试用中', color: '#4a90d9' },
  converted: { label: '已转化', color: '#2ecc71' },
  churned: { label: '流失', color: '#b06040' },
};

export default function SalesDashboard() {
  const router = useRouter();
  const [qrcodes, setQrcodes] = useState<QRCode[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState('');
  const [newChannel, setNewChannel] = useState('wechat');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/login'); return; }
      loadData();
    });
  }, [router]);

  async function loadData() {
    setLoading(true);
    const [qr, cust, fn] = await Promise.all([
      fetch('/api/sales/qrcode').then(r => r.json()),
      fetch('/api/sales/customers').then(r => r.json()),
      fetch('/api/sales/funnel').then(r => r.json()),
    ]);
    setQrcodes(qr.data ?? []);
    setCustomers(cust.data ?? []);
    setFunnel(fn);
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
      loadData();
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#080c10' }}>
        <p className="text-sm" style={{ color: '#6a7a7e' }}>加载中…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{ background: '#080c10', color: '#e8e4dc' }}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl font-bold mb-6" style={{ color: '#c9a96e' }}>Sales Dashboard</h1>

        {/* Funnel Overview */}
        {funnel && (
          <div className="rounded-xl p-5 mb-6" style={{ background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.1)' }}>
            <h2 className="text-sm font-semibold mb-3" style={{ color: '#a8b8ac' }}>转化漏斗</h2>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {Object.entries(STAGE_LABELS).map(([key, { label, color }]) => (
                <div key={key} className="text-center">
                  <div className="text-lg font-bold" style={{ color }}>{funnel.funnel[key] ?? 0}</div>
                  <div className="text-[10px]" style={{ color: '#6a7a7e' }}>{label}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs text-right" style={{ color: '#6a7a7e' }}>
              总计 {funnel.total} | 转化率 {funnel.conversionRate}%
            </div>
          </div>
        )}

        {/* QR Codes */}
        <div className="rounded-xl p-5 mb-6" style={{ background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.1)' }}>
          <h2 className="text-sm font-semibold mb-3" style={{ color: '#a8b8ac' }}>推广码</h2>
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
            <button onClick={createQRCode} className="px-4 py-2 rounded-lg text-xs font-medium" style={{ background: '#c9a96e', color: '#080c10' }}>
              生成
            </button>
          </div>
          {qrcodes.length > 0 ? (
            <div className="space-y-2">
              {qrcodes.map(qr => (
                <div key={qr.id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <div>
                    <span className="text-xs font-mono" style={{ color: '#c9a96e' }}>{qr.code}</span>
                    {qr.label && <span className="text-[10px] ml-2" style={{ color: '#6a7a7e' }}>{qr.label}</span>}
                  </div>
                  <div className="text-[10px]" style={{ color: '#6a7a7e' }}>
                    {qr.channel} · {qr.scan_count} 扫描
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs" style={{ color: '#6a7a7e' }}>暂无推广码</p>
          )}
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
                  className="flex items-center justify-between px-3 py-2 rounded-lg no-underline hover:bg-white/5 transition"
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
            <p className="text-xs" style={{ color: '#6a7a7e' }}>暂无客户</p>
          )}
        </div>
      </div>
    </div>
  );
}
