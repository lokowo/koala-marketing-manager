'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { POSTER_FONTS, loadPosterFonts, DEFAULT_ZH_FONT } from './poster-fonts';

interface Props { referralCode: string; channel: string; }

interface ImageBgDef { id: string; src: string; label: string; }

const IMAGE_BGS: ImageBgDef[] = [
  { id: '11', src: '/images/posters/11.png', label: '砂岩主楼' },
  { id: '22', src: '/images/posters/22.png', label: '蓝花楹校园' },
  { id: '33', src: '/images/posters/33.png', label: '林荫主楼' },
  { id: '44', src: '/images/posters/44.png', label: 'STEM大楼' },
  { id: '55', src: '/images/posters/55.png', label: '图书馆' },
  { id: '66', src: '/images/posters/66.png', label: '蓝花楹步道' },
];

const CW = 1080, CH_H = 1440;

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

export default function ImagePosterEditor({ referralCode, channel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [bgId, setBgId] = useState('11');
  const [titleTxt, setTitleTxt] = useState('用 AI 找到你的理想 PhD 导师');
  const [subTxt, setSubTxt] = useState('覆盖澳洲38所大学、24,000+位教授');
  const [ch, setCh] = useState(channel);
  const [font, setFont] = useState(DEFAULT_ZH_FONT);
  const [vis, setVis] = useState({ qr: true, url: true, inviteCode: true, channel: true });
  const [extraTexts, setExtraTexts] = useState<string[]>([]);

  useEffect(() => { loadPosterFonts().then(() => setReady(true)); }, []);

  useEffect(() => {
    if (!ready || !canvasRef.current) return;
    let cancelled = false;
    const canvas = canvasRef.current;
    const w = CW, h = CH_H;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    const fg = '#FFFFFF';
    const fgSub = 'rgba(255,255,255,0.8)';

    (async () => {
      // Step 2: Background image (cover-fit)
      const bgDef = IMAGE_BGS.find(b => b.id === bgId);
      if (bgDef) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = bgDef.src;
          await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; });
          if (cancelled) return;
          const scale = Math.max(w / img.width, h / img.height);
          const dw = img.width * scale;
          const dh = img.height * scale;
          ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
        } catch {
          ctx.fillStyle = '#0F1419';
          ctx.fillRect(0, 0, w, h);
        }
      } else {
        ctx.fillStyle = '#0F1419';
        ctx.fillRect(0, 0, w, h);
      }

      if (cancelled) return;

      // Step 3: Fog overlay + scrims
      ctx.fillStyle = '#0F1419';
      ctx.globalAlpha = 0.50;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;

      const topH = Math.round(h * 0.30);
      const topGrad = ctx.createLinearGradient(0, 0, 0, topH);
      topGrad.addColorStop(0, 'rgba(15,20,25,0.6)');
      topGrad.addColorStop(1, 'rgba(15,20,25,0)');
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, w, topH);

      const botTop = Math.round(h * 0.60);
      const botGrad = ctx.createLinearGradient(0, botTop, 0, h);
      botGrad.addColorStop(0, 'rgba(15,20,25,0)');
      botGrad.addColorStop(1, 'rgba(15,20,25,0.7)');
      ctx.fillStyle = botGrad;
      ctx.fillRect(0, botTop, w, h - botTop);

      ctx.textBaseline = 'top';

      // Step 4: Logo
      ctx.save();
      ctx.font = `bold 18px "${font}", sans-serif`;
      ctx.fillStyle = '#F59E0B';
      ctx.textAlign = 'left';
      ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 1;
      ctx.fillText('Koala PhD 考拉博士', 60, 40);
      ctx.restore();

      // Step 5: Title
      ctx.save();
      ctx.font = `bold 48px "${font}", sans-serif`;
      ctx.fillStyle = fg;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
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
      ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 1;
      ctx.fillText(subTxt, w / 2, curY);
      ctx.restore();

      // Step 7: Selling points
      curY += 50;
      ctx.save();
      ctx.font = `20px "${font}", sans-serif`;
      ctx.fillStyle = fg;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 1;
      for (const pt of SELLING_PTS) { ctx.fillText(pt, 80, curY); curY += 40; }
      for (const txt of extraTexts) { ctx.fillText(txt, 80, curY); curY += 40; }
      ctx.restore();

      if (cancelled) return;

      // Step 8: QR Code
      const qrSz = 270;
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
        ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 1;
        ctx.fillText('扫码注册', w / 2, qrBottomY + 16);
        ctx.restore();
      }
      if (vis.inviteCode) {
        ctx.save();
        ctx.font = `bold 16px "${font}", sans-serif`;
        ctx.fillStyle = fg;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 1;
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
        ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 2; ctx.shadowOffsetY = 1;
        ctx.fillText('koalaphd.com', 60, bottomY);
        ctx.restore();
      }
      if (vis.channel) {
        ctx.save();
        ctx.font = `12px "${font}", sans-serif`;
        ctx.fillStyle = fgSub;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 2; ctx.shadowOffsetY = 1;
        ctx.fillText(CH_LABELS[ch] || ch, w - 60, bottomY);
        ctx.restore();
      }
    })();

    return () => { cancelled = true; };
  }, [ready, bgId, titleTxt, subTxt, ch, font, vis, referralCode, extraTexts]);

  function resetAll() {
    setTitleTxt('用 AI 找到你的理想 PhD 导师');
    setSubTxt('覆盖澳洲38所大学、24,000+位教授');
    setExtraTexts([]);
  }

  function exportPNG() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `koala-poster-img-${bgId}-${referralCode}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
  }

  if (!ready) return <Loading />;

  const zhF = POSTER_FONTS.filter(f => f.category === 'zh');
  const enF = POSTER_FONTS.filter(f => f.category === 'en');

  return (
    <div className="space-y-4">
      {/* Top: 6 Image Thumbnail Cards */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {IMAGE_BGS.map(bg => {
          const active = bgId === bg.id;
          return (
            <button key={bg.id} onClick={() => setBgId(bg.id)}
              className={`relative rounded-xl overflow-hidden aspect-[3/4] transition-all border ${active ? 'border-[#F59E0B] ring-2 ring-[#F59E0B]/30' : 'border-[#E5E7EB] dark:border-[#334155] hover:border-[#D1D5DB] dark:hover:border-[#475569]'}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={bg.src} alt={bg.label} className="w-full h-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                <span className="text-[10px] text-white block text-center font-medium">{bg.label}</span>
              </div>
              {active && (
                <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#F59E0B] flex items-center justify-center">
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
        </div>

        {/* Right: Canvas Preview */}
        <div className="flex-1 min-w-0">
          <div className="rounded-xl bg-[#F9FAFB] dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] p-4 flex items-center justify-center">
            <div style={{ width: '100%', maxWidth: 500, aspectRatio: '3 / 4', borderRadius: 12, overflow: 'hidden' }}>
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
