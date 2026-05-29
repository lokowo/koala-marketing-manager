'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';
import { POSTER_FONTS, loadPosterFonts } from './poster-fonts';

interface Props { referralCode: string; channel: string; }
type ThemeId = 'minimal' | 'academic' | 'vibrant';
type Variant = 'A' | 'B';

interface ThemeDef {
  id: ThemeId; name: string; desc: string; font: string;
  channels: string[]; isDark: boolean; swatches: string[];
  variants: Record<Variant, { bg: string; label: string }>;
}

const THEMES: ThemeDef[] = [
  {
    id: 'minimal', name: '简约', desc: '干净留白，适合正式推广',
    font: 'Noto Sans SC', channels: ['微信', '邮件', 'WhatsApp'],
    isDark: false, swatches: ['#FFFFFF', '#F1F5F9', '#E2E8F0'],
    variants: {
      A: { bg: '#FFFFFF', label: '纯白' },
      B: { bg: 'linear-gradient(135deg, #F1F5F9, #E2E8F0)', label: '浅灰' },
    },
  },
  {
    id: 'academic', name: '学术', desc: '深沉专业，适合学术社群',
    font: 'Noto Serif SC', channels: ['知乎', 'LinkedIn', '学术群'],
    isDark: true, swatches: ['#0F172A', '#1E3A5F', '#1E40AF'],
    variants: {
      A: { bg: '#0F172A', label: '深蓝' },
      B: { bg: 'linear-gradient(135deg, #0F172A, #1E3A5F)', label: '渐变蓝' },
    },
  },
  {
    id: 'vibrant', name: '活力', desc: '吸睛醒目，适合社交媒体',
    font: 'ZCOOL KuaiLe', channels: ['小红书', '抖音', 'B站'],
    isDark: true, swatches: ['#F59E0B', '#EC4899', '#6366F1'],
    variants: {
      A: { bg: 'linear-gradient(135deg, #F59E0B, #EC4899)', label: '橙粉' },
      B: { bg: 'linear-gradient(135deg, #6366F1, #EC4899)', label: '紫粉' },
    },
  },
];

const TITLE_SIZES = [36, 42, 48, 54, 60];
const SUB_SIZES = [18, 22, 24, 28, 32];
const PT_SIZES = [16, 18, 20, 22];
const TITLE_COLORS: { value: string; label: string; bg: string; fg: string }[] = [
  { value: '#FFFFFF', label: '白', bg: '#F3F4F6', fg: '#374151' },
  { value: '#1F2937', label: '黑', bg: '#1E293B', fg: '#FFFFFF' },
  { value: '#D4A843', label: '金', bg: '#D4A843', fg: '#FFFFFF' },
];

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

const DEFAULT_PTS = [
  'AI 智能匹配澳洲博士导师',
  '一键生成个性化套磁信',
  '教授论文对齐研究计划',
  '全程申请进度追踪',
];

const PREVIEW_W = 540;
const PREVIEW_H = 720;

const inputCls = 'w-full rounded-lg px-2.5 py-1.5 text-xs bg-[#F9FAFB] dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] text-[#111827] dark:text-[#F1F5F9]';
const selectCls = inputCls;

