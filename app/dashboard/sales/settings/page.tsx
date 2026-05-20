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
        .select('display_name, referral_code, phone, payment_method, payment_account, payment_name, notify_registration, notify_commission, notify_weekly_report')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();
      if (agent) {
        setSettings({
          display_name: agent.display_name || '',
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

  if (loading) return <p className="text-sm text-[#6B7280] py-8 text-center">加载中...</p>;

  const INPUT_CLS = 'w-full rounded-lg px-3 py-2.5 text-sm bg-[#F9FAFB] border border-[#E5E7EB] text-[#111827] focus:outline-none focus:border-[#F59E0B] disabled:text-[#9CA3AF] disabled:bg-[#F3F4F6]';

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <h1 className="text-xl font-bold text-[#111827]">个人设置</h1>

      {toast && (
        <div className={`rounded-lg px-4 py-2.5 text-sm ${toast.startsWith('✅') ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEE2E2] text-[#991B1B]'}`}>
          {toast}
        </div>
      )}

      {/* Personal Info */}
      <div className="rounded-xl p-5 bg-white border border-[#E5E7EB]">
        <h2 className="text-sm font-semibold text-[#374151] mb-4">个人信息</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-[#6B7280] block mb-1">姓名</label>
            <input value={settings.display_name} disabled className={INPUT_CLS} />
          </div>
          <div>
            <label className="text-xs text-[#6B7280] block mb-1">邮箱</label>
            <input value={settings.email} disabled className={INPUT_CLS} />
          </div>
          <div>
            <label className="text-xs text-[#6B7280] block mb-1">手机号</label>
            <input
              value={settings.phone}
              onChange={e => update('phone', e.target.value)}
              placeholder="输入手机号"
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="text-xs text-[#6B7280] block mb-1">推广码</label>
            <input value={settings.referral_code} disabled className={`${INPUT_CLS} font-mono font-bold text-[#F59E0B]`} />
          </div>
        </div>
      </div>

      {/* Payment Info */}
      <div className="rounded-xl p-5 bg-white border border-[#E5E7EB]">
        <h2 className="text-sm font-semibold text-[#374151] mb-4">收款信息</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-[#6B7280] block mb-1">收款方式</label>
            <select
              value={settings.payment_method}
              onChange={e => update('payment_method', e.target.value)}
              className={INPUT_CLS}
            >
              {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-[#6B7280] block mb-1">收款账号</label>
            <input
              value={settings.payment_account}
              onChange={e => update('payment_account', e.target.value)}
              placeholder="银行卡号 / PayPal 邮箱 / 微信号"
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="text-xs text-[#6B7280] block mb-1">账户名</label>
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
      <div className="rounded-xl p-5 bg-white border border-[#E5E7EB]">
        <h2 className="text-sm font-semibold text-[#374151] mb-4">通知设置</h2>
        <div className="space-y-3">
          {([
            { key: 'notify_registration' as const, label: '新客户注册通知', desc: '有用户通过你的推广链接注册时通知' },
            { key: 'notify_commission' as const, label: '佣金确认通知', desc: '佣金状态变更时通知' },
            { key: 'notify_weekly_report' as const, label: '周报邮件', desc: '每周一发送推广业绩总结' },
          ]).map(item => (
            <div key={item.key} className="flex items-center justify-between py-2">
              <div>
                <div className="text-sm text-[#111827]">{item.label}</div>
                <div className="text-[11px] text-[#6B7280]">{item.desc}</div>
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

      <button
        onClick={save}
        disabled={saving}
        className="w-full py-3 rounded-xl text-sm font-medium bg-[#111827] text-white hover:opacity-90 transition disabled:opacity-50"
      >
        {saving ? '保存中...' : '保存设置'}
      </button>
    </div>
  );
}
