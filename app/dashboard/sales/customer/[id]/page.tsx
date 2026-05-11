'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabase/client';
import { use } from 'react';

const STAGES = ['lead', 'contacted', 'interested', 'trial', 'converted', 'churned'] as const;
const STAGE_LABELS: Record<string, { label: string; color: string }> = {
  lead: { label: '线索', color: '#6B7280' },
  contacted: { label: '已联系', color: '#D4A843' },
  interested: { label: '有意向', color: '#059669' },
  trial: { label: '试用中', color: '#3B82F6' },
  converted: { label: '已转化', color: '#10B981' },
  churned: { label: '流失', color: '#EF4444' },
};

const CONTACT_METHODS = [
  { key: 'wechat', label: '微信', emoji: '💬' },
  { key: 'phone', label: '电话', emoji: '📞' },
  { key: 'email', label: '邮件', emoji: '✉️' },
  { key: 'meeting', label: '面谈', emoji: '🤝' },
  { key: 'other', label: '其他', emoji: '📝' },
];

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
  const [showContact, setShowContact] = useState(false);
  const [contactMethod, setContactMethod] = useState('wechat');
  const [contactSummary, setContactSummary] = useState('');
  const [contactOutcome, setContactOutcome] = useState('');
  const [logging, setLogging] = useState(false);

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

  async function handleLogContact() {
    if (!contactSummary.trim()) return;
    setLogging(true);
    await fetch('/api/sales/contact-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: id,
        method: contactMethod,
        summary: contactSummary,
        outcome: contactOutcome,
      }),
    });
    setLogging(false);
    setShowContact(false);
    setContactSummary('');
    setContactOutcome('');
    if (customer) {
      await loadTimeline(customer.id);
      if (customer.stage === 'lead') setCustomer(prev => prev ? { ...prev, stage: 'contacted' } : null);
    }
  }

  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <p className="text-sm text-[#6B7280]">加载中…</p>
      </div>
    );
  }

  const stageIdx = STAGES.indexOf(customer.stage as typeof STAGES[number]);

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-[#F9FAFB] text-[#111827]">
      <div className="max-w-lg mx-auto space-y-5">
        <button onClick={() => router.back()} className="text-xs text-[#D4A843]">
          ← 返回
        </button>

        {/* Customer header */}
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full flex items-center justify-center text-sm font-bold bg-[#D4A843] text-white">
            {(customer.user_profiles?.display_name || customer.user_profiles?.email || '?')[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#111827]">
              {customer.user_profiles?.display_name || customer.user_profiles?.email || '客户详情'}
            </h1>
            <p className="text-[10px] text-[#6B7280]">
              {customer.user_profiles?.email} · 加入 {new Date(customer.created_at).toLocaleDateString('zh-CN')}
            </p>
          </div>
        </div>

        {/* Stage progress bar */}
        <div className="rounded-xl p-4 bg-white border border-[#E5E7EB]">
          <div className="flex items-center gap-1">
            {STAGES.filter(s => s !== 'churned').map((s, i) => (
              <div key={s} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full h-1.5 rounded-full"
                  style={{ background: i <= stageIdx ? STAGE_LABELS[s].color : '#E5E7EB' }}
                />
                <span className="text-[9px]" style={{ color: i <= stageIdx ? STAGE_LABELS[s].color : '#6B7280' }}>
                  {STAGE_LABELS[s].label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick contact log */}
        <div className="rounded-xl p-5 bg-white border border-[#E5E7EB]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#374151]">记录联系</h2>
            {!showContact && (
              <button
                onClick={() => setShowContact(true)}
                className="text-[10px] px-2.5 py-1 rounded-lg bg-[#D4A843]/10 text-[#D4A843]"
              >
                + 新联系记录
              </button>
            )}
          </div>

          {showContact ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {CONTACT_METHODS.map(m => (
                  <button
                    key={m.key}
                    onClick={() => setContactMethod(m.key)}
                    className="px-3 py-1.5 rounded-lg text-xs transition"
                    style={{
                      background: contactMethod === m.key ? 'rgba(212,168,67,0.1)' : 'transparent',
                      color: contactMethod === m.key ? '#D4A843' : '#6B7280',
                      border: `1px solid ${contactMethod === m.key ? 'rgba(212,168,67,0.3)' : '#E5E7EB'}`,
                    }}
                  >
                    {m.emoji} {m.label}
                  </button>
                ))}
              </div>
              <textarea
                placeholder="联系内容摘要…"
                value={contactSummary}
                onChange={e => setContactSummary(e.target.value)}
                rows={2}
                className="w-full rounded-lg px-3 py-2 text-xs focus:outline-none resize-none bg-[#F9FAFB] border border-[#E5E7EB] text-[#111827] placeholder:text-[#9CA3AF]"
              />
              <input
                placeholder="结果（如：已添加微信、已约定下次沟通）"
                value={contactOutcome}
                onChange={e => setContactOutcome(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-xs focus:outline-none bg-[#F9FAFB] border border-[#E5E7EB] text-[#111827] placeholder:text-[#9CA3AF]"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleLogContact}
                  disabled={logging || !contactSummary.trim()}
                  className="flex-1 py-2 rounded-lg text-xs font-medium disabled:opacity-50 bg-[#D4A843] text-white"
                >
                  {logging ? '记录中…' : '保存联系记录'}
                </button>
                <button
                  onClick={() => setShowContact(false)}
                  className="px-4 py-2 rounded-lg text-xs text-[#6B7280] border border-[#E5E7EB]"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              {CONTACT_METHODS.slice(0, 4).map(m => (
                <button
                  key={m.key}
                  onClick={() => { setContactMethod(m.key); setShowContact(true); }}
                  className="flex-1 py-2.5 rounded-lg text-center bg-[#F9FAFB] border border-[#E5E7EB] hover:bg-[#F3F4F6] transition"
                >
                  <span className="text-base block">{m.emoji}</span>
                  <span className="text-[9px] text-[#6B7280]">{m.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Edit stage + note */}
        <div className="rounded-xl p-5 bg-white border border-[#E5E7EB]">
          <label className="block text-xs font-medium mb-2 text-[#374151]">更新阶段</label>
          <div className="flex flex-wrap gap-2 mb-4">
            {STAGES.map(s => (
              <button
                key={s}
                onClick={() => setStage(s)}
                className="px-3 py-1.5 rounded-lg text-xs transition"
                style={{
                  background: stage === s ? 'rgba(212,168,67,0.1)' : 'transparent',
                  color: stage === s ? '#D4A843' : '#6B7280',
                  border: `1px solid ${stage === s ? 'rgba(212,168,67,0.3)' : '#E5E7EB'}`,
                }}
              >
                {STAGE_LABELS[s].label}
              </button>
            ))}
          </div>

          <label className="block text-xs font-medium mb-2 text-[#374151]">备注</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={3}
            className="w-full rounded-lg px-3 py-2 text-xs mb-4 focus:outline-none resize-none bg-[#F9FAFB] border border-[#E5E7EB] text-[#111827]"
          />

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 rounded-lg text-xs font-medium disabled:opacity-50 bg-[#D4A843] text-white"
          >
            {saving ? '保存中…' : '保存更改'}
          </button>
        </div>

        {/* Behavior Timeline */}
        <div className="rounded-xl p-5 bg-white border border-[#E5E7EB]">
          <h2 className="text-sm font-semibold mb-3 text-[#374151]">行为轨迹</h2>
          {timeline.length > 0 ? (
            <div className="relative pl-4" style={{ borderLeft: '2px solid #E5E7EB' }}>
              {timeline.map(item => (
                <div key={item.id} className="relative pb-4 last:pb-0">
                  <div className="absolute -left-[21px] top-1 size-2.5 rounded-full bg-[#D4A843]" />
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#D4A843]/10 text-[#374151]">
                        {item.action === 'customer_update' ? '跟进' : item.action === 'customer_contact' ? `联系 (${CONTACT_METHODS.find(m => m.key === (item.details?.method as string))?.label || item.details?.method || '其他'})` : item.action}
                      </span>
                      {item.details && (
                        <p className="text-[10px] mt-1 text-[#6B7280]">
                          {item.action === 'customer_contact' ? (
                            <>
                              {typeof item.details.summary === 'string' && <span>{item.details.summary}</span>}
                              {typeof item.details.outcome === 'string' && <span className="ml-2 text-[#059669]">→ {item.details.outcome}</span>}
                            </>
                          ) : (
                            <>
                              {typeof item.details.stage === 'string' && <span>阶段 → {STAGE_LABELS[item.details.stage]?.label || item.details.stage}</span>}
                              {typeof item.details.note === 'string' && <span className="ml-2">{item.details.note}</span>}
                            </>
                          )}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] flex-shrink-0 ml-2 text-[#6B7280]">
                      {new Date(item.created_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs py-4 text-center text-[#6B7280]">暂无行为记录</p>
          )}
        </div>
      </div>
    </div>
  );
}
