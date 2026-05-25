'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase/client';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const FabricPosterEditor = dynamic(() => import('./FabricPosterEditor'), { ssr: false });
const ImagePosterEditor = dynamic(() => import('./ImagePosterEditor'), { ssr: false });
import {
  IconBrandWechat,
  IconBook,
  IconMusic,
  IconFlame,
  IconBulb,
  IconPlayerPlay,
  IconMail,
  IconBrandWhatsapp,
  IconBrandTiktok,
  IconBrandInstagram,
  IconBrandX,
  IconBrandTelegram,
  IconLink,
  IconCopy,
  IconCheck,
  IconDownload,
} from '@tabler/icons-react';
import type { Icon as TablerIcon } from '@tabler/icons-react';

interface ChannelDef {
  value: string;
  label: string;
  icon: TablerIcon;
  color: string;
}

const CHANNELS: ChannelDef[] = [
  { value: 'wechat', label: '微信', icon: IconBrandWechat, color: '#22C55E' },
  { value: 'xiaohongshu', label: '小红书', icon: IconBook, color: '#EF4444' },
  { value: 'douyin', label: '抖音', icon: IconMusic, color: '#1E293B' },
  { value: 'weibo', label: '微博', icon: IconFlame, color: '#FF6900' },
  { value: 'zhihu', label: '知乎', icon: IconBulb, color: '#0066FF' },
  { value: 'bilibili', label: 'Bilibili', icon: IconPlayerPlay, color: '#00A1D6' },
  { value: 'email', label: '邮件', icon: IconMail, color: '#3B82F6' },
  { value: 'whatsapp', label: 'WhatsApp', icon: IconBrandWhatsapp, color: '#25D366' },
  { value: 'tiktok', label: 'TikTok', icon: IconBrandTiktok, color: '#010101' },
  { value: 'instagram', label: 'Instagram', icon: IconBrandInstagram, color: '#E4405F' },
  { value: 'x', label: 'X (Twitter)', icon: IconBrandX, color: '#000000' },
  { value: 'telegram', label: 'Telegram', icon: IconBrandTelegram, color: '#26A5E4' },
  { value: 'other', label: '其他', icon: IconLink, color: '#6B7280' },
];

const TABS = ['推广链接', '推广二维码', '颜色海报', '图片海报'] as const;

