'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../../../lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
  IconBrandWechat,
  IconBook,
  IconMusic,
  IconFlame,
  IconBulb,
  IconPlayerPlay,
  IconMail,
  IconBrandWhatsapp,
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
  { value: 'other', label: '其他', icon: IconLink, color: '#6B7280' },
];

const TABS = ['推广链接', '推广二维码', '推广海报'] as const;

const POSTER_TEMPLATES = [
  { id: 'minimal', label: '简约', desc: '白底 · 简洁干净', bg: '#FFFFFF', textColor: '#111827', accent: '#F59E0B' },
  { id: 'academic', label: '学术', desc: '深蓝底 · 专业权威', bg: '#1E293B', textColor: '#FFFFFF', accent: '#F59E0B' },
  { id: 'vibrant', label: '活力', desc: '渐变彩色 · 年轻风', bg: 'linear-gradient(135deg, #F59E0B, #EF4444, #8B5CF6)', textColor: '#FFFFFF', accent: '#FFFFFF' },
];

export default function PromoCenterPage() {
  const router = useRouter();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('wechat');
  const [copied, setCopied] = useState<string | false>(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]>('推广链接');
  const [posterTemplate, setPosterTemplate] = useState('minimal');
  const [posterTagline, setPosterTagline] = useState('用 AI 找到你的理想 PhD 导师');
  const [generatingPoster, setGeneratingPoster] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [channelStats, setChannelStats] = useState<Record<string, number>>({});

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/login'); return; }
      await fetch('/api/admin/me');
      const [agentRes, statsRes] = await Promise.all([
        (supabase as any).from('sales_agents').select('referral_code, name').eq('user_id', user.id).eq('status', 'active').single(),
        fetch('/api/sales/channel-analytics?days=90').then(r => r.ok ? r.json() : null),
      ]);
      if (agentRes.data?.referral_code) {
        setReferralCode(agentRes.data.referral_code);
        setDisplayName(agentRes.data.name || user.email?.split('@')[0] || '');
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

  const generatePoster = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !qrImageUrl) return;
    setGeneratingPoster(true);

    const ctx = canvas.getContext('2d')!;
    const W = 1080, H = 1350;
    canvas.width = W;
    canvas.height = H;

    const tmpl = POSTER_TEMPLATES.find(t => t.id === posterTemplate) || POSTER_TEMPLATES[0];
    const ch = CHANNELS.find(c => c.value === selectedChannel);
    const chLabel = ch?.label || selectedChannel;
    const chColor = ch?.color || '#6B7280';

    if (tmpl.bg.startsWith('linear')) {
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, '#F59E0B');
      grad.addColorStop(0.5, '#EF4444');
      grad.addColorStop(1, '#8B5CF6');
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = tmpl.bg;
    }
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = tmpl.textColor;
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Koala PhD 考拉博士', W / 2, 120);

    ctx.font = '36px sans-serif';
    ctx.fillStyle = tmpl.accent;
    const lines = wrapText(ctx, posterTagline, W - 160);
    lines.forEach((line, i) => ctx.fillText(line, W / 2, 220 + i * 50));

    try {
      const qrImg = await loadImage(qrImageUrl);
      const qrSize = 320;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect((W - qrSize - 40) / 2, 500, qrSize + 40, qrSize + 40, 20);
      ctx.fill();
      ctx.drawImage(qrImg, (W - qrSize) / 2, 520, qrSize, qrSize);
    } catch { /* QR load failed */ }

    ctx.fillStyle = tmpl.textColor;
    ctx.font = '28px sans-serif';
    ctx.globalAlpha = 0.7;
    ctx.fillText(`扫码注册 · ${chLabel}渠道`, W / 2, 920);
    ctx.globalAlpha = 1;

    ctx.font = '24px sans-serif';
    ctx.fillStyle = tmpl.accent;
    ctx.fillText(`推广码: ${referralCode}  ·  ${displayName}`, W / 2, 980);

    // Channel badge — bottom-right corner
    ctx.textAlign = 'right';
    ctx.font = 'bold 22px sans-serif';
    const badgeText = `${chLabel}推广`;
    const badgeW = ctx.measureText(badgeText).width + 48;
    const badgeH = 40;
    const badgeX = W - 60 - badgeW;
    const badgeY = H - 120;
    ctx.fillStyle = chColor;
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 20);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = chColor;
    ctx.textAlign = 'center';
    ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + 28);

    ctx.textAlign = 'center';
    ctx.fillStyle = tmpl.textColor;
    ctx.globalAlpha = 0.4;
    ctx.font = '20px sans-serif';
    ctx.fillText('koalaphd.com', W / 2, H - 60);
    ctx.globalAlpha = 1;

    setGeneratingPoster(false);

    const link = document.createElement('a');
    link.download = `koala-poster-${posterTemplate}-${referralCode}-${selectedChannel}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [qrImageUrl, posterTemplate, posterTagline, referralCode, displayName, selectedChannel]);

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
    <div className="max-w-3xl mx-auto space-y-5">
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
                    style={{ background: ch.color + '15' }}
                  >
                    <Icon size={18} strokeWidth={1.5} style={{ color: ch.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-[#111827] dark:text-[#F1F5F9]">{ch.label}</div>
                    {channelStats[ch.value] != null && (
                      <div className="text-[10px] text-[#9CA3AF] dark:text-[#64748B]">{channelStats[ch.value]} 次访问</div>
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
            <div className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] mb-1.5">当前选中链接预览</div>
            <div className="text-xs font-mono text-[#374151] dark:text-[#CBD5E1] break-all">{promoLink}</div>
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
            <div className="text-[10px] text-[#6B7280] dark:text-[#94A3B8] text-center">
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
            <h3 className="text-sm font-semibold text-[#374151] dark:text-[#CBD5E1] mb-3">选择渠道</h3>
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
                    <Icon size={16} strokeWidth={1.5} style={{ color: selectedChannel === ch.value ? '#F59E0B' : ch.color }} />
                    <span>{ch.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Poster */}
      {tab === '推广海报' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {POSTER_TEMPLATES.map(tmpl => (
              <button
                key={tmpl.id}
                onClick={() => setPosterTemplate(tmpl.id)}
                className={`rounded-xl p-4 text-center transition-all ${
                  posterTemplate === tmpl.id
                    ? 'ring-2 ring-[#F59E0B] bg-white dark:bg-[#1E293B] shadow-sm'
                    : 'bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] hover:border-[#D1D5DB] dark:hover:border-[#475569]'
                }`}
              >
                <div className="w-full h-16 rounded-lg mb-2" style={{ background: tmpl.bg }} />
                <div className="text-sm font-medium text-[#111827] dark:text-[#F1F5F9]">{tmpl.label}</div>
                <div className="text-[10px] text-[#6B7280] dark:text-[#94A3B8]">{tmpl.desc}</div>
              </button>
            ))}
          </div>
          <div className="rounded-xl p-5 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] space-y-3">
            <div>
              <label className="text-xs text-[#6B7280] dark:text-[#94A3B8] block mb-1">自定义标语</label>
              <input
                value={posterTagline}
                onChange={e => setPosterTagline(e.target.value)}
                maxLength={40}
                className="w-full rounded-lg px-3 py-2.5 text-sm bg-[#F9FAFB] dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] text-[#111827] dark:text-[#F1F5F9] focus:outline-none focus:border-[#F59E0B]"
              />
            </div>
            <div>
              <label className="text-xs text-[#6B7280] dark:text-[#94A3B8] block mb-1">推广渠道</label>
              <select
                value={selectedChannel}
                onChange={e => setSelectedChannel(e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 text-sm bg-[#F9FAFB] dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] text-[#111827] dark:text-[#F1F5F9] focus:outline-none"
              >
                {CHANNELS.map(ch => <option key={ch.value} value={ch.value}>{ch.label}</option>)}
              </select>
            </div>
            <button
              onClick={generatePoster}
              disabled={generatingPoster}
              className="w-full py-3 rounded-lg text-sm font-medium bg-[#F59E0B] text-white hover:bg-[#D97706] transition disabled:opacity-50"
            >
              {generatingPoster ? '生成中...' : '生成并下载海报 PNG'}
            </button>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
    </div>
  );
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split('');
  const lines: string[] = [];
  let line = '';
  for (const char of words) {
    const test = line + char;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = char;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
