'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { POSTER_FONTS, loadPosterFonts } from './poster-fonts';

interface Props { referralCode: string; channel: string; }
type PosterSize = '3:4' | '1:1' | '9:16';
type ThemeId = 'minimal' | 'academic' | 'vibrant';
type Variant = 'A' | 'B';

interface ThemeDef {
  id: ThemeId; name: string; desc: string; font: string;
  channels: string[]; isDark: boolean; swatches: string[];
  variants: Record<Variant, { colors: string[]; label: string }>;
}

const THEMES: ThemeDef[] = [
  {
    id: 'minimal', name: '简约', desc: '干净留白，适合正式推广',
    font: 'Noto Sans SC', channels: ['微信', '邮件', 'WhatsApp'],
    isDark: false, swatches: ['#FFFFFF', '#F1F5F9', '#E2E8F0'],
    variants: { A: { colors: ['#FFFFFF'], label: '纯白' }, B: { colors: ['#F1F5F9', '#E2E8F0'], label: '浅灰' } },
  },
  {
    id: 'academic', name: '学术', desc: '深沉专业，适合学术社群',
    font: 'Noto Serif SC', channels: ['知乎', 'LinkedIn', '学术群'],
    isDark: true, swatches: ['#0F172A', '#1E3A5F', '#1E40AF'],
    variants: { A: { colors: ['#0F172A'], label: '深蓝' }, B: { colors: ['#0F172A', '#1E3A5F'], label: '渐变蓝' } },
  },
  {
    id: 'vibrant', name: '活力', desc: '吸睛醒目，适合社交媒体',
    font: 'ZCOOL KuaiLe', channels: ['小红书', '抖音', 'B站'],
    isDark: true, swatches: ['#F59E0B', '#EC4899', '#6366F1'],
    variants: { A: { colors: ['#F59E0B', '#EC4899'], label: '橙粉' }, B: { colors: ['#6366F1', '#EC4899'], label: '紫粉' } },
  },
];

const SIZE_CFG: Record<PosterSize, { w: number; h: number; label: string }> = {
  '3:4': { w: 1080, h: 1440, label: '3:4' },
  '1:1': { w: 1080, h: 1080, label: '1:1' },
  '9:16': { w: 1080, h: 1920, label: '9:16' },
};

const CH_OPTS = [
  { v: 'wechat', l: '微信' }, { v: 'xiaohongshu', l: '小红书' }, { v: 'douyin', l: '抖音' },
  { v: 'weibo', l: '微博' }, { v: 'zhihu', l: '知乎' }, { v: 'bilibili', l: 'Bilibili' },
  { v: 'email', l: '邮件' }, { v: 'whatsapp', l: 'WhatsApp' }, { v: 'tiktok', l: 'TikTok' },
  { v: 'instagram', l: 'Instagram' }, { v: 'x', l: 'X (Twitter)' }, { v: 'telegram', l: 'Telegram' },
  { v: 'other', l: '其他' },
];

const CH_LABELS: Record<string, string> = {
  wechat: '微信推广', xiaohongshu: '小红书推广', douyin: '抖音推广', weibo: '微博推广',
  zhihu: '知乎推广', bilibili: 'B站推广', email: '邮件推广', whatsapp: 'WhatsApp推广',
  tiktok: 'TikTok推广', instagram: 'Instagram推广', x: 'X推广', telegram: 'Telegram推广', other: '其他渠道',
};

