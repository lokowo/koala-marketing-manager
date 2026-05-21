'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase/client';
import { useRouter } from 'next/navigation';

interface AgentSettings {
  display_name: string;
  email: string;
  referral_code: string;
  phone: string;
  payment_method: string;
  payment_account: string;
  payment_name: string;
  notify_registration: boolean;
  notify_commission: boolean;
  notify_weekly_report: boolean;
}

interface TierProgress {
  current_tier: string;
  total_commission: number;
  next_tier: string | null;
  next_min_commission: number;
}

const TIER_COLORS: Record<string, { label: string; color: string; bg: string }> = {
  standard: { label: 'Standard', color: '#64748B', bg: '#64748B15' },
  senior: { label: 'Senior', color: '#F59E0B', bg: '#F59E0B15' },
  partner: { label: 'Partner', color: '#8B5CF6', bg: '#8B5CF615' },
};

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: '银行转账' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'wechat_pay', label: '微信支付' },
];

export default function SalesSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [tierProgress, setTierProgress] = useState<TierProgress | null>(null);
  const [settings, setSettings] = useState<AgentSettings>({
    display_name: '', email: '', referral_code: '', phone: '',
    payment_method: 'bank_transfer', payment_account: '', payment_name: '',
    notify_registration: true, notify_commission: true, notify_weekly_report: true,
  });

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/login'); return; }
      const { data: agent } = await (supabase as any)
        .from('sales_agents')
        .select('name, referral_code, phone, payment_method, payment_account, payment_name, notify_registration, notify_commission, notify_weekly_report')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();
      if (agent) {
        setSettings({
          display_name: agent.name || '',
          email: user.email || '',
          referral_code: agent.referral_code || '',
          phone: agent.phone || '',
          payment_method: agent.payment_method || 'bank_transfer',
          payment_account: agent.payment_account || '',
          payment_name: agent.payment_name || '',
          notify_registration: agent.notify_registration ?? true,
          notify_commission: agent.notify_commission ?? true,
          notify_weekly_report: agent.notify_weekly_report ?? true,
        });
      }
      fetch('/api/sales/tier-progress').then(r => r.ok ? r.json() : null).then(d => {
        if (d) setTierProgress(d);
      }).catch(() => {});
      setLoading(false);
    });
  }, [router]);

  async function save() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await (supabase as any)
      .from('sales_agents')
      .update({
        phone: settings.phone || null,
        payment_method: settings.payment_method,
        payment_account: settings.payment_account || null,
        payment_name: settings.payment_name || null,
        notify_registration: settings.notify_registration,
        notify_commission: settings.notify_commission,
        notify_weekly_report: settings.notify_weekly_report,
      })
      .eq('user_id', user.id)
      .eq('status', 'active');
    setSaving(false);
    if (error) {
      setToast('保存失败: ' + error.message);
    } else {
      setToast('✅ 设置已保存');
    }
    setTimeout(() => setToast(''), 3000);
  }

  function update(key: keyof AgentSettings, val: string | boolean) {
    setSettings(prev => ({ ...prev, [key]: val }));
  }

  if (loading) return <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] py-8 text-center">加载中...</p>;

  const INPUT_CLS = 'w-full rounded-lg px-3 py-2.5 text-sm bg-[#F9FAFB] dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] text-[#111827] dark:text-[#F1F5F9] focus:outline-none focus:border-[#F59E0B] disabled:text-[#9CA3AF] dark:disabled:text-[#64748B] disabled:bg-[#F3F4F6] dark:disabled:bg-[#334155]';

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <h1 className="text-xl font-light tracking-tight text-[#111827] dark:text-[#F1F5F9]">个人设置</h1>

      {toast && (
        <div className={`rounded-lg px-4 py-2.5 text-sm ${toast.startsWith('✅') ? 'bg-[#DCFCE7] dark:bg-[#22C55E]/20 text-[#166534]' : 'bg-[#FEE2E2] dark:bg-[#EF4444]/20 text-[#991B1B]'}`}>
          {toast}
        </div>
      )}

      {/* Personal Info */}
      <div className="rounded-xl p-5 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155]">
        <h2 className="text-sm font-light tracking-tight text-[#374151] dark:text-[#CBD5E1] mb-4">个人信息</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-[#6B7280] dark:text-[#94A3B8] block mb-1">姓名</label>
            <input value={settings.display_name} disabled className={INPUT_CLS} />
          </div>
          <div>
            <label className="text-xs text-[#6B7280] dark:text-[#94A3B8] block mb-1">邮箱</label>
            <input value={settings.email} disabled className={INPUT_CLS} />
          </div>
          <div>
            <label className="text-xs text-[#6B7280] dark:text-[#94A3B8] block mb-1">手机号</label>
            <input
              value={settings.phone}
              onChange={e => update('phone', e.target.value)}
              placeholder="输入手机号"
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="text-xs text-[#6B7280] dark:text-[#94A3B8] block mb-1">推广码</label>
            <input value={settings.referral_code} disabled className={`${INPUT_CLS} font-mono font-bold text-[#F59E0B]`} />
          </div>
        </div>
      </div>

      {/* Payment Info */}
      <div className="rounded-xl p-5 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155]">
        <h2 className="text-sm font-light tracking-tight text-[#374151] dark:text-[#CBD5E1] mb-4">收款信息</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-[#6B7280] dark:text-[#94A3B8] block mb-1">收款方式</label>
            <select
              value={settings.payment_method}
              onChange={e => update('payment_method', e.target.value)}
              className={INPUT_CLS}
            >
              {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-[#6B7280] dark:text-[#94A3B8] block mb-1">收款账号</label>
            <input
              value={settings.payment_account}
              onChange={e => update('payment_account', e.target.value)}
              placeholder="银行卡号 / PayPal 邮箱 / 微信号"
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="text-xs text-[#6B7280] dark:text-[#94A3B8] block mb-1">账户名</label>
            <input
              value={settings.payment_name}
              onChange={e => update('payment_name', e.target.value)}
              placeholder="收款人姓名"
              className={INPUT_CLS}
            />
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="rounded-xl p-5 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155]">
        <h2 className="text-sm font-light tracking-tight text-[#374151] dark:text-[#CBD5E1] mb-4">通知设置</h2>
        <div className="space-y-3">
          {([
            { key: 'notify_registration' as const, label: '新客户注册通知', desc: '有用户通过你的推广链接注册时通知' },
            { key: 'notify_commission' as const, label: '佣金确认通知', desc: '佣金状态变更时通知' },
            { key: 'notify_weekly_report' as const, label: '周报邮件', desc: '每周一发送推广业绩总结' },
          ]).map(item => (
            <div key={item.key} className="flex items-center justify-between py-2">
              <div>
                <div className="text-sm text-[#111827] dark:text-[#F1F5F9]">{item.label}</div>
                <div className="text-[11px] text-[#6B7280] dark:text-[#94A3B8]">{item.desc}</div>
              </div>
              <button
                onClick={() => update(item.key, !settings[item.key])}
                className={`relative w-10 h-6 rounded-full transition-colors ${settings[item.key] ? 'bg-[#22C55E]' : 'bg-[#D1D5DB]'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform shadow ${settings[item.key] ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Tier Progress */}
      {tierProgress && (
        <div className="rounded-xl p-5 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155]">
          <h2 className="text-sm font-light tracking-tight text-[#374151] dark:text-[#CBD5E1] mb-4">等级信息</h2>
          <div className="flex items-center gap-3 mb-4">
            <span
              className="text-sm font-medium px-3 py-1 rounded"
              style={{ background: TIER_COLORS[tierProgress.current_tier]?.bg, color: TIER_COLORS[tierProgress.current_tier]?.color }}
            >
              {TIER_COLORS[tierProgress.current_tier]?.label || tierProgress.current_tier}
            </span>
            <span className="text-xs text-[#6B7280] dark:text-[#94A3B8]">当前等级</span>
          </div>
          <div className="mb-4">
            <div className="rounded-lg p-3 bg-[#F9FAFB] dark:bg-[#0F172A]">
              <div className="text-[10px] text-[#6B7280] dark:text-[#94A3B8]">累计佣金</div>
              <div className="text-lg font-medium text-[#111827] dark:text-[#F1F5F9]">${tierProgress.total_commission.toFixed(2)}</div>
            </div>
          </div>
          {tierProgress.next_tier && (
            <div className="rounded-lg p-3 border border-dashed border-[#E5E7EB] dark:border-[#334155]">
              <div className="text-xs text-[#6B7280] dark:text-[#94A3B8] mb-1">
                距离 <span style={{ color: TIER_COLORS[tierProgress.next_tier]?.color }} className="font-medium">{TIER_COLORS[tierProgress.next_tier]?.label}</span> 还需
              </div>
              <div className="text-xs text-[#374151] dark:text-[#CBD5E1]">
                {tierProgress.next_min_commission > tierProgress.total_commission ? (
                  <span>${(tierProgress.next_min_commission - tierProgress.total_commission).toFixed(2)} 佣金</span>
                ) : (
                  <span className="text-green-600">已满足条件，等待系统更新</span>
                )}
              </div>
            </div>
          )}
          {!tierProgress.next_tier && (
            <div className="text-xs text-[#6B7280] dark:text-[#94A3B8]">已达到最高等级</div>
          )}
        </div>
      )}

      <button
        onClick={save}
        disabled={saving}
        className="w-full py-3 rounded-xl text-sm font-medium bg-[#111827] dark:bg-[#F1F5F9] text-white dark:text-[#0F172A] hover:opacity-90 transition disabled:opacity-50"
      >
        {saving ? '保存中...' : '保存设置'}
      </button>
    </div>
  );
}
