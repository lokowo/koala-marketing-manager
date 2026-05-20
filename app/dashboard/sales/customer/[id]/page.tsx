'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabase/client';
import { use } from 'react';

const STAGES = ['lead', 'contacted', 'interested', 'trial', 'converted', 'lost'] as const;
const STAGE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  lead:       { label: '线索',   color: '#3B82F6', bg: '#EFF6FF' },
  contacted:  { label: '已联系', color: '#F59E0B', bg: '#FFFBEB' },
  interested: { label: '有意向', color: '#8B5CF6', bg: '#F5F3FF' },
  trial:      { label: '试用中', color: '#06B6D4', bg: '#ECFEFF' },
  converted:  { label: '已转化', color: '#10B981', bg: '#F0FDF4' },
  lost:       { label: '已流失', color: '#9CA3AF', bg: '#F9FAFB' },
  churned:    { label: '流失',   color: '#EF4444', bg: '#FEF2F2' },
};

const CONTACT_METHODS = [
  { key: 'wechat', label: '微信', emoji: '💬' },
  { key: 'phone', label: '电话', emoji: '📞' },
  { key: 'email', label: '邮件', emoji: '✉️' },
  { key: 'meeting', label: '面谈', emoji: '🤝' },
  { key: 'other', label: '其他', emoji: '📝' },
];

