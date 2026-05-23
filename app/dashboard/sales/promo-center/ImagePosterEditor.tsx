'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, FabricImage, Textbox, Rect, Group, FabricObject, Gradient, Shadow } from 'fabric';
import QRCode from 'qrcode';
import { POSTER_FONTS, loadPosterFonts, DEFAULT_ZH_FONT } from './poster-fonts';

// ── Constants ─────────────────────────────────────────

interface ImageBgDef {
  id: string;
  src: string;
  label: string;
}

type TextColor = '#FFFFFF' | '#000000' | '#D4A843';

const IMAGE_BACKGROUNDS: ImageBgDef[] = [
  { id: '11', src: '/images/posters/11.png', label: '砂岩主楼' },
  { id: '22', src: '/images/posters/22.png', label: '蓝花楹校园' },
  { id: '33', src: '/images/posters/33.png', label: '林荫主楼' },
  { id: '44', src: '/images/posters/44.png', label: 'STEM大楼' },
  { id: '55', src: '/images/posters/55.png', label: '图书馆' },
  { id: '66', src: '/images/posters/66.png', label: '蓝花楹步道' },
];

const TEXT_COLORS: { value: TextColor; label: string }[] = [
  { value: '#FFFFFF', label: '白' },
  { value: '#000000', label: '黑' },
  { value: '#D4A843', label: '金' },
];

const LOGO_KEY = '__isLogo';
const BG_KEY = '__isBg';
const OVERLAY_KEY = '__isOverlay';
const QR_KEY = '__isQR';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function meta(obj: FabricObject): any { return obj as any; }

interface Props {
  referralCode: string;
  channel: string;
}

