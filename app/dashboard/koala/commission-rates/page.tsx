'use client';

import { useEffect, useState } from 'react';

interface Rate {
  id: string;
  product_type: string;
  commission_rate: number;
  min_rate: number;
  max_rate: number;
}

const PRODUCT_LABELS: Record<string, string> = {
  credit_starter: '积分 - 入门',
  credit_standard: '积分 - 标准',
  credit_premium: '积分 - 高级',
  sub_starter: '订阅 - 入门',
  sub_pro: '订阅 - 专业',
  sub_elite: '订阅 - 精英',
  default: '默认比例',
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

  if (loading) return <p className="text-sm text-slate-400 py-8 text-center">加载中...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">佣金比例配置</h1>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500">
              <th className="text-left px-4 py-2.5 font-medium">产品类型</th>
              <th className="text-center px-4 py-2.5 font-medium">当前比例</th>
              <th className="text-center px-4 py-2.5 font-medium">最低</th>
              <th className="text-center px-4 py-2.5 font-medium">最高</th>
              <th className="text-center px-4 py-2.5 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rates.map(rate => {
              const isEditing = editing === rate.product_type;
              const pct = Math.round(rate.commission_rate * 100);
              const minPct = Math.round(rate.min_rate * 100);
              const maxPct = Math.round(rate.max_rate * 100);
              return (
                <tr key={rate.product_type} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{PRODUCT_LABELS[rate.product_type] || rate.product_type}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{rate.product_type}</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {isEditing ? (
                      <div className="flex items-center justify-center gap-2">
                        <input
                          type="range"
                          min={minPct}
                          max={maxPct}
                          value={editValue}
                          onChange={e => setEditValue(Number(e.target.value))}
                          className="w-20 accent-amber-500"
                        />
                        <span className="text-sm font-bold text-amber-600 w-10">{editValue}%</span>
                      </div>
                    ) : (
                      <span className="text-sm font-bold text-slate-800">{pct}%</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-400">{minPct}%</td>
                  <td className="px-4 py-3 text-center text-slate-400">{maxPct}%</td>
                  <td className="px-4 py-3 text-center">
                    {isEditing ? (
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => saveRate(rate.product_type)}
                          disabled={saving}
                          className="px-2.5 py-1 rounded bg-amber-500 text-white font-medium disabled:opacity-50"
                        >
                          保存
                        </button>
                        <button
                          onClick={() => setEditing(null)}
                          className="px-2.5 py-1 rounded bg-slate-100 text-slate-600"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditing(rate.product_type); setEditValue(pct); }}
                        className="px-2.5 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                      >
                        编辑
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