const TIMELINE_COLORS: Record<string, string> = {
  customer_update: '#F59E0B',
  customer_contact: '#3B82F6',
  customer_create: '#10B981',
  stage_change: '#8B5CF6',
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
      const res = await fetch(`/api/sales/customers?limit=200`);
      const d = await res.json();
      const refreshed = (d.data ?? []).find((c: { id: string }) => c.id === id);
      if (refreshed) {
        setCustomer(refreshed);
        setStage(refreshed.stage);
        setNote(refreshed.note || '');
      }
    }
  }

  if (!customer) {
    return <p className="text-sm text-[#6B7280] py-8 text-center">加载中...</p>;
  }

  const stageIdx = STAGES.indexOf(customer.stage as typeof STAGES[number]);
  const stageCfg = STAGE_LABELS[customer.stage] || STAGE_LABELS.lead;
  const daysSinceJoin = Math.floor((Date.now() - new Date(customer.created_at).getTime()) / 86400000);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Back button */}
      <button onClick={() => router.back()} className="text-xs text-[#6B7280] hover:text-[#374151] transition">
        ← 返回列表
      </button>

      {/* Customer info card */}
      <div className="rounded-xl p-5 bg-white border border-[#E5E7EB]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-full flex items-center justify-center text-lg font-bold bg-[#F59E0B] text-white">
              {(customer.user_profiles?.display_name || customer.user_profiles?.email || '?')[0].toUpperCase()}
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#111827]">
                {customer.user_profiles?.display_name || '未设置昵称'}
              </h1>
              <p className="text-xs text-[#6B7280]">{customer.user_profiles?.email}</p>
              <p className="text-[10px] text-[#9CA3AF] mt-0.5">加入 {daysSinceJoin} 天前 · {new Date(customer.created_at).toLocaleDateString('zh-CN')}</p>
            </div>
          </div>
          <span
            className="text-[10px] px-2.5 py-1 rounded-full font-medium"
            style={{ background: stageCfg.bg, color: stageCfg.color }}
          >
            {stageCfg.label}
          </span>
        </div>

        {/* Stage progress bar */}
        <div className="mt-4 flex items-center gap-1">
          {STAGES.filter(s => s !== 'lost').map((s, i) => {
            const cfg = STAGE_LABELS[s];
            const active = i <= stageIdx && stageIdx >= 0;
            return (
              <div key={s} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full h-1.5 rounded-full transition-colors"
                  style={{ background: active ? cfg.color : '#E5E7EB' }}
                />
                <span className="text-[9px]" style={{ color: active ? cfg.color : '#9CA3AF' }}>
                  {cfg.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick contact buttons + contact form */}
      <div className="rounded-xl p-5 bg-white border border-[#E5E7EB]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#374151]">记录联系</h2>
          {!showContact && (
            <button
              onClick={() => setShowContact(true)}
              className="text-[10px] px-2.5 py-1 rounded-lg bg-[#F59E0B]/10 text-[#F59E0B] font-medium"
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
                  className={`px-3 py-1.5 rounded-lg text-xs transition border ${
                    contactMethod === m.key
                      ? 'bg-[#FEF3C7] border-[#F59E0B]/30 text-[#92400E]'
                      : 'bg-white border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]'
                  }`}
                >
                  {m.emoji} {m.label}
                </button>
              ))}
            </div>
            <textarea
              placeholder="联系内容摘要..."
              value={contactSummary}
              onChange={e => setContactSummary(e.target.value)}
              rows={2}
              className="w-full rounded-lg px-3 py-2 text-xs focus:outline-none resize-none bg-[#F9FAFB] border border-[#E5E7EB] text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#F59E0B]"
            />
            <input
              placeholder="结果（如：已添加微信、已约定下次沟通）"
              value={contactOutcome}
              onChange={e => setContactOutcome(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-xs focus:outline-none bg-[#F9FAFB] border border-[#E5E7EB] text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#F59E0B]"
            />
            <div className="flex gap-2">
              <button
                onClick={handleLogContact}
                disabled={logging || !contactSummary.trim()}
                className="flex-1 py-2 rounded-lg text-xs font-medium disabled:opacity-50 bg-[#111827] text-white hover:opacity-90 transition"
              >
                {logging ? '记录中...' : '保存联系记录'}
              </button>
              <button
                onClick={() => setShowContact(false)}
                className="px-4 py-2 rounded-lg text-xs text-[#6B7280] border border-[#E5E7EB] hover:bg-[#F9FAFB]"
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
                className="flex-1 py-2.5 rounded-lg text-center bg-[#F9FAFB] border border-[#E5E7EB] hover:bg-[#FEF3C7] hover:border-[#F59E0B]/30 transition"
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
          {STAGES.map(s => {
            const cfg = STAGE_LABELS[s];
            const active = stage === s;
            return (
              <button
                key={s}
                onClick={() => setStage(s)}
                className="px-3 py-1.5 rounded-lg text-xs transition border"
                style={{
                  background: active ? cfg.bg : 'transparent',
                  color: active ? cfg.color : '#6B7280',
                  borderColor: active ? cfg.color + '40' : '#E5E7EB',
                }}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>

        <label className="block text-xs font-medium mb-2 text-[#374151]">备注</label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={3}
          className="w-full rounded-lg px-3 py-2 text-xs mb-4 focus:outline-none resize-none bg-[#F9FAFB] border border-[#E5E7EB] text-[#111827] focus:border-[#F59E0B]"
        />

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2.5 rounded-lg text-xs font-medium disabled:opacity-50 bg-[#111827] text-white hover:opacity-90 transition"
        >
          {saving ? '保存中...' : '保存更改'}
        </button>
      </div>

      {/* Timeline */}
      <div className="rounded-xl p-5 bg-white border border-[#E5E7EB]">
        <h2 className="text-sm font-semibold mb-4 text-[#374151]">行为轨迹</h2>
        {timeline.length > 0 ? (
          <div className="relative pl-5">
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[#E5E7EB]" />
            {timeline.map((item, idx) => {
              const dotColor = TIMELINE_COLORS[item.action] || '#9CA3AF';
              const isLast = idx === timeline.length - 1;
              return (
                <div key={item.id} className={`relative ${isLast ? '' : 'pb-4'}`}>
                  <div
                    className="absolute -left-[13px] top-1.5 size-3 rounded-full border-2 border-white"
                    style={{ background: dotColor, boxShadow: `0 0 0 2px ${dotColor}30` }}
                  />
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                        style={{ background: dotColor + '15', color: dotColor }}
                      >
                        {item.action === 'customer_update' ? '跟进' :
                         item.action === 'customer_contact' ? `联系 (${CONTACT_METHODS.find(m => m.key === (item.details?.method as string))?.label || item.details?.method || '其他'})` :
                         item.action === 'customer_create' ? '创建' : item.action}
                      </span>
                      {item.details && (
                        <p className="text-[10px] mt-1 text-[#6B7280] leading-relaxed">
                          {item.action === 'customer_contact' ? (
                            <>
                              {typeof item.details.summary === 'string' && <span>{item.details.summary}</span>}
                              {typeof item.details.outcome === 'string' && (
                                <span className="ml-1.5 text-[#10B981]">→ {item.details.outcome}</span>
                              )}
                            </>
                          ) : (
                            <>
                              {typeof item.details.stage === 'string' && (
                                <span>阶段 → {STAGE_LABELS[item.details.stage]?.label || item.details.stage}</span>
                              )}
                              {typeof item.details.note === 'string' && (
                                <span className="ml-1.5">{item.details.note}</span>
                              )}
                            </>
                          )}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] flex-shrink-0 text-[#9CA3AF]">
                      {new Date(item.created_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs py-4 text-center text-[#6B7280]">暂无行为记录</p>
        )}
      </div>
    </div>
  );
}
