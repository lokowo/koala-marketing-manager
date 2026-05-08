'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabase/client';
import { use } from 'react';

const STAGES = ['lead', 'contacted', 'interested', 'trial', 'converted', 'churned'] as const;
const STAGE_LABELS: Record<string, { label: string; color: string }> = {
  lead: { label: '线索', color: '#6a7a7e' },
  contacted: { label: '已联系', color: '#c9a96e' },
  interested: { label: '有意向', color: '#5a8060' },
  trial: { label: '试用中', color: '#4a90d9' },
  converted: { label: '已转化', color: '#2ecc71' },
  churned: { label: '流失', color: '#b06040' },
};

interface TimelineItem {
  id: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

export default function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [customer, setCustomer] = useState<{
    id: string; stage: string; note: string | null; created_at: string;
    customer_user_id: string;
    user_profiles?: { display_name: string; email: string };
  } | null>(null);
  const [stage, setStage] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/login'); return; }
      fetch(`/api/sales/customers?limit=200`).then(r => r.json()).then(d => {
        const found = (d.data ?? []).find((c: { id: string }) => c.id === id);
        if (found) {
          setCustomer(found);
          setStage(found.stage);
          setNote(found.note || '');
          loadTimeline(found.id);
        }
      });
    });
  }, [id, router]);

  async function loadTimeline(customerId: string) {
    const res = await fetch(`/api/sales/customer-timeline?customerId=${customerId}`);
    if (res.ok) {
      const data = await res.json();
      setTimeline(data.timeline ?? []);
    }
  }

  async function handleSave() {
    setSaving(true);
    await fetch('/api/sales/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: id, stage, note }),
    });
    setSaving(false);
    if (customer) await loadTimeline(customer.id);
    setCustomer(prev => prev ? { ...prev, stage, note } : null);
  }

  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#080c10' }}>
        <p className="text-sm" style={{ color: '#6a7a7e' }}>加载中…</p>
      </div>
    );
  }

  const stageIdx = STAGES.indexOf(customer.stage as typeof STAGES[number]);

  return (
    <div className="min-h-screen p-4 sm:p-6" style={{ background: '#080c10', color: '#e8e4dc' }}>
      <div className="max-w-lg mx-auto space-y-5">
        <button onClick={() => router.back()} className="text-xs" style={{ color: '#c9a96e' }}>
          ← 返回
        </button>

        {/* Customer header */}
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: '#c9a96e', color: '#080c10' }}>
            {(customer.user_profiles?.display_name || customer.user_profiles?.email || '?')[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: '#e8e4dc' }}>
              {customer.user_profiles?.display_name || customer.user_profiles?.email || '客户详情'}
            </h1>
            <p className="text-[10px]" style={{ color: '#6a7a7e' }}>
              {customer.user_profiles?.email} · 加入 {new Date(customer.created_at).toLocaleDateString('zh-CN')}
            </p>
          </div>
        </div>

        {/* Stage progress bar */}
        <div className="rounded-xl p-4" style={{ background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.1)' }}>
          <div className="flex items-center gap-1">
            {STAGES.filter(s => s !== 'churned').map((s, i) => (
              <div key={s} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full h-1.5 rounded-full"
                  style={{ background: i <= stageIdx ? STAGE_LABELS[s].color : 'rgba(255,255,255,0.05)' }}
                />
                <span className="text-[9px]" style={{ color: i <= stageIdx ? STAGE_LABELS[s].color : '#6a7a7e' }}>
                  {STAGE_LABELS[s].label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Edit stage + note */}
        <div className="rounded-xl p-5" style={{ background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.1)' }}>
          <label className="block text-xs font-medium mb-2" style={{ color: '#a8b8ac' }}>更新阶段</label>
          <div className="flex flex-wrap gap-2 mb-4">
            {STAGES.map(s => (
              <button
                key={s}
                onClick={() => setStage(s)}
                className="px-3 py-1.5 rounded-lg text-xs transition"
                style={{
                  background: stage === s ? 'rgba(201,169,110,0.15)' : 'transparent',
                  color: stage === s ? '#c9a96e' : '#6a7a7e',
                  border: `1px solid ${stage === s ? 'rgba(201,169,110,0.3)' : 'rgba(201,169,110,0.08)'}`,
                }}
              >
                {STAGE_LABELS[s].label}
              </button>
            ))}
          </div>

          <label className="block text-xs font-medium mb-2" style={{ color: '#a8b8ac' }}>备注</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={3}
            className="w-full rounded-lg px-3 py-2 text-xs mb-4 focus:outline-none resize-none"
            style={{ background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.1)', color: '#e8e4dc' }}
          />

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 rounded-lg text-xs font-medium disabled:opacity-50"
            style={{ background: '#c9a96e', color: '#080c10' }}
          >
            {saving ? '保存中…' : '保存更改'}
          </button>
        </div>

        {/* Behavior Timeline */}
        <div className="rounded-xl p-5" style={{ background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.1)' }}>
          <h2 className="text-sm font-semibold mb-3" style={{ color: '#a8b8ac' }}>行为轨迹</h2>
          {timeline.length > 0 ? (
            <div className="relative pl-4" style={{ borderLeft: '2px solid rgba(201,169,110,0.15)' }}>
              {timeline.map(item => (
                <div key={item.id} className="relative pb-4 last:pb-0">
                  <div className="absolute -left-[21px] top-1 size-2.5 rounded-full" style={{ background: '#c9a96e' }} />
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(201,169,110,0.1)', color: '#a8b8ac' }}>
                        {item.action === 'customer_update' ? '跟进' : item.action}
                      </span>
                      {item.details && (
                        <p className="text-[10px] mt-1" style={{ color: '#6a7a7e' }}>
                          {typeof item.details.stage === 'string' && <span>阶段 → {STAGE_LABELS[item.details.stage]?.label || item.details.stage}</span>}
                          {typeof item.details.note === 'string' && <span className="ml-2">{item.details.note}</span>}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] flex-shrink-0 ml-2" style={{ color: '#6a7a7e' }}>
                      {new Date(item.created_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs py-4 text-center" style={{ color: '#6a7a7e' }}>暂无行为记录</p>
          )}
        </div>
      </div>
    </div>
  );
}