export default function ImagePosterEditor({ referralCode, channel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const [bgId, setBgId] = useState('11');
  const [canvasSize, setCanvasSize] = useState({ w: 1080, h: 1440 });
  const [selectedObj, setSelectedObj] = useState<FabricObject | null>(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [showUrl, setShowUrl] = useState(true);
  const [showChannel, setShowChannel] = useState(true);
  const [toolbarProps, setToolbarProps] = useState({
    fontFamily: DEFAULT_ZH_FONT,
    fontSize: 48,
    fill: '#FFFFFF' as string,
    fontWeight: 'bold' as string,
  });
  const initDone = useRef(false);

  useEffect(() => {
    loadPosterFonts().then(() => setFontsLoaded(true));
  }, []);

  useEffect(() => {
    if (!canvasRef.current || initDone.current || !fontsLoaded) return;
    initDone.current = true;

    const fc = new Canvas(canvasRef.current, {
      width: 1080, height: 1440,
      backgroundColor: '#0F1419',
      selection: true,
      preserveObjectStacking: true,
    });

    fc.on('selection:created', (e) => handleSelection(e.selected?.[0] ?? null));
    fc.on('selection:updated', (e) => handleSelection(e.selected?.[0] ?? null));
    fc.on('selection:cleared', () => handleSelection(null));

    // Clamp QR group to canvas bounds
    fc.on('object:moving', (e) => {
      const obj = e.target;
      if (!obj || !meta(obj)[QR_KEY]) return;
      const bound = obj.getBoundingRect();
      const cw = fc.getWidth();
      const ch = fc.getHeight();
      if (bound.left < 0) obj.set('left', (obj.left ?? 0) - bound.left);
      if (bound.top < 0) obj.set('top', (obj.top ?? 0) - bound.top);
      if (bound.left + bound.width > cw) obj.set('left', (obj.left ?? 0) - (bound.left + bound.width - cw));
      if (bound.top + bound.height > ch) obj.set('top', (obj.top ?? 0) - (bound.top + bound.height - ch));
    });

    fabricRef.current = fc;
    loadImageBackground(fc, '11', referralCode, channel);

    return () => { fc.dispose(); initDone.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontsLoaded]);

  function handleSelection(obj: FabricObject | null) {
    if (!obj || !(obj instanceof Textbox)) {
      setSelectedObj(obj instanceof Textbox ? obj : null);
      return;
    }
    setSelectedObj(obj);
    setToolbarProps({
      fontFamily: (obj.fontFamily as string) || DEFAULT_ZH_FONT,
      fontSize: obj.fontSize || 48,
      fill: (obj.fill as string) || '#FFFFFF',
      fontWeight: (obj.fontWeight as string) || 'normal',
    });
  }

  // ── Load image background at native size ───────────
  async function loadImageBackground(fc: Canvas, id: string, refCode: string, ch: string) {
    const bgDef = IMAGE_BACKGROUNDS.find(b => b.id === id);
    if (!bgDef) return;

    // Remove all objects
    fc.clear();

    try {
      const img = await FabricImage.fromURL(bgDef.src, { crossOrigin: 'anonymous' });
      const w = img.width || 1080;
      const h = img.height || 1440;

      fc.setDimensions({ width: w, height: h });
      setCanvasSize({ w, h });

      // Image at native size, no crop/scale/drag
      img.set({
        left: 0, top: 0, scaleX: 1, scaleY: 1,
        selectable: false, evented: false, hasControls: false, hasBorders: false,
      });
      meta(img)[BG_KEY] = true;
      fc.add(img);

      // Fog overlay
      const fog = new Rect({
        left: 0, top: 0, width: w, height: h,
        selectable: false, evented: false, hasControls: false, hasBorders: false,
        fill: '#0F1419', opacity: 0.50,
      });
      meta(fog)[OVERLAY_KEY] = true;
      fc.add(fog);

      // Top scrim
      const topScrim = new Rect({
        left: 0, top: 0, width: w, height: h * 0.45,
        selectable: false, evented: false, hasControls: false, hasBorders: false,
        fill: new Gradient({
          type: 'linear',
          coords: { x1: 0, y1: 0, x2: 0, y2: h * 0.45 },
          colorStops: [
            { offset: 0, color: 'rgba(15,20,25,0.55)' },
            { offset: 0.6, color: 'rgba(15,20,25,0.15)' },
            { offset: 1, color: 'rgba(15,20,25,0)' },
          ],
        }),
      });
      meta(topScrim)[OVERLAY_KEY] = true;
      fc.add(topScrim);

      // Bottom scrim
      const bottomScrim = new Rect({
        left: 0, top: h * 0.55, width: w, height: h * 0.45,
        selectable: false, evented: false, hasControls: false, hasBorders: false,
        fill: new Gradient({
          type: 'linear',
          coords: { x1: 0, y1: 0, x2: 0, y2: h * 0.45 },
          colorStops: [
            { offset: 0, color: 'rgba(15,20,25,0)' },
            { offset: 0.5, color: 'rgba(15,20,25,0.40)' },
            { offset: 1, color: 'rgba(15,20,25,0.55)' },
          ],
        }),
      });
      meta(bottomScrim)[OVERLAY_KEY] = true;
      fc.add(bottomScrim);

      // Preset elements
      await addPresetElements(fc, w, h, refCode, ch);
      fc.requestRenderAll();
    } catch (e) {
      console.error('Failed to load image background', e);
    }
  }

  // ── Preset text elements ────────────────────────────
  async function addPresetElements(fc: Canvas, w: number, h: number, refCode: string, ch: string) {
    const font = DEFAULT_ZH_FONT;
    const pad = Math.round(w * 0.04);

    // Logo (locked)
    const logo = new Textbox('🐨 Koala PhD', {
      left: pad, top: pad, fontSize: Math.round(w * 0.03),
      fontFamily: font, fontWeight: 'bold', fill: '#FFFFFF', width: w * 0.35,
      editable: false, selectable: false, evented: false,
      shadow: new Shadow({ color: 'rgba(0,0,0,0.6)', blur: 4, offsetX: 1, offsetY: 1 }),
    });
    meta(logo)[LOGO_KEY] = true;
    fc.add(logo);

    // Headline
    fc.add(new Textbox('用AI找到你的理想PhD导师', {
      left: pad, top: h * 0.08, fontSize: Math.round(w * 0.045),
      fontFamily: font, fontWeight: 'bold', fill: '#FFFFFF', width: w - pad * 2, lineHeight: 1.3,
      shadow: new Shadow({ color: 'rgba(0,0,0,0.7)', blur: 8, offsetX: 1, offsetY: 2 }),
    }));

    // Subtitle
    fc.add(new Textbox('覆盖澳洲38所大学、24,000+位教授', {
      left: pad, top: h * 0.15, fontSize: Math.round(w * 0.022),
      fontFamily: font, fontWeight: 'normal', fill: '#FFFFFF', width: w - pad * 2,
      shadow: new Shadow({ color: 'rgba(0,0,0,0.6)', blur: 4, offsetX: 1, offsetY: 1 }),
    }));

    // Selling points
    const pts = [
      '✦ AI智能匹配，精准推荐导师',
      '✦ 一键生成个性化套磁信',
      '✦ 覆盖全部澳洲八大名校',
      '✦ 科研方向深度分析报告',
    ];
    const ptFontSize = Math.round(w * 0.02);
    const ptSpacing = Math.round(ptFontSize * 2.2);
    pts.forEach((text, i) => {
      fc.add(new Textbox(text, {
        left: pad + 20, top: h * 0.62 + i * ptSpacing, fontSize: ptFontSize,
        fontFamily: font, fontWeight: 'normal', fill: '#FFFFFF', width: w - pad * 2 - 40,
        shadow: new Shadow({ color: 'rgba(0,0,0,0.7)', blur: 4, offsetX: 1, offsetY: 1 }),
      }));
    });

    // Slogan
    fc.add(new Textbox('Koala — 陪你从申请到毕业，每一步都在', {
      left: pad, top: h - h * 0.11, fontSize: Math.round(w * 0.019),
      fontFamily: font, fontWeight: 'normal', fill: '#D4A843', width: w * 0.55,
      shadow: new Shadow({ color: 'rgba(0,0,0,0.6)', blur: 4, offsetX: 1, offsetY: 1 }),
    }));

    // URL text
    fc.add(new Textbox('www.koalaphd.com  ·  info@koalastudy.net', {
      left: pad, top: h - h * 0.06, fontSize: Math.round(w * 0.016),
      fontFamily: font, fontWeight: 'normal', fill: 'rgba(255,255,255,0.7)', width: w * 0.55,
      shadow: new Shadow({ color: 'rgba(0,0,0,0.4)', blur: 3, offsetX: 1, offsetY: 1 }),
    }));

    // QR code — bottom-right
    await addQRCode(fc, w, h, refCode, ch);
  }

  async function addQRCode(fc: Canvas, w: number, h: number, refCode: string, ch: string) {
    const url = `https://koalaphd.com/koala/auth?ref=${refCode}&ch=${ch}`;
    try {
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 360, margin: 2,
        color: { dark: '#1a2332', light: '#FFFFFF' },
      });
      const qrImg = await FabricImage.fromURL(qrDataUrl);
      const qrSize = Math.round(w * 0.16);
      qrImg.set({
        left: w - qrSize - w * 0.05, top: h - qrSize - h * 0.12,
        scaleX: qrSize / (qrImg.width || qrSize),
        scaleY: qrSize / (qrImg.height || qrSize),
        shadow: new Shadow({ color: 'rgba(0,0,0,0.3)', blur: 8, offsetX: 2, offsetY: 2 }),
      });
      meta(qrImg)[QR_KEY] = true;

      const pad = Math.round(qrSize * 0.07);
      const qrBg = new Rect({
        left: w - qrSize - w * 0.05 - pad,
        top: h - qrSize - h * 0.12 - pad,
        width: qrSize + pad * 2, height: qrSize + pad * 2,
        fill: '#FFFFFF', rx: 12, ry: 12,
        shadow: new Shadow({ color: 'rgba(0,0,0,0.2)', blur: 10, offsetX: 2, offsetY: 2 }),
      });
      meta(qrBg)[QR_KEY] = true;

      const qrLabel = new Textbox('扫码了解更多', {
        left: w - qrSize - w * 0.05 - pad,
        top: h - h * 0.12 + pad + 4,
        fontSize: Math.round(w * 0.013), fontFamily: DEFAULT_ZH_FONT,
        fill: 'rgba(255,255,255,0.7)', width: qrSize + pad * 2,
        textAlign: 'center', editable: false,
        shadow: new Shadow({ color: 'rgba(0,0,0,0.5)', blur: 3, offsetX: 1, offsetY: 1 }),
      });
      meta(qrLabel)[QR_KEY] = true;

      const qrGroup = new Group([qrBg, qrImg, qrLabel], {
        left: w - qrSize - w * 0.05 - pad,
        top: h - qrSize - h * 0.12 - pad,
      });
      meta(qrGroup)[QR_KEY] = true;
      fc.add(qrGroup);
    } catch (e) {
      console.error('QR generation failed', e);
    }
  }

  // ── Actions ─────────────────────────────────────────
  const switchImage = useCallback(async (id: string) => {
    setBgId(id);
    const fc = fabricRef.current;
    if (!fc) return;
    await loadImageBackground(fc, id, referralCode, channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referralCode, channel]);

  function addText() {
    const fc = fabricRef.current;
    if (!fc) return;
    const { w, h } = canvasSize;
    fc.add(new Textbox('双击编辑文字', {
      left: w / 2 - 150, top: h / 2 - 30, fontSize: 28,
      fontFamily: DEFAULT_ZH_FONT, fontWeight: 'normal', fill: '#FFFFFF', width: 300,
      shadow: new Shadow({ color: 'rgba(0,0,0,0.5)', blur: 4, offsetX: 1, offsetY: 1 }),
    }));
    fc.requestRenderAll();
  }

  async function refreshQR() {
    const fc = fabricRef.current;
    if (!fc) return;
    fc.getObjects().filter(o => meta(o)[QR_KEY]).forEach(o => fc.remove(o));
    await addQRCode(fc, canvasSize.w, canvasSize.h, referralCode, channel);
    fc.requestRenderAll();
  }

  function updateSelectedText(prop: string, value: unknown) {
    if (!selectedObj || !(selectedObj instanceof Textbox)) return;
    selectedObj.set(prop as keyof Textbox, value);
    fabricRef.current?.requestRenderAll();
    setToolbarProps(prev => ({ ...prev, [prop]: value }));
  }

  function deleteSelected() {
    const fc = fabricRef.current;
    if (!fc || !selectedObj) return;
    if (meta(selectedObj)[LOGO_KEY]) return;
    fc.remove(selectedObj);
    setSelectedObj(null);
    fc.requestRenderAll();
  }

  function exportPNG() {
    const fc = fabricRef.current;
    if (!fc) return;
    fc.discardActiveObject();
    fc.requestRenderAll();
    const { w } = canvasSize;
    const multiplier = Math.max(1, 1080 / w);
    const dataUrl = fc.toDataURL({ format: 'png', quality: 1, multiplier });
    const link = document.createElement('a');
    link.download = `koala-poster-img-${bgId}-${referralCode}.png`;
    link.href = dataUrl;
    link.click();
  }

  // ── Render ──────────────────────────────────────────
  if (!fontsLoaded) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-sm text-[#6B7280] dark:text-[#94A3B8]">
        <span className="w-4 h-4 border-2 border-[#F59E0B] border-t-transparent rounded-full animate-spin" />
        字体加载中…
      </div>
    );
  }

  const zhFonts = POSTER_FONTS.filter(f => f.category === 'zh');
  const enFonts = POSTER_FONTS.filter(f => f.category === 'en');

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left panel */}
        <div className="w-full lg:w-[280px] shrink-0 space-y-4">
          {/* Image selector */}
          <div className="rounded-xl p-4 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155]">
            <div className="text-xs font-medium text-[#374151] dark:text-[#CBD5E1] mb-3">图片背景</div>
            <div className="grid grid-cols-3 gap-2">
              {IMAGE_BACKGROUNDS.map(bg => (
                <button
                  key={bg.id}
                  onClick={() => switchImage(bg.id)}
                  className={`relative rounded-lg overflow-hidden aspect-[3/4] transition-all ${
                    bgId === bg.id
                      ? 'ring-2 ring-[#F59E0B] ring-offset-1 ring-offset-white dark:ring-offset-[#1E293B]'
                      : 'hover:ring-1 hover:ring-[#D1D5DB] dark:hover:ring-[#475569]'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={bg.src} alt={bg.label} className="w-full h-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1">
                    <span className="text-[9px] text-white leading-tight block text-center">{bg.label}</span>
                  </div>
                  {bgId === bg.id && (
                    <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#F59E0B] flex items-center justify-center">
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M3 8l3 3 7-7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Add elements */}
          <div className="rounded-xl p-4 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155]">
            <div className="text-xs font-medium text-[#374151] dark:text-[#CBD5E1] mb-3">添加元素</div>
            <div className="flex gap-2">
              <button onClick={addText}
                className="flex-1 py-2.5 rounded-lg text-xs font-medium bg-[#F3F4F6] dark:bg-[#334155] text-[#374151] dark:text-[#CBD5E1] hover:bg-[#E5E7EB] dark:hover:bg-[#475569] transition flex items-center justify-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 3v3M13 3v3M3 3h10M8 3v10M6 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                + 文字
              </button>
              <button onClick={refreshQR}
                className="flex-1 py-2.5 rounded-lg text-xs font-medium bg-[#F3F4F6] dark:bg-[#334155] text-[#374151] dark:text-[#CBD5E1] hover:bg-[#E5E7EB] dark:hover:bg-[#475569] transition flex items-center justify-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="10" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="1" y="10" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="11" y="11" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.5"/></svg>
                + QR码
              </button>
            </div>
          </div>

          {/* Toggle controls */}
          <div className="rounded-xl p-4 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] space-y-2">
            <div className="text-xs font-medium text-[#374151] dark:text-[#CBD5E1] mb-1">显示开关</div>
            <label className="flex items-center gap-2 text-[11px] text-[#374151] dark:text-[#CBD5E1] cursor-pointer">
              <input type="checkbox" checked={showUrl} onChange={() => setShowUrl(v => !v)}
                className="rounded border-[#D1D5DB] text-[#F59E0B] focus:ring-[#F59E0B]" />
              网址文字
            </label>
            <label className="flex items-center gap-2 text-[11px] text-[#374151] dark:text-[#CBD5E1] cursor-pointer">
              <input type="checkbox" checked={showChannel} onChange={() => setShowChannel(v => !v)}
                className="rounded border-[#D1D5DB] text-[#F59E0B] focus:ring-[#F59E0B]" />
              渠道标识
            </label>
          </div>

          {/* Text toolbar */}
          {selectedObj && selectedObj instanceof Textbox && (
            <div className="rounded-xl p-4 bg-white dark:bg-[#1E293B] border border-[#F59E0B]/40 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-[#374151] dark:text-[#CBD5E1]">文字编辑</div>
                <button onClick={deleteSelected} className="text-[10px] px-2 py-1 rounded bg-[#FEE2E2] dark:bg-[#7F1D1D]/30 text-[#991B1B] dark:text-[#F87171] hover:bg-[#FECACA] dark:hover:bg-[#7F1D1D]/50 transition">
                  删除
                </button>
              </div>

              <div>
                <label className="text-[10px] text-[#6B7280] dark:text-[#94A3B8] block mb-1">字体</label>
                <select value={toolbarProps.fontFamily}
                  onChange={e => updateSelectedText('fontFamily', e.target.value)}
                  className="w-full rounded-lg px-2 py-1.5 text-xs bg-[#F9FAFB] dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] text-[#111827] dark:text-[#F1F5F9]">
                  <optgroup label="中文">
                    {zhFonts.map(f => <option key={f.family} value={f.family}>{f.label}</option>)}
                  </optgroup>
                  <optgroup label="英文">
                    {enFonts.map(f => <option key={f.family} value={f.family}>{f.label}</option>)}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-[#6B7280] dark:text-[#94A3B8] flex justify-between mb-1">
                  <span>字号</span>
                  <span className="font-mono">{toolbarProps.fontSize}px</span>
                </label>
                <input type="range" min={12} max={72} value={toolbarProps.fontSize}
                  onChange={e => updateSelectedText('fontSize', Number(e.target.value))}
                  className="w-full accent-[#F59E0B]" />
              </div>

              <div>
                <label className="text-[10px] text-[#6B7280] dark:text-[#94A3B8] block mb-1">颜色</label>
                <div className="flex gap-1.5">
                  {TEXT_COLORS.map(c => (
                    <button key={c.value} onClick={() => updateSelectedText('fill', c.value)}
                      className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition flex items-center justify-center gap-1 ${
                        toolbarProps.fill === c.value ? 'ring-2 ring-[#F59E0B] ring-offset-1 ring-offset-white dark:ring-offset-[#1E293B]' : ''
                      }`}
                      style={{
                        background: c.value === '#FFFFFF' ? '#F3F4F6' : c.value === '#000000' ? '#1E293B' : '#D4A843',
                        color: c.value === '#FFFFFF' ? '#374151' : '#FFFFFF',
                      }}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[#6B7280] dark:text-[#94A3B8] block mb-1">样式</label>
                <button
                  onClick={() => updateSelectedText('fontWeight', toolbarProps.fontWeight === 'bold' ? 'normal' : 'bold')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                    toolbarProps.fontWeight === 'bold'
                      ? 'bg-[#111827] dark:bg-[#F1F5F9] text-white dark:text-[#0F172A]'
                      : 'bg-[#F3F4F6] dark:bg-[#334155] text-[#6B7280] dark:text-[#94A3B8]'
                  }`}>
                  B
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Canvas */}
        <div className="flex-1 min-w-0">
          <div className="rounded-xl bg-[#F9FAFB] dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] p-4 flex items-center justify-center overflow-hidden">
            <div style={{ width: '100%', maxWidth: 540, aspectRatio: `${canvasSize.w}/${canvasSize.h}`, position: 'relative' }}>
              <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', borderRadius: 8 }} />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between gap-3 rounded-xl p-3 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155]">
        <div className="text-[11px] text-[#6B7280] dark:text-[#94A3B8]">
          尺寸由图片决定 · {canvasSize.w} × {canvasSize.h}px
        </div>
        <button onClick={exportPNG}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-medium bg-[#F59E0B] text-white hover:bg-[#D97706] transition shadow-sm">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2M8 2v9M5 8l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          下载 PNG
        </button>
      </div>
    </div>
  );
}
