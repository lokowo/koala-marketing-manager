'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabase/client';
import { use } from 'react';

const STAGES = ['lead', 'contacted', 'interested', 'trial', 'converted', 'churned'] as const;
const STAGE_LABELS: Record<string, string> = {
  lead: '线索', contacted: '已联系', interested: '有意向',
  trial: '试用中', converted: '已转化', churned: '流失',
};

export default function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [customer, setCustomer] = useState<{ id: string; stage: string; note: string | null; user_profiles?: { display_name: string; email: string } } | null>(null);
  const [stage, setStage] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/login'); return; }
      fetch(`/api/sales/customers?limit=200`).then(r => r.json()).then(d => {
        const found = (d.data ?? []).find((c: { id: string }) => c.id === id);
        if (found) {
          setCustomer(found);
          setStage(found.stage);
          setNote(found.note || '');
        }
      });
    });
  }, [id, router]);

  async function handleSave() {
    setSaving(true);
    await fetch('/api/sales/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: id, stage, note }),
    });
    setSaving(false);
    router.back();
  }

  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#080c10' }}>
        <p className="text-sm" style={{ color: '#6a7a7e' }}>加载中…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{ background: '#080c10', color: '#e8e4dc' }}>
      <div className="max-w-lg mx-auto">
        <button onClick={() => router.back()} className="text-xs mb-4" style={{ color: '#c9a96e' }}>
          ← 返回
        </button>

        <h1 className="text-lg font-bold mb-1" style={{ color: '#e8e4dc' }}>
          {customer.user_profiles?.display_name || customer.user_profiles?.email || '客户详情'}
        </h1>
        <p className="text-xs mb-6" style={{ color: '#6a7a7e' }}>{customer.user_profiles?.email}</p>

        <div className="rounded-xl p-5" style={{ background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.1)' }}>
          <label className="block text-xs font-medium mb-2" style={{ color: '#a8b8ac' }}>阶段</label>
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
                {STAGE_LABELS[s]}
              </button>
            ))}
          </div>

          <label className="block text-xs font-medium mb-2" style={{ color: '#a8b8ac' }}>备注</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={4}
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
      </div>
    </div>
  );
}