export default function PromoCenterPage() {
  const router = useRouter();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState('wechat');
  const [copied, setCopied] = useState<string | false>(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]>('推广链接');
  const [channelStats, setChannelStats] = useState<Record<string, number>>({});

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/login'); return; }
      const [dashRes, statsRes] = await Promise.all([
        fetch('/api/sales/dashboard-stats').then(r => r.ok ? r.json() : null),
        fetch('/api/sales/channel-analytics?days=90').then(r => r.ok ? r.json() : null),
      ]);
      if (dashRes?.agent?.referral_code) {
        setReferralCode(dashRes.agent.referral_code);
      }
      if (statsRes?.channels) {
        const map: Record<string, number> = {};
        for (const ch of statsRes.channels) map[ch.channel] = ch.visits || 0;
        setChannelStats(map);
      }
      setLoading(false);
    });
  }, [router]);

  const promoLink = referralCode ? `https://koalaphd.com/koala/auth?ref=${referralCode}&ch=${selectedChannel}` : '';
  const qrImageUrl = promoLink ? `https://api.qrserver.com/v1/create-qr-code/?size=480x480&format=png&data=${encodeURIComponent(promoLink)}` : '';

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
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

  if (loading) return <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] py-8 text-center">加载中...</p>;
  if (!referralCode) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <p className="text-sm text-[#991B1B] dark:text-[#F87171]">你还不是活跃的销售人员，请联系管理员开通权限。</p>
      <button onClick={() => window.location.reload()} className="text-xs px-4 py-2 rounded-lg bg-[#F3F4F6] dark:bg-[#334155] text-[#374151] dark:text-[#CBD5E1] hover:bg-[#E5E7EB] dark:hover:bg-[#475569] transition">
        重试
      </button>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-light tracking-tight text-[#111827] dark:text-[#F1F5F9]">推广中心</h1>
        <div className="flex items-center gap-2 text-xs text-[#6B7280] dark:text-[#94A3B8]">
          推广码: <span className="font-mono font-bold text-[#F59E0B]">{referralCode}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-[#F3F4F6] dark:bg-[#1E293B] p-1">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-md text-[13px] font-medium transition ${
              tab === t ? 'bg-white dark:bg-[#334155] text-[#111827] dark:text-[#F1F5F9] shadow-sm' : 'text-[#6B7280] dark:text-[#94A3B8] hover:text-[#374151] dark:hover:text-[#CBD5E1]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab 1: Links */}
      {tab === '推广链接' && (
        <div className="space-y-4">
          <div className="rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] divide-y divide-[#F3F4F6] dark:divide-[#334155]">
            {CHANNELS.map(ch => {
              const Icon = ch.icon;
              const isSelected = selectedChannel === ch.value;
              const link = `https://koalaphd.com/koala/auth?ref=${referralCode}&ch=${ch.value}`;
              const copyKey = `link-${ch.value}`;
              return (
                <div
                  key={ch.value}
                  onClick={() => setSelectedChannel(ch.value)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition ${
                    isSelected ? 'bg-[#FFFBEB] dark:bg-[#F59E0B]/10' : 'hover:bg-[#F9FAFB] dark:hover:bg-[#334155]'
                  }`}
                >
                  <div
                    className="size-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: isSelected ? '#F59E0B15' : '#94A3B815' }}
                  >
                    <Icon size={18} strokeWidth={1.5} style={{ color: isSelected ? '#F59E0B' : '#94A3B8' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-[#111827] dark:text-[#F1F5F9]">{ch.label}</div>
                    {channelStats[ch.value] != null && (
                      <div className="text-[10px] text-[#6B7280] dark:text-[#94A3B8]">{channelStats[ch.value]} 次访问</div>
                    )}
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); copyText(link, copyKey); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition ${
                      copied === copyKey ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#F3F4F6] dark:bg-[#334155] text-[#374151] dark:text-[#CBD5E1] hover:bg-[#E5E7EB] dark:hover:bg-[#475569]'
                    }`}
                  >
                    {copied === copyKey ? <IconCheck size={14} /> : <IconCopy size={14} />}
                    {copied === copyKey ? '已复制' : '复制'}
                  </button>
                </div>
              );
            })}
          </div>
          <div className="rounded-xl p-4 bg-[#F9FAFB] dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155]">
            <div className="text-[11px] text-[#374151] dark:text-[#CBD5E1] mb-1.5">当前选中链接预览</div>
            <div className="text-xs font-mono text-[#111827] dark:text-[#F1F5F9] break-all">{promoLink}</div>
          </div>
        </div>
      )}

      {/* Tab 2: QR Code */}
      {tab === '推广二维码' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl p-6 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] flex flex-col items-center gap-4">
            <div className="rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-4 bg-white dark:bg-[#1E293B]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrImageUrl} alt="推广二维码" width={240} height={240} className="rounded" />
            </div>
            <p className="text-[10px] text-gray-400 text-center">📷 请使用手机相机扫码（微信扫码可能无法登录）</p>
            <div className="text-[10px] text-[#374151] dark:text-[#CBD5E1] text-center">
              {CHANNELS.find(c => c.value === selectedChannel)?.label} · {referralCode}
            </div>
            <div className="flex gap-2">
              <button onClick={downloadQR} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-[#111827] text-white hover:opacity-90 transition">
                <IconDownload size={14} />
                下载 PNG
              </button>
              <button onClick={() => copyText(promoLink, 'qr-link')} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition ${copied === 'qr-link' ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#F3F4F6] dark:bg-[#334155] text-[#374151] dark:text-[#CBD5E1] hover:bg-[#E5E7EB] dark:hover:bg-[#475569]'}`}>
                {copied === 'qr-link' ? <IconCheck size={14} /> : <IconCopy size={14} />}
                {copied === 'qr-link' ? '已复制' : '复制链接'}
              </button>
            </div>
          </div>
          <div className="rounded-xl p-5 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155]">
            <h3 className="text-sm font-light tracking-tight text-[#374151] dark:text-[#CBD5E1] mb-3">选择渠道</h3>
            <div className="space-y-1">
              {CHANNELS.map(ch => {
                const Icon = ch.icon;
                return (
                  <button
                    key={ch.value}
                    onClick={() => setSelectedChannel(ch.value)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition ${
                      selectedChannel === ch.value ? 'bg-[#FFFBEB] dark:bg-[#F59E0B]/10 text-[#F59E0B] font-medium' : 'text-[#374151] dark:text-[#CBD5E1] hover:bg-[#F9FAFB] dark:hover:bg-[#334155]'
                    }`}
                  >
                    <Icon size={16} strokeWidth={1.5} style={{ color: selectedChannel === ch.value ? '#F59E0B' : '#94A3B8' }} />
                    <span>{ch.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Color poster */}
      {tab === '颜色海报' && (
        <FabricPosterEditor referralCode={referralCode} channel={selectedChannel} />
      )}

      {/* Tab 4: Image poster */}
      {tab === '图片海报' && (
        <ImagePosterEditor referralCode={referralCode} channel={selectedChannel} />
      )}
    </div>
  );
}
