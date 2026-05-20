'use client';

import { useEffect, useState } from 'react';

interface Rate {
  id: string;
  product_type: string;
  commission_rate: number;
  min_rate: number;
  max_rate: number;
}

const PRODUCT_LABELS: Record<string, { name: string; desc: string; color: string; bg: string; price: number; recurring?: boolean }> = {
  credit_starter:  { name: '积分 - 入门', desc: '50 积分包', color: '#3B82F6', bg: '#EFF6FF', price: 4.99 },
  credit_standard: { name: '积分 - 标准', desc: '120 积分包', color: '#8B5CF6', bg: '#F5F3FF', price: 9.99 },
  credit_premium:  { name: '积分 - 高级', desc: '280 积分包', color: '#EC4899', bg: '#FDF2F8', price: 19.99 },
  sub_starter:     { name: '订阅 - 入门', desc: '月度订阅', color: '#10B981', bg: '#F0FDF4', price: 4.99, recurring: true },
  sub_pro:         { name: '订阅 - 专业', desc: '月度订阅', color: '#F59E0B', bg: '#FFFBEB', price: 14.99, recurring: true },
  sub_elite:       { name: '订阅 - 精英', desc: '月度订阅', color: '#EF4444', bg: '#FEF2F2', price: 29.99, recurring: true },
  default:         { name: '默认比例', desc: '兜底规则', color: '#6B7280', bg: '#F9FAFB', price: 0 },
};

export default function CommissionRatesPage() {
  const [rates, setRates] = useState<Rate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/commission-rates').then(r => r.json()).then(d => {
      setRates(d.data || []);
      setLoading(false);
    });
  }, []);

  async function saveRate(productType: string) {
    setSaving(true);
    const res = await fetch('/api/admin/commission-rates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_type: productType, commission_rate: editValue / 100 }),
    });
    if (res.ok) {
      const { data } = await res.json();
      setRates(prev => prev.map(r => r.product_type === productType ? { ...r, ...data } : r));
      setEditing(null);
    } else {
      const err = await res.json();
      alert(err.error || '保存失败');
    }
    setSaving(false);
  }

  if (loading) return <p className="text-sm text-[#6B7280] py-8 text-center">加载中...</p>;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-[#111827]">佣金比例配置</h1>
      <p className="text-xs text-[#6B7280]">调整各产品的分销佣金比例，点击卡片调整滑块即时修改</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rates.map(rate => {
          const cfg = PRODUCT_LABELS[rate.product_type] || PRODUCT_LABELS.default;
          const isEditing = editing === rate.product_type;
          const pct = Math.round(rate.commission_rate * 100);
          const minPct = Math.round(rate.min_rate * 100);
          const maxPct = Math.round(rate.max_rate * 100);

          return (
            <div
              key={rate.product_type}
              className="rounded-xl p-5 border border-[#E5E7EB] bg-white hover:shadow-sm transition"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#111827]">{cfg.name}</span>
                    {cfg.recurring && <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">🔄 订阅</span>}
                  </div>
                  {cfg.price > 0 && <div className="text-xs text-[#6B7280] mt-0.5">${cfg.price.toFixed(2)}</div>}
                </div>
                <div
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{ background: cfg.bg, color: cfg.color }}
                >
                  {cfg.desc}
                </div>
              </div>

              <div className="text-center py-3">
                <div className="text-3xl font-bold" style={{ color: cfg.color }}>
                  {isEditing ? editValue : pct}%
                </div>
                {cfg.price > 0 && (
                  <div className="text-[11px] text-[#6B7280] mt-1">
                    ${cfg.price.toFixed(2)} × {isEditing ? editValue : pct}% = <strong>${(cfg.price * (isEditing ? editValue : pct) / 100).toFixed(2)}</strong>
                  </div>
                )}
                <div className="text-[10px] text-[#9CA3AF] mt-0.5">
                  范围 {minPct}% — {maxPct}%
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-3">
                  <input
                    type="range"
                    min={minPct}
                    max={maxPct}
                    value={editValue}
                    onChange={e => setEditValue(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, ${cfg.color} ${((editValue - minPct) / (maxPct - minPct || 1)) * 100}%, #E5E7EB ${((editValue - minPct) / (maxPct - minPct || 1)) * 100}%)`,
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveRate(rate.product_type)}
                      disabled={saving}
                      className="flex-1 py-2 rounded-lg text-xs font-medium bg-[#111827] text-white disabled:opacity-50 hover:opacity-90 transition"
                    >
                      {saving ? '保存中...' : '保存'}
                    </button>
                    <button
                      onClick={() => setEditing(null)}
                      className="px-4 py-2 rounded-lg text-xs text-[#6B7280] border border-[#E5E7EB] hover:bg-[#F9FAFB]"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setEditing(rate.product_type); setEditValue(pct); }}
                  className="w-full py-2 rounded-lg text-xs font-medium bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB] transition"
                >
                  调整比例
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
