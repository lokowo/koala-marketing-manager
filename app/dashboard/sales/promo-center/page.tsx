'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../../../lib/supabase/client';
import { useRouter } from 'next/navigation';

const CHANNELS = [
  { value: 'wechat', label: '微信', icon: '📱', color: '#22C55E' },
  { value: 'xiaohongshu', label: '小红书', icon: '📕', color: '#EF4444' },
  { value: 'douyin', label: '抖音', icon: '🎵', color: '#1E293B' },
  { value: 'weibo', label: '微博', icon: '🔥', color: '#EF4444' },
  { value: 'zhihu', label: '知乎', icon: '💡', color: '#0066FF' },
  { value: 'bilibili', label: 'Bilibili', icon: '📺', color: '#00A1D6' },
  { value: 'email', label: '邮件', icon: '✉️', color: '#3B82F6' },
  { value: 'whatsapp', label: 'WhatsApp', icon: '💬', color: '#22C55E' },
  { value: 'other', label: '其他', icon: '🔗', color: '#6B7280' },
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
        (supabase as any).from('sales_agents').select('referral_code, display_name').eq('user_id', user.id).eq('status', 'active').single(),
        fetch('/api/sales/channel-analytics?days=90').then(r => r.ok ? r.json() : null),
      ]);
      if (agentRes.data?.referral_code) {
        setReferralCode(agentRes.data.referral_code);
        setDisplayName(agentRes.data.display_name || user.email?.split('@')[0] || '');
      }
      if (statsRes?.channels) {
        const map: Record<string, number> = {};
        for (const ch of statsRes.channels) map[ch.channel] = ch.visits || 0;
        setChannelStats(map);
      }
      setLoading(false);
    });
  }, [router]);

  const promoLink = referralCode ? `https://koalaphd.com/?ref=${referralCode}&ch=${selectedChannel}` : '';
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
    } catch { /* QR load failed, skip */ }

    ctx.fillStyle = tmpl.textColor;
    ctx.font = '28px sans-serif';
    ctx.globalAlpha = 0.7;
    ctx.fillText('扫码开始你的 PhD 申请之旅', W / 2, 920);
    ctx.globalAlpha = 1;

    ctx.font = '24px sans-serif';
    ctx.fillStyle = tmpl.accent;
    ctx.fillText(`推广码: ${referralCode}  ·  ${displayName}`, W / 2, 980);

    ctx.fillStyle = tmpl.textColor;
    ctx.globalAlpha = 0.4;
    ctx.font = '20px sans-serif';
    ctx.fillText('koalaphd.com', W / 2, H - 60);
    ctx.globalAlpha = 1;

    setGeneratingPoster(false);

    const link = document.createElement('a');
    link.download = `koala-poster-${posterTemplate}-${referralCode}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [qrImageUrl, posterTemplate, posterTagline, referralCode, displayName]);

  if (loading) return <p className="text-sm text-[#6B7280] py-8 text-center">加载中...</p>;
  if (!referralCode) return <p className="text-sm text-[#6B7280] py-8 text-center">你还不是活跃的销售人员</p>;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#111827]">推广中心</h1>
        <div className="flex items-center gap-2 text-xs text-[#6B7280]">
          推广码: <span className="font-mono font-bold text-[#F59E0B]">{referralCode}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-[#F3F4F6] p-1">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-md text-[13px] font-medium transition ${
              tab === t ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6B7280] hover:text-[#374151]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab 1: Links */}
      {tab === '推广链接' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
            {CHANNELS.map(ch => (
              <button
                key={ch.value}
                onClick={() => setSelectedChannel(ch.value)}
                className={`rounded-xl p-3 text-xs text-center transition-all ${
                  selectedChannel === ch.value
                    ? 'bg-white border-2 shadow-sm font-medium'
                    : 'bg-white border border-[#E5E7EB] hover:border-[#D1D5DB]'
                }`}
                style={selectedChannel === ch.value ? { borderColor: ch.color, color: ch.color } : {}}
              >
                <div className="text-xl mb-1">{ch.icon}</div>
                <div className={selectedChannel === ch.value ? '' : 'text-[#374151]'}>{ch.label}</div>
                {channelStats[ch.value] != null && (
                  <div className="text-[10px] mt-0.5 text-[#9CA3AF]">{channelStats[ch.value]} 点击</div>
                )}
              </button>
            ))}
          </div>
          <div className="rounded-xl p-4 bg-white border border-[#E5E7EB]">
            <div className="text-[11px] text-[#6B7280] mb-2">当前渠道推广链接</div>
            <div className="flex items-center gap-2">
              <input readOnly value={promoLink} className="flex-1 rounded-lg px-3 py-2.5 text-xs font-mono bg-[#F9FAFB] border border-[#E5E7EB] text-[#374151] focus:outline-none" />
              <button
                onClick={() => copyText(promoLink, 'link')}
                className={`px-4 py-2.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                  copied === 'link' ? 'bg-[#22C55E] text-white' : 'bg-[#111827] text-white hover:opacity-90'
                }`}
              >
                {copied === 'link' ? '已复制 ✓' : '复制链接'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: QR Code */}
      {tab === '推广二维码' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl p-6 bg-white border border-[#E5E7EB] flex flex-col items-center gap-4">
            <div className="rounded-xl border border-[#E5E7EB] p-4 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrImageUrl} alt="推广二维码" width={240} height={240} className="rounded" />
            </div>
            <div className="text-[10px] text-[#6B7280] text-center">
              {CHANNELS.find(c => c.value === selectedChannel)?.label} · {referralCode}
            </div>
            <div className="flex gap-2">
              <button onClick={downloadQR} className="px-4 py-2 rounded-lg text-xs font-medium bg-[#111827] text-white hover:opacity-90 transition">
                下载 PNG
              </button>
              <button onClick={() => copyText(promoLink, 'qr-link')} className={`px-4 py-2 rounded-lg text-xs font-medium transition ${copied === 'qr-link' ? 'bg-[#22C55E] text-white' : 'bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]'}`}>
                {copied === 'qr-link' ? '已复制 ✓' : '复制链接'}
              </button>
            </div>
          </div>
          <div className="rounded-xl p-5 bg-white border border-[#E5E7EB]">
            <h3 className="text-sm font-semibold text-[#374151] mb-3">选择渠道</h3>
            <div className="space-y-1.5">
              {CHANNELS.map(ch => (
                <button
                  key={ch.value}
                  onClick={() => setSelectedChannel(ch.value)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition ${
                    selectedChannel === ch.value ? 'bg-[#FEF3C7] text-[#92400E] font-medium' : 'text-[#374151] hover:bg-[#F3F4F6]'
                  }`}
                >
                  <span>{ch.icon}</span>
                  <span>{ch.label}</span>
                </button>
              ))}
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
                    ? 'ring-2 ring-[#F59E0B] bg-white shadow-sm'
                    : 'bg-white border border-[#E5E7EB] hover:border-[#D1D5DB]'
                }`}
              >
                <div className="w-full h-16 rounded-lg mb-2" style={{ background: tmpl.bg }} />
                <div className="text-sm font-medium text-[#111827]">{tmpl.label}</div>
                <div className="text-[10px] text-[#6B7280]">{tmpl.desc}</div>
              </button>
            ))}
          </div>
          <div className="rounded-xl p-5 bg-white border border-[#E5E7EB] space-y-3">
            <div>
              <label className="text-xs text-[#6B7280] block mb-1">自定义标语</label>
              <input
                value={posterTagline}
                onChange={e => setPosterTagline(e.target.value)}
                maxLength={40}
                className="w-full rounded-lg px-3 py-2.5 text-sm bg-[#F9FAFB] border border-[#E5E7EB] text-[#111827] focus:outline-none focus:border-[#F59E0B]"
              />
            </div>
            <div>
              <label className="text-xs text-[#6B7280] block mb-1">推广渠道</label>
              <select
                value={selectedChannel}
                onChange={e => setSelectedChannel(e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 text-sm bg-[#F9FAFB] border border-[#E5E7EB] text-[#111827] focus:outline-none"
              >
                {CHANNELS.map(ch => <option key={ch.value} value={ch.value}>{ch.icon} {ch.label}</option>)}
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