const SELLING_PTS = [
  '✓ AI 智能匹配澳洲博士导师',
  '✓ 一键生成个性化套磁信',
  '✓ 教授论文对齐研究计划',
  '✓ 全程申请进度追踪',
];

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const char of text) {
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

export default function FabricPosterEditor({ referralCode, channel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [themeId, setThemeId] = useState<ThemeId>('academic');
  const [variant, setVariant] = useState<Variant>('A');
  const [size, setSize] = useState<PosterSize>('3:4');
  const [titleTxt, setTitleTxt] = useState('用 AI 找到你的理想 PhD 导师');
  const [subTxt, setSubTxt] = useState('覆盖澳洲38所大学、24,000+位教授');
  const [ch, setCh] = useState(channel);
  const [font, setFont] = useState(THEMES[1].font);
  const [vis, setVis] = useState({ qr: true, url: true, inviteCode: true, channel: true });
  const [extraTexts, setExtraTexts] = useState<string[]>([]);

  useEffect(() => { loadPosterFonts().then(() => setReady(true)); }, []);

  useEffect(() => {
    if (!ready || !canvasRef.current) return;
    let cancelled = false;
    const canvas = canvasRef.current;
    const theme = THEMES.find(t => t.id === themeId)!;
    const { w, h } = SIZE_CFG[size];
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    const isDark = theme.isDark;
    const fg = isDark ? '#FFFFFF' : '#1F2937';
    const fgSub = isDark ? 'rgba(255,255,255,0.8)' : 'rgba(31,41,55,0.6)';

    (async () => {
      // Step 2: Background
      const bgColors = theme.variants[variant].colors;
      if (bgColors.length > 1) {
        const grad = ctx.createLinearGradient(0, 0, w, h);
        bgColors.forEach((c, i) => grad.addColorStop(i / (bgColors.length - 1), c));
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = bgColors[0];
      }
      ctx.fillRect(0, 0, w, h);

      if (isDark) {
        const shimmer = ctx.createLinearGradient(0, 0, 0, h * 0.25);
        shimmer.addColorStop(0, 'rgba(255,255,255,0.06)');
        shimmer.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = shimmer;
        ctx.fillRect(0, 0, w, h * 0.25);
      }

      ctx.textBaseline = 'top';

      // Step 4: Logo
      ctx.save();
      ctx.font = `bold 18px "${font}", sans-serif`;
      ctx.fillStyle = '#F59E0B';
      ctx.textAlign = 'left';
      if (isDark) { ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 1; }
      ctx.fillText('Koala PhD 考拉博士', 60, 40);
      ctx.restore();

      // Step 5: Title
      ctx.save();
      ctx.font = `bold 48px "${font}", sans-serif`;
      ctx.fillStyle = fg;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      if (isDark) { ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2; }
      const titleLines = wrapText(ctx, titleTxt, w - 120);
      let curY = h * 0.15;
      for (const line of titleLines) { ctx.fillText(line, w / 2, curY); curY += 62; }
      ctx.restore();

      // Step 6: Subtitle
      curY += 8;
      ctx.save();
      ctx.font = `24px "${font}", sans-serif`;
      ctx.fillStyle = fgSub;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      if (isDark) { ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 1; }
      ctx.fillText(subTxt, w / 2, curY);
      ctx.restore();

      // Step 7: Selling points
      curY += 50;
      ctx.save();
      ctx.font = `20px "${font}", sans-serif`;
      ctx.fillStyle = fg;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      if (isDark) { ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 1; }
      for (const pt of SELLING_PTS) { ctx.fillText(pt, 80, curY); curY += 40; }
      for (const txt of extraTexts) { ctx.fillText(txt, 80, curY); curY += 40; }
      ctx.restore();

      if (cancelled) return;

      // Step 8: QR Code
      const qrSz = Math.min(270, h * 0.19);
      const qrPad = 20;
      const qrCenterY = Math.max(h * 0.62, curY + qrSz / 2 + 30);

      if (vis.qr) {
        try {
          const qrUrl = `https://koalaphd.com/?ref=${referralCode}`;
          const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 480, margin: 2, color: { dark: '#1a2332', light: '#FFFFFF' } });
          if (cancelled) return;
          const qrImg = new Image();
          qrImg.src = qrDataUrl;
          await new Promise<void>((res, rej) => { qrImg.onload = () => res(); qrImg.onerror = rej; });
          if (cancelled) return;
          const qrX = (w - qrSz) / 2;
          const qrY = qrCenterY - qrSz / 2;
          ctx.save();
          ctx.shadowColor = 'rgba(0,0,0,0.15)';
          ctx.shadowBlur = 12;
          ctx.shadowOffsetY = 4;
          ctx.fillStyle = '#FFFFFF';
          roundRect(ctx, qrX - qrPad, qrY - qrPad, qrSz + qrPad * 2, qrSz + qrPad * 2, 16);
          ctx.fill();
          ctx.restore();
          ctx.drawImage(qrImg, qrX, qrY, qrSz, qrSz);
        } catch (e) { console.error('QR failed', e); }
      }

      // Step 9: Scan label + invite code
      const qrBottomY = qrCenterY + qrSz / 2 + qrPad;
      if (vis.qr) {
        ctx.save();
        ctx.font = `14px "${font}", sans-serif`;
        ctx.fillStyle = fgSub;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        if (isDark) { ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 1; }
        ctx.fillText('扫码注册', w / 2, qrBottomY + 16);
        ctx.restore();
      }
      if (vis.inviteCode) {
        ctx.save();
        ctx.font = `bold 16px "${font}", sans-serif`;
        ctx.fillStyle = fg;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        if (isDark) { ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 1; }
        ctx.fillText(`邀请码: ${referralCode}`, w / 2, qrBottomY + 44);
        ctx.restore();
      }

      // Step 10: Bottom bar
      const bottomY = h - 60;
      if (vis.url) {
        ctx.save();
        ctx.font = `12px "${font}", sans-serif`;
        ctx.fillStyle = fgSub;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        if (isDark) { ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 2; ctx.shadowOffsetY = 1; }
        ctx.fillText('koalaphd.com', 60, bottomY);
        ctx.restore();
      }
      if (vis.channel) {
        ctx.save();
        ctx.font = `12px "${font}", sans-serif`;
        ctx.fillStyle = fgSub;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        if (isDark) { ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 2; ctx.shadowOffsetY = 1; }
        ctx.fillText(CH_LABELS[ch] || ch, w - 60, bottomY);
        ctx.restore();
      }
    })();

    return () => { cancelled = true; };
  }, [ready, themeId, variant, size, titleTxt, subTxt, ch, font, vis, referralCode, extraTexts]);

  function switchTheme(id: ThemeId) {
    setThemeId(id);
    setVariant('A');
    setFont(THEMES.find(t => t.id === id)!.font);
  }

  function resetAll() {
    setTitleTxt('用 AI 找到你的理想 PhD 导师');
    setSubTxt('覆盖澳洲38所大学、24,000+位教授');
    setExtraTexts([]);
  }

  function exportPNG() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `koala-poster-${themeId}-${variant}-${referralCode}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
  }

  if (!ready) return <Loading />;

  const zhF = POSTER_FONTS.filter(f => f.category === 'zh');
  const enF = POSTER_FONTS.filter(f => f.category === 'en');

  return (
    <div className="space-y-4">
      {/* Top: 3 Design Package Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {THEMES.map(t => {
          const active = themeId === t.id;
          return (
            <button key={t.id} onClick={() => switchTheme(t.id)}
              className={`relative rounded-xl p-4 text-left transition-all border ${active ? 'border-[#F59E0B] ring-2 ring-[#F59E0B]/30 bg-white dark:bg-[#1E293B]' : 'border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] hover:border-[#D1D5DB] dark:hover:border-[#475569]'}`}>
              <div className="flex gap-1 mb-3">
                {t.swatches.map((c, i) => (
                  <div key={i} className="flex-1 h-6 rounded-md first:rounded-l-lg last:rounded-r-lg" style={{ background: c, border: c === '#FFFFFF' ? '1px solid #E5E7EB' : 'none' }} />
                ))}
              </div>
              <div className="text-lg font-semibold text-[#111827] dark:text-[#F1F5F9] mb-1" style={{ fontFamily: t.font }}>Aa 字体预览</div>
              <div className="text-sm font-medium text-[#111827] dark:text-[#F1F5F9]">{t.name}</div>
              <div className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] mt-0.5">{t.desc}</div>
              <div className="flex flex-wrap gap-1 mt-2">
                {t.channels.map(c => <span key={c} className="px-2 py-0.5 rounded-full text-[10px] bg-[#F3F4F6] dark:bg-[#334155] text-[#6B7280] dark:text-[#94A3B8]">{c}</span>)}
              </div>
              {active && (
                <div className="flex gap-1.5 mt-3 pt-3 border-t border-[#E5E7EB] dark:border-[#334155]">
                  {(['A', 'B'] as Variant[]).map(v => (
                    <button key={v} onClick={e => { e.stopPropagation(); setVariant(v); }}
                      className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition ${variant === v ? 'bg-[#FEF3C7] dark:bg-[#F59E0B]/20 text-[#92400E] dark:text-[#F59E0B]' : 'bg-[#F3F4F6] dark:bg-[#334155] text-[#6B7280] dark:text-[#94A3B8] hover:bg-[#E5E7EB] dark:hover:bg-[#475569]'}`}>
                      {v} · {t.variants[v].label}
                    </button>
                  ))}
                </div>
              )}
              {active && (
                <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-[#F59E0B] flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 8l3 3 7-7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom: Left Panel + Right Preview */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="w-full lg:w-[260px] shrink-0 space-y-3 lg:max-h-[calc(100vh-420px)] lg:overflow-y-auto lg:pr-1">
          <Sec title="主标题">
            <input value={titleTxt} onChange={e => setTitleTxt(e.target.value)} className="w-full rounded-lg px-2.5 py-1.5 text-xs bg-[#F9FAFB] dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] text-[#111827] dark:text-[#F1F5F9]" />
          </Sec>
          <Sec title="副标题">
            <input value={subTxt} onChange={e => setSubTxt(e.target.value)} className="w-full rounded-lg px-2.5 py-1.5 text-xs bg-[#F9FAFB] dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] text-[#111827] dark:text-[#F1F5F9]" />
          </Sec>
          <Sec title="添加文字">
            <button onClick={() => setExtraTexts(prev => [...prev, '自定义文字'])}
              className="w-full py-2 rounded-lg text-xs font-medium bg-[#F3F4F6] dark:bg-[#334155] text-[#374151] dark:text-[#CBD5E1] hover:bg-[#E5E7EB] dark:hover:bg-[#475569] transition flex items-center justify-center gap-1.5">+ 文字</button>
            {extraTexts.map((txt, i) => (
              <div key={i} className="flex gap-1.5 mt-2">
                <input value={txt} onChange={e => { const v = e.target.value; setExtraTexts(prev => prev.map((t, idx) => idx === i ? v : t)); }}
                  className="flex-1 rounded-lg px-2.5 py-1.5 text-xs bg-[#F9FAFB] dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] text-[#111827] dark:text-[#F1F5F9]" />
                <button onClick={() => setExtraTexts(prev => prev.filter((_, idx) => idx !== i))}
                  className="px-2 py-1 rounded-lg text-[10px] bg-[#FEE2E2] dark:bg-[#7F1D1D]/30 text-[#991B1B] dark:text-[#F87171]">✕</button>
              </div>
            ))}
          </Sec>
          <Sec title="推广渠道">
            <select value={ch} onChange={e => setCh(e.target.value)} className="w-full rounded-lg px-2.5 py-1.5 text-xs bg-[#F9FAFB] dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] text-[#111827] dark:text-[#F1F5F9]">
              {CH_OPTS.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
            </select>
          </Sec>
          <Sec title="字体">
            <select value={font} onChange={e => setFont(e.target.value)} className="w-full rounded-lg px-2.5 py-1.5 text-xs bg-[#F9FAFB] dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] text-[#111827] dark:text-[#F1F5F9]">
              <optgroup label="中文">{zhF.map(f => <option key={f.family} value={f.family}>{f.label}</option>)}</optgroup>
              <optgroup label="英文">{enF.map(f => <option key={f.family} value={f.family}>{f.label}</option>)}</optgroup>
            </select>
          </Sec>
          <Sec title="显示开关">
            {([['qr', '二维码'], ['url', '网址文字'], ['inviteCode', '邀请码'], ['channel', '渠道标识']] as const).map(([k, label]) => (
              <label key={k} className="flex items-center gap-2 text-[11px] text-[#374151] dark:text-[#CBD5E1] cursor-pointer">
                <input type="checkbox" checked={vis[k]} onChange={() => setVis(prev => ({ ...prev, [k]: !prev[k] }))} className="rounded border-[#D1D5DB] text-[#F59E0B] focus:ring-[#F59E0B]" />
                {label}
              </label>
            ))}
          </Sec>
          <Sec title="尺寸">
            <div className="flex gap-1.5">
              {(Object.entries(SIZE_CFG) as [PosterSize, typeof SIZE_CFG['3:4']][]).map(([k, cfg]) => (
                <button key={k} onClick={() => setSize(k)}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition ${size === k ? 'bg-[#FEF3C7] dark:bg-[#F59E0B]/20 text-[#92400E] dark:text-[#F59E0B]' : 'bg-[#F3F4F6] dark:bg-[#334155] text-[#6B7280] dark:text-[#94A3B8] hover:bg-[#E5E7EB] dark:hover:bg-[#475569]'}`}>
                  {cfg.label}
                </button>
              ))}
            </div>
          </Sec>
        </div>

        {/* Right: Canvas Preview */}
        <div className="flex-1 min-w-0">
          <div className="rounded-xl bg-[#F9FAFB] dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] p-4 flex items-center justify-center">
            <div style={{ width: '100%', maxWidth: 500, aspectRatio: `${SIZE_CFG[size].w} / ${SIZE_CFG[size].h}`, borderRadius: 12, overflow: 'hidden' }}>
              <canvas ref={canvasRef} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between gap-3 rounded-xl p-3 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155]">
        <button onClick={resetAll} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-[#F3F4F6] dark:bg-[#334155] text-[#374151] dark:text-[#CBD5E1] hover:bg-[#E5E7EB] dark:hover:bg-[#475569] transition">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 8a6 6 0 0111.47-2.47M14 8a6 6 0 01-11.47 2.47" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><path d="M14 2v4h-4M2 14v-4h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          重新生成
        </button>
        <button onClick={exportPNG} className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-medium bg-[#F59E0B] text-white hover:bg-[#D97706] transition shadow-sm">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2M8 2v9M5 8l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          下载 PNG
        </button>
      </div>
    </div>
  );
}

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-xl p-3 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] space-y-2"><div className="text-xs font-medium text-[#374151] dark:text-[#CBD5E1]">{title}</div>{children}</div>;
}

function Loading() {
  return <div className="flex items-center justify-center py-20 gap-2 text-sm text-[#6B7280] dark:text-[#94A3B8]"><span className="w-4 h-4 border-2 border-[#F59E0B] border-t-transparent rounded-full animate-spin" />字体加载中…</div>;
}