export default function FabricPosterEditor({ referralCode, channel }: Props) {
  const posterRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [themeId, setThemeId] = useState<ThemeId>('academic');
  const [variant, setVariant] = useState<Variant>('A');
  const [titleTxt, setTitleTxt] = useState('用 AI 找到你的\n理想 PhD 导师');
  const [titleSize, setTitleSize] = useState(48);
  const [titleColor, setTitleColor] = useState('#FFFFFF');
  const [subTxt, setSubTxt] = useState('覆盖全澳 38 所大学导师与学者');
  const [subSize, setSubSize] = useState(24);
  const [pts, setPts] = useState(DEFAULT_PTS);
  const [ptSize, setPtSize] = useState(20);
  const [ch, setCh] = useState(channel);
  const [font, setFont] = useState(THEMES[1].font);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => { loadPosterFonts().then(() => setReady(true)); }, []);

  useEffect(() => {
    QRCode.toDataURL(`https://koalaphd.com/?ref=${referralCode}`, {
      width: 480, margin: 2, color: { dark: '#1a2332', light: '#FFFFFF' },
    }).then(setQrDataUrl).catch(console.error);
  }, [referralCode]);

  const theme = THEMES.find(t => t.id === themeId)!;
  const isDark = theme.isDark;
  const fgMain = isDark ? '#FFFFFF' : '#1F2937';
  const fgSub = isDark ? 'rgba(255,255,255,0.75)' : 'rgba(31,41,55,0.6)';
  const fgPt = isDark ? '#FFFFFF' : '#1F2937';
  const bgStyle = theme.variants[variant].bg;
  const isGradient = bgStyle.includes('gradient');

  const exportPNG = useCallback(async () => {
    if (!posterRef.current || exporting) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(posterRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
        width: PREVIEW_W,
        height: PREVIEW_H,
      });
      const link = document.createElement('a');
      link.download = `koala-poster-${themeId}-${variant}-${referralCode}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    } catch (e) {
      console.error('Export failed', e);
    } finally {
      setExporting(false);
    }
  }, [themeId, variant, referralCode, exporting]);

  function switchTheme(id: ThemeId) {
    setThemeId(id);
    setVariant('A');
    const t = THEMES.find(th => th.id === id)!;
    setFont(t.font);
    setTitleColor(t.isDark ? '#FFFFFF' : '#1F2937');
  }

  function resetAll() {
    setTitleTxt('用 AI 找到你的\n理想 PhD 导师');
    setTitleSize(48);
    const t = THEMES.find(th => th.id === themeId)!;
    setTitleColor(t.isDark ? '#FFFFFF' : '#1F2937');
    setSubTxt('覆盖全澳 38 所大学导师与学者');
    setSubSize(24);
    setPts(DEFAULT_PTS);
    setPtSize(20);
  }

  function addPt() { if (pts.length < 6) setPts(prev => [...prev, '新卖点']); }
  function removePt(i: number) { if (pts.length > 1) setPts(prev => prev.filter((_, idx) => idx !== i)); }

  if (!ready) return <Loading />;

  const zhF = POSTER_FONTS.filter(f => f.category === 'zh');
  const enF = POSTER_FONTS.filter(f => f.category === 'en');

  return (
    <div className="space-y-4">
      {/* Theme cards */}
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

      {/* Editor: left panel + right preview */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left controls */}
        <div className="w-full lg:w-[260px] shrink-0 space-y-3 max-h-[60vh] lg:max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
          <Sec title="主标题">
            <textarea value={titleTxt} onChange={e => setTitleTxt(e.target.value)} rows={2} className={inputCls + ' resize-none'} />
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#6B7280] dark:text-[#94A3B8] shrink-0">字号</span>
              <select value={titleSize} onChange={e => setTitleSize(Number(e.target.value))} className={selectCls}>
                {TITLE_SIZES.map(s => <option key={s} value={s}>{s}px</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#6B7280] dark:text-[#94A3B8] shrink-0">颜色</span>
              <div className="flex gap-1 flex-1">
                {TITLE_COLORS.map(c => (
                  <button key={c.value} onClick={() => setTitleColor(c.value)}
                    className={`flex-1 py-1 rounded-md text-[10px] font-medium transition ${titleColor === c.value ? 'ring-2 ring-[#F59E0B] ring-offset-1' : ''}`}
                    style={{ background: c.bg, color: c.fg }}>{c.label}</button>
                ))}
              </div>
            </div>
          </Sec>

          <Sec title="副标题">
            <input value={subTxt} onChange={e => setSubTxt(e.target.value)} className={inputCls} />
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#6B7280] dark:text-[#94A3B8] shrink-0">字号</span>
              <select value={subSize} onChange={e => setSubSize(Number(e.target.value))} className={selectCls}>
                {SUB_SIZES.map(s => <option key={s} value={s}>{s}px</option>)}
              </select>
            </div>
          </Sec>

          <Sec title="卖点文字">
            {pts.map((pt, i) => (
              <div key={i} className="flex gap-1.5">
                <input value={pt} onChange={e => { const v = e.target.value; setPts(prev => prev.map((p, idx) => idx === i ? v : p)); }} className={`flex-1 ${inputCls}`} />
                {pts.length > 1 && (
                  <button onClick={() => removePt(i)} className="px-2 py-1 rounded-lg text-[10px] bg-[#FEE2E2] dark:bg-[#7F1D1D]/30 text-[#991B1B] dark:text-[#F87171]">✕</button>
                )}
              </div>
            ))}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-[#6B7280] dark:text-[#94A3B8] shrink-0">字号</span>
              <select value={ptSize} onChange={e => setPtSize(Number(e.target.value))} className={selectCls}>
                {PT_SIZES.map(s => <option key={s} value={s}>{s}px</option>)}
              </select>
              {pts.length < 6 && (
                <button onClick={addPt} className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-[#F3F4F6] dark:bg-[#334155] text-[#6B7280] dark:text-[#94A3B8] hover:bg-[#E5E7EB] dark:hover:bg-[#475569]">+ 添加</button>
              )}
            </div>
          </Sec>

          <Sec title="推广渠道">
            <select value={ch} onChange={e => setCh(e.target.value)} className={selectCls}>
              {CH_OPTS.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
            </select>
          </Sec>

          <Sec title="字体">
            <select value={font} onChange={e => setFont(e.target.value)} className={selectCls}>
              <optgroup label="中文">{zhF.map(f => <option key={f.family} value={f.family}>{f.label}</option>)}</optgroup>
              <optgroup label="英文">{enF.map(f => <option key={f.family} value={f.family}>{f.label}</option>)}</optgroup>
            </select>
          </Sec>
        </div>

        {/* Right: HTML poster preview */}
        <div className="flex-1 min-w-0">
          <div className="rounded-xl bg-[#F9FAFB] dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] p-4 flex items-center justify-center">
            <div
              ref={posterRef}
              style={{
                width: PREVIEW_W,
                height: PREVIEW_H,
                background: isGradient ? bgStyle : bgStyle,
                fontFamily: `"${font}", "Noto Sans SC", sans-serif`,
                borderRadius: 12,
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Shimmer overlay for dark themes */}
              {isDark && (
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: '25%',
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 100%)',
                  pointerEvents: 'none',
                }} />
              )}

              {/* Content area */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '30px 40px 0', position: 'relative', zIndex: 1 }}>
                {/* Logo */}
                <div style={{
                  fontSize: 15, fontWeight: 700, color: '#F59E0B',
                  marginBottom: 20,
                  textShadow: isDark ? '0 1px 3px rgba(0,0,0,0.4)' : 'none',
                }}>
                  🐨 Koala PhD 考拉博士
                </div>

                {/* Title */}
                <div style={{
                  fontSize: titleSize * 0.5,
                  fontWeight: 700,
                  color: titleColor,
                  lineHeight: 1.3,
                  marginBottom: 10,
                  whiteSpace: 'pre-line',
                  textShadow: isDark ? '0 2px 6px rgba(0,0,0,0.5)' : 'none',
                }}>
                  {titleTxt}
                </div>

                {/* Subtitle */}
                <div style={{
                  fontSize: subSize * 0.5,
                  color: fgSub,
                  marginBottom: 20,
                  textShadow: isDark ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
                }}>
                  {subTxt}
                </div>

                {/* Selling points */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                  {pts.map((pt, i) => (
                    <div key={i} style={{
                      fontSize: ptSize * 0.5,
                      color: fgPt,
                      display: 'flex', alignItems: 'center', gap: 6,
                      textShadow: isDark ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
                    }}>
                      <span style={{ color: '#22C55E', fontWeight: 700, fontSize: ptSize * 0.5 + 2 }}>✓</span>
                      {pt}
                    </div>
                  ))}
                </div>

                {/* QR section — flex-grow pushes it toward bottom */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 0 }}>
                  {qrDataUrl && (
                    <div style={{
                      background: '#FFFFFF', borderRadius: 12, padding: 12,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      lineHeight: 0,
                    }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrDataUrl} alt="QR" style={{ width: 120, height: 120, display: 'block' }} />
                    </div>
                  )}

                  <div style={{ fontSize: 12, color: fgSub, fontWeight: 500, marginTop: 4 }}>扫码注册</div>

                  <div style={{ fontSize: 13, fontWeight: 700, color: '#D4A843' }}>
                    邀请码: {referralCode}
                  </div>

                  <div style={{ fontSize: 9, color: fgSub, opacity: 0.6, textAlign: 'center' }}>
                    📷 请使用手机相机扫码（微信扫码可能无法登录）
                  </div>
                </div>
              </div>

              {/* Bottom bar — separated with divider */}
              <div style={{
                borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                padding: '10px 40px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                position: 'relative', zIndex: 1,
              }}>
                <div style={{ fontSize: 10, color: fgSub }}>koalaphd.com</div>
                <div style={{ fontSize: 10, color: fgSub }}>{CH_LABELS[ch] || ch}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between gap-3 rounded-xl p-3 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155]">
        <button onClick={resetAll} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-[#F3F4F6] dark:bg-[#334155] text-[#374151] dark:text-[#CBD5E1] hover:bg-[#E5E7EB] dark:hover:bg-[#475569] transition">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 8a6 6 0 0111.47-2.47M14 8a6 6 0 01-11.47 2.47" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><path d="M14 2v4h-4M2 14v-4h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          重置
        </button>
        <button onClick={exportPNG} disabled={exporting}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-medium bg-[#F59E0B] text-white hover:bg-[#D97706] transition shadow-sm disabled:opacity-50">
          {exporting ? (
            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2M8 2v9M5 8l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          )}
          下载 PNG (1080×1440)
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
