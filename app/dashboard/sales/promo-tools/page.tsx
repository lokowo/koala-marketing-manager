'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../../lib/supabase/client';
import { useRouter } from 'next/navigation';

const CHANNELS = [
  { value: 'wechat', label: '微信', icon: '📱' },
  { value: 'xiaohongshu', label: '小红书', icon: '📕' },
  { value: 'douyin', label: '抖音', icon: '🎵' },
  { value: 'weibo', label: '微博', icon: '🔥' },
  { value: 'zhihu', label: '知乎', icon: '💡' },
  { value: 'bilibili', label: 'Bilibili', icon: '📺' },
  { value: 'email', label: '邮件', icon: '✉️' },
  { value: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { value: 'other', label: '其他', icon: '🔗' },
];

export default function PromoToolsPage() {
  const router = useRouter();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState('wechat');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/login'); return; }
      const res = await fetch('/api/admin/me');
      if (!res.ok) return;
      const agentsRes = await fetch('/api/sales/dashboard-stats');
      if (agentsRes.status === 403) {
        setLoading(false);
        return;
      }
      const { data: agents } = await (supabase as any)
        .from('sales_agents')
        .select('referral_code')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();
      if (agents?.referral_code) setReferralCode(agents.referral_code);
      setLoading(false);
    });
  }, [router]);

  const promoLink = referralCode
    ? `https://www.koalaphd.com/?ref=${referralCode}&ch=${selectedChannel}`
    : '';

  const qrImageUrl = promoLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=400x400&format=png&data=${encodeURIComponent(promoLink)}`
    : '';

  function copyLink() {
    if (!promoLink) return;
    navigator.clipboard.writeText(promoLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadQR() {
    if (!qrImageUrl) return;
    const a = document.createElement('a');
    a.href = qrImageUrl;
    a.download = `koala-promo-${referralCode}-${selectedChannel}.png`;
    a.target = '_blank';
    a.click();
  }

  if (loading) return <p className="text-sm text-[#6B7280] py-8 text-center">加载中...</p>;
  if (!referralCode) return <p className="text-sm text-[#6B7280] py-8 text-center">你还不是活跃的销售人员</p>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-[#111827]">推广工具</h1>

      {/* Referral code */}
      <div className="rounded-xl p-5 bg-white border border-[#E5E7EB]">
        <div className="text-xs text-[#6B7280] mb-1">我的推广码</div>
        <div className="text-2xl font-bold font-mono text-[#D4A843]">{referralCode}</div>
      </div>

      {/* Channel selector */}
      <div className="rounded-xl p-5 bg-white border border-[#E5E7EB]">
        <h2 className="text-sm font-semibold text-[#374151] mb-3">选择推广渠道</h2>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {CHANNELS.map(ch => (
            <button
              key={ch.value}
              onClick={() => setSelectedChannel(ch.value)}
              className={`rounded-lg px-3 py-2.5 text-xs text-center transition ${
                selectedChannel === ch.value
                  ? 'bg-[#FEF3C7] text-[#92400E] font-medium border border-[#D4A843]/40'
                  : 'bg-[#F9FAFB] text-[#374151] border border-[#E5E7EB] hover:bg-[#F3F4F6]'
              }`}
            >
              <div className="text-lg mb-0.5">{ch.icon}</div>
              {ch.label}
            </button>
          ))}
        </div>
      </div>

      {/* Generated link */}
      <div className="rounded-xl p-5 bg-white border border-[#E5E7EB]">
        <h2 className="text-sm font-semibold text-[#374151] mb-3">推广链接</h2>
        <div className="flex items-center gap-2 mb-3">
          <input
            readOnly
            value={promoLink}
            className="flex-1 rounded-lg px-3 py-2.5 text-xs font-mono bg-[#F9FAFB] border border-[#E5E7EB] text-[#374151] focus:outline-none"
          />
          <button
            onClick={copyLink}
            className={`px-4 py-2.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
              copied ? 'bg-[#10B981] text-white' : 'bg-[#1A1A2E] text-white hover:opacity-90'
            }`}
          >
            {copied ? '已复制 ✓' : '复制链接'}
          </button>
        </div>
      </div>

      {/* QR Code */}
      <div className="rounded-xl p-5 bg-white border border-[#E5E7EB]">
        <h2 className="text-sm font-semibold text-[#374151] mb-3">推广二维码</h2>
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-xl border border-[#E5E7EB] p-3 bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrImageUrl}
              alt="推广二维码"
              width={200}
              height={200}
              className="rounded"
            />
          </div>
          <div className="text-[10px] text-[#6B7280] text-center">
            渠道: {CHANNELS.find(c => c.value === selectedChannel)?.label} · 推广码: {referralCode}
          </div>
          <button
            onClick={downloadQR}
            className="px-6 py-2.5 rounded-lg text-xs font-medium bg-[#D4A843] text-white hover:opacity-90 transition"
          >
            下载二维码 PNG
          </button>
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
