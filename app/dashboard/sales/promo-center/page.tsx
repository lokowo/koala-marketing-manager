'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../../../lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
  renderPoster, exportPoster, hashCode,
  TEMPLATE_META, getSizeDimensions,
  type TemplateId, type Variant, type PosterSize, type PosterOptions,
} from '../../../lib/poster-engine';
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

const TABS = ['推广链接', '推广二维码', '推广海报'] as const;

const TEMPLATE_IDS: TemplateId[] = ['minimal', 'academic', 'vibrant'];
const SIZE_OPTIONS: { value: PosterSize; label: string; desc: string }[] = [
  { value: '3:4', label: '3:4', desc: '社交媒体' },
  { value: '1:1', label: '1:1', desc: '方形' },
  { value: '9:16', label: '9:16', desc: '竖屏' },
];

export default function PromoCenterPage() {
  const router = useRouter();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('wechat');
  const [copied, setCopied] = useState<string | false>(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]>('推广链接');
  const [posterTemplate, setPosterTemplate] = useState<TemplateId>('minimal');
  const [posterVariant, setPosterVariant] = useState<Variant>('A');
  const [posterSize, setPosterSize] = useState<PosterSize>('3:4');
  const [posterHeadline, setPosterHeadline] = useState('用 AI 找到你的理想 PhD 导师');
  const [posterSubtitle, setPosterSubtitle] = useState('澳洲八大名校 · 4000+ 教授');
  const [showQR, setShowQR] = useState(true);
  const [showUrl, setShowUrl] = useState(false);
  const [showRefCode, setShowRefCode] = useState(true);
  const [showChannelBadge, setShowChannelBadge] = useState(true);
  const [posterSeed, setPosterSeed] = useState(() => Date.now());
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const downloadCanvasRef = useRef<HTMLCanvasElement>(null);
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

  const posterOpts: PosterOptions = {
    template: posterTemplate,
    variant: posterVariant,
    size: posterSize,
    headline: posterHeadline,
    subtitle: posterSubtitle,
    refCode: referralCode || '',
    channel: selectedChannel,
    showQR,
    showUrl,
    showRefCode,
    showChannelBadge,
    seed: posterSeed,
  };

  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !referralCode) return;
    renderPoster(canvas, posterOpts);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posterTemplate, posterVariant, posterSize, posterHeadline, posterSubtitle, selectedChannel, showQR, showUrl, showRefCode, showChannelBadge, posterSeed, referralCode]);

  const handleDownload = useCallback(async () => {
    const canvas = downloadCanvasRef.current;
    if (!canvas || !referralCode) return;
    await renderPoster(canvas, posterOpts);
    exportPoster(canvas, posterOpts);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posterTemplate, posterVariant, posterSize, posterHeadline, posterSubtitle, selectedChannel, showQR, showUrl, showRefCode, showChannelBadge, posterSeed, referralCode]);

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
                    style={{ background: isSelected ? '#F59E0B15' : '#94A3B815' }}
                  >
                    <Icon size={18} strokeWidth={1.5} style={{ color: isSelected ? '#F59E0B' : '#94A3B8' }} />
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

      {/* Tab 3: Poster */}
      {tab === '推广海报' && (
        <div className="space-y-4">
          {/* Template selector cards */}
          <div className="grid grid-cols-3 gap-3">
            {TEMPLATE_IDS.map(tid => {
              const meta = TEMPLATE_META[tid];
              const active = posterTemplate === tid;
              return (
                <button
                  key={tid}
                  onClick={() => setPosterTemplate(tid)}
                  className={`rounded-xl p-3 text-left transition-all ${
                    active
                      ? 'ring-2 ring-[#F59E0B] bg-white dark:bg-[#1E293B] shadow-sm'
                      : 'bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] hover:border-[#D1D5DB] dark:hover:border-[#475569]'
                  }`}
                >
                  {/* Palette strip */}
                  <div className="flex gap-0.5 mb-2">
                    {meta.palette.map((c, i) => (
                      <div key={i} className="flex-1 h-5 first:rounded-l last:rounded-r" style={{ background: c, border: c === '#FFFFFF' ? '1px solid #E5E7EB' : undefined }} />
                    ))}
                  </div>
                  {/* Font preview */}
                  <div className="flex items-baseline gap-2 mb-1.5">
                    <span className="text-lg font-light text-[#111827] dark:text-[#F1F5F9]" style={{ fontFamily: tid === 'academic' ? 'Georgia, serif' : 'system-ui' }}>Aa</span>
                    <span className="text-xs text-[#6B7280] dark:text-[#94A3B8]" style={{ fontFamily: 'system-ui' }}>Aa</span>
                  </div>
                  {/* Button previews */}
                  <div className="flex gap-1.5 mb-2">
                    <div className="h-4 px-2 rounded text-[8px] flex items-center text-white" style={{ background: meta.palette[1] }}>Primary</div>
                    <div className="h-4 px-2 rounded text-[8px] flex items-center border" style={{ borderColor: meta.palette[1], color: meta.palette[1] }}>Secondary</div>
                  </div>
                  {/* Mini layout bars */}
                  <div className="space-y-1 mb-2">
                    <div className="h-1 rounded-full w-3/4" style={{ background: meta.palette[1], opacity: 0.4 }} />
                    <div className="h-1 rounded-full w-1/2" style={{ background: meta.palette[2], opacity: 0.3 }} />
                    <div className="h-3 w-3 mx-auto rounded" style={{ background: meta.palette[1], opacity: 0.2 }} />
                  </div>
                  {/* Name + desc */}
                  <div className="text-xs font-medium text-[#111827] dark:text-[#F1F5F9]">{meta.label}</div>
                  <div className="text-[10px] text-[#6B7280] dark:text-[#94A3B8]">{meta.desc}</div>
                  {/* Platform tags */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {meta.platforms.map(p => (
                      <span key={p} className="text-[8px] px-1.5 py-0.5 rounded bg-[#F3F4F6] dark:bg-[#334155] text-[#6B7280] dark:text-[#94A3B8]">{p}</span>
                    ))}
                  </div>
                  {/* A/B toggle */}
                  {active && (
                    <div className="flex gap-1 mt-2 pt-2 border-t border-[#F3F4F6] dark:border-[#334155]">
                      {(['A', 'B'] as const).map(v => (
                        <button
                          key={v}
                          onClick={e => { e.stopPropagation(); setPosterVariant(v); }}
                          className={`flex-1 py-1 rounded text-[10px] font-medium transition ${
                            posterVariant === v
                              ? 'bg-[#F59E0B] text-white'
                              : 'bg-[#F3F4F6] dark:bg-[#334155] text-[#6B7280] dark:text-[#94A3B8]'
                          }`}
                        >
                          {v}版
                        </button>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Editor: left controls + right preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Right: preview (on mobile, show first) */}
            <div className="order-first md:order-last rounded-xl bg-[#F9FAFB] dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] p-4 flex items-center justify-center min-h-[320px]">
              <canvas
                ref={previewCanvasRef}
                style={{
                  maxWidth: '100%',
                  maxHeight: '480px',
                  aspectRatio: (() => { const d = getSizeDimensions(posterSize); return `${d.width}/${d.height}`; })(),
                }}
                className="rounded-lg shadow-md"
              />
            </div>

            {/* Left: controls */}
            <div className="rounded-xl p-4 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] space-y-3">
              <div className="text-xs font-medium text-[#374151] dark:text-[#CBD5E1]">文案</div>
              <div>
                <label className="text-[10px] text-[#6B7280] dark:text-[#94A3B8] block mb-1">主标题</label>
                <input
                  value={posterHeadline}
                  onChange={e => setPosterHeadline(e.target.value)}
                  maxLength={40}
                  className="w-full rounded-lg px-3 py-2 text-sm bg-[#F9FAFB] dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] text-[#111827] dark:text-[#F1F5F9] focus:outline-none focus:border-[#F59E0B]"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#6B7280] dark:text-[#94A3B8] block mb-1">副标题（可选）</label>
                <input
                  value={posterSubtitle}
                  onChange={e => setPosterSubtitle(e.target.value)}
                  maxLength={30}
                  className="w-full rounded-lg px-3 py-2 text-sm bg-[#F9FAFB] dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] text-[#111827] dark:text-[#F1F5F9] focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <div className="text-xs font-medium text-[#374151] dark:text-[#CBD5E1] pt-1">推广信息</div>
              <div>
                <label className="text-[10px] text-[#6B7280] dark:text-[#94A3B8] block mb-1">推广渠道</label>
                <select
                  value={selectedChannel}
                  onChange={e => setSelectedChannel(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm bg-[#F9FAFB] dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] text-[#111827] dark:text-[#F1F5F9] focus:outline-none"
                >
                  {CHANNELS.map(ch => <option key={ch.value} value={ch.value}>{ch.label}</option>)}
                </select>
              </div>

              {/* Toggles */}
              <div className="space-y-2">
                {[
                  { label: '显示二维码', checked: showQR, set: setShowQR },
                  { label: '显示网址文字', checked: showUrl, set: setShowUrl },
                  { label: '显示邀请码', checked: showRefCode, set: setShowRefCode },
                  { label: '渠道标识', checked: showChannelBadge, set: setShowChannelBadge },
                ].map(t => (
                  <label key={t.label} className="flex items-center justify-between cursor-pointer">
                    <span className="text-xs text-[#374151] dark:text-[#CBD5E1]">{t.label}</span>
                    <button
                      type="button"
                      onClick={() => t.set(!t.checked)}
                      className={`relative w-9 h-5 rounded-full transition-colors ${t.checked ? 'bg-[#F59E0B]' : 'bg-[#D1D5DB] dark:bg-[#475569]'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${t.checked ? 'translate-x-4' : ''}`} />
                    </button>
                  </label>
                ))}
              </div>

              {/* Size */}
              <div className="text-xs font-medium text-[#374151] dark:text-[#CBD5E1] pt-1">尺寸</div>
              <div className="flex gap-2">
                {SIZE_OPTIONS.map(s => (
                  <button
                    key={s.value}
                    onClick={() => setPosterSize(s.value)}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition ${
                      posterSize === s.value
                        ? 'bg-[#FEF3C7] dark:bg-[#F59E0B]/20 text-[#92400E]'
                        : 'bg-[#F3F4F6] dark:bg-[#334155] text-[#6B7280] dark:text-[#94A3B8]'
                    }`}
                  >
                    {s.label}<br /><span className="text-[9px] opacity-70">{s.desc}</span>
                  </button>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setPosterSeed(Date.now())}
                  className="flex-1 py-2.5 rounded-lg text-xs font-medium bg-[#F3F4F6] dark:bg-[#334155] text-[#374151] dark:text-[#CBD5E1] hover:bg-[#E5E7EB] dark:hover:bg-[#475569] transition"
                >
                  重新生成
                </button>
                <button
                  onClick={handleDownload}
                  className="flex-1 py-2.5 rounded-lg text-xs font-medium bg-[#F59E0B] text-white hover:bg-[#D97706] transition flex items-center justify-center gap-1.5"
                >
                  <IconDownload size={14} />
                  下载 PNG
                </button>
              </div>
            </div>
          </div>

          <canvas ref={downloadCanvasRef} className="hidden" />
        </div>
      )}
    </div>
  );
}
