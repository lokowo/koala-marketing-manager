'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, FabricImage, Textbox, Rect, Group, FabricObject, Gradient, Shadow } from 'fabric';
import QRCode from 'qrcode';

// ── Types ─────────────────────────────────────────────

interface ImageBgDef {
  kind: 'image';
  id: string;
  src: string;
  label: string;
}

interface GradientBgDef {
  kind: 'gradient';
  id: string;
  label: string;
  colors: string[];
}

type BgDef = ImageBgDef | GradientBgDef;

type PosterSize = '3:4' | '1:1' | '9:16';
type TextColor = '#FFFFFF' | '#000000' | '#D4A843';

const GRADIENT_BACKGROUNDS: GradientBgDef[] = [
  { kind: 'gradient', id: 'g-minimal',  label: '简约', colors: ['#FFFFFF'] },
  { kind: 'gradient', id: 'g-academic', label: '学术', colors: ['#0F172A'] },
  { kind: 'gradient', id: 'g-vibrant',  label: '活力', colors: ['#F59E0B', '#EC4899'] },
];

const IMAGE_BACKGROUNDS: ImageBgDef[] = [
  { kind: 'image', id: '11', src: '/images/posters/11.png', label: '砂岩主楼' },
  { kind: 'image', id: '22', src: '/images/posters/22.png', label: '蓝花楹校园' },
  { kind: 'image', id: '33', src: '/images/posters/33.png', label: '林荫主楼' },
  { kind: 'image', id: '44', src: '/images/posters/44.png', label: 'STEM大楼' },
  { kind: 'image', id: '55', src: '/images/posters/55.png', label: '图书馆' },
  { kind: 'image', id: '66', src: '/images/posters/66.png', label: '蓝花楹步道' },
];

const ALL_BACKGROUNDS: BgDef[] = [...GRADIENT_BACKGROUNDS, ...IMAGE_BACKGROUNDS];

const SIZE_CONFIGS: Record<PosterSize, { w: number; h: number; label: string }> = {
  '3:4': { w: 1080, h: 1440, label: '3:4 社交媒体' },
  '1:1': { w: 1080, h: 1080, label: '1:1 方形' },
  '9:16': { w: 1080, h: 1920, label: '9:16 竖屏' },
};

const TEXT_COLORS: { value: TextColor; label: string }[] = [
  { value: '#FFFFFF', label: '白' },
  { value: '#000000', label: '黑' },
  { value: '#D4A843', label: '金' },
];

const FONT_OPTIONS = [
  'system-ui, sans-serif',
  'Georgia, serif',
  'Noto Serif SC, serif',
  'monospace',
];

const FONT_LABELS: Record<string, string> = {
  'system-ui, sans-serif': '默认',
  'Georgia, serif': 'Georgia',
  'Noto Serif SC, serif': '宋体',
  'monospace': '等宽',
};

// Custom property keys we use
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

export default function FabricPosterEditor({ referralCode, channel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const [bgId, setBgId] = useState('g-minimal');
  const [size, setSize] = useState<PosterSize>('3:4');
  const [selectedObj, setSelectedObj] = useState<FabricObject | null>(null);
  const [toolbarProps, setToolbarProps] = useState({
    fontFamily: 'system-ui, sans-serif',
    fontSize: 48,
    fill: '#FFFFFF' as string,
    fontWeight: 'bold' as string,
  });
  const initDone = useRef(false);

  // ── Canvas init ─────────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current || initDone.current) return;
    initDone.current = true;

    const { w, h } = SIZE_CONFIGS[size];
    const fc = new Canvas(canvasRef.current, {
      width: w,
      height: h,
      backgroundColor: '#1a1a2e',
      selection: true,
      preserveObjectStacking: true,
    });

    fc.on('selection:created', (e) => handleSelection(e.selected?.[0] ?? null));
    fc.on('selection:updated', (e) => handleSelection(e.selected?.[0] ?? null));
    fc.on('selection:cleared', () => handleSelection(null));

    fabricRef.current = fc;
    loadBackground(fc, 'g-minimal', size).then(() => addPresetElements(fc, size, referralCode, channel));

    return () => { fc.dispose(); initDone.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSelection(obj: FabricObject | null) {
    if (!obj || !(obj instanceof Textbox)) {
      setSelectedObj(null);
      return;
    }
    setSelectedObj(obj);
    setToolbarProps({
      fontFamily: (obj.fontFamily as string) || 'system-ui, sans-serif',
      fontSize: obj.fontSize || 48,
      fill: (obj.fill as string) || '#FFFFFF',
      fontWeight: (obj.fontWeight as string) || 'normal',
    });
  }

  // ── Load background + overlay ───────────────────────
  async function loadBackground(fc: Canvas, id: string, sz: PosterSize) {
    const { w, h } = SIZE_CONFIGS[sz];
    const objs = fc.getObjects();
    for (const o of objs) {
      if (meta(o)[BG_KEY] || meta(o)[OVERLAY_KEY]) {
        fc.remove(o);
      }
    }

    const bgDef = ALL_BACKGROUNDS.find(b => b.id === id);
    if (!bgDef) return;

    try {
      if (bgDef.kind === 'gradient') {
        const bgRect = new Rect({
          left: 0, top: 0, width: w, height: h,
          selectable: false, evented: false, hasControls: false, hasBorders: false,
          fill: bgDef.colors.length > 1
            ? new Gradient({
                type: 'linear',
                coords: { x1: 0, y1: 0, x2: w, y2: h },
                colorStops: bgDef.colors.map((c, i) => ({
                  offset: i / (bgDef.colors.length - 1),
                  color: c,
                })),
              })
            : bgDef.colors[0],
        });
        meta(bgRect)[BG_KEY] = true;
        fc.insertAt(0, bgRect);
      } else {
        const img = await FabricImage.fromURL(bgDef.src, { crossOrigin: 'anonymous' });
        const scaleX = w / (img.width || w);
        const scaleY = h / (img.height || h);
        const scale = Math.max(scaleX, scaleY);
        img.set({
          scaleX: scale, scaleY: scale,
          left: (w - (img.width || w) * scale) / 2,
          top: (h - (img.height || h) * scale) / 2,
          selectable: false, evented: false, hasControls: false, hasBorders: false,
        });
        meta(img)[BG_KEY] = true;
        fc.insertAt(0, img);

        // Layer 1: brand-color tinted fog (#0F1419, 50% opacity)
        let insertIdx = 1;
        const fog = new Rect({
          left: 0, top: 0, width: w, height: h,
          selectable: false, evented: false, hasControls: false, hasBorders: false,
          fill: '#0F1419', opacity: 0.50,
        });
        meta(fog)[OVERLAY_KEY] = true;
        fc.insertAt(insertIdx++, fog);

        // Layer 2: top scrim — darker at top, transparent at ~40%
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
        fc.insertAt(insertIdx++, topScrim);

        // Layer 3: bottom scrim — transparent at ~60%, darker at bottom
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
        fc.insertAt(insertIdx, bottomScrim);
      }

      fc.requestRenderAll();
    } catch (e) {
      console.error('Failed to load background', e);
    }
  }

  // ── Preset elements ─────────────────────────────────
  async function addPresetElements(fc: Canvas, sz: PosterSize, refCode: string, ch: string) {
    const { w, h } = SIZE_CONFIGS[sz];

    // Logo text (locked)
    const logo = new Textbox('🐨 Koala PhD', {
      left: 40,
      top: 30,
      fontSize: 32,
      fontFamily: 'system-ui, sans-serif',
      fontWeight: 'bold',
      fill: '#FFFFFF',
      width: 300,
      editable: false,
      selectable: false,
      evented: false,
      shadow: new Shadow({ color: 'rgba(0,0,0,0.5)', blur: 4, offsetX: 1, offsetY: 1 }),
    });
    meta(logo)[LOGO_KEY] = true;
    fc.add(logo);

    // Main headline
    const headline = new Textbox('用AI找到你的理想PhD导师', {
      left: 40,
      top: h * 0.06 + 40,
      fontSize: 48,
      fontFamily: 'system-ui, sans-serif',
      fontWeight: 'bold',
      fill: '#FFFFFF',
      width: w - 80,
      lineHeight: 1.3,
      shadow: new Shadow({ color: 'rgba(0,0,0,0.6)', blur: 6, offsetX: 1, offsetY: 2 }),
    });
    fc.add(headline);

    // Subtitle
    const subtitle = new Textbox('覆盖澳洲38所大学、24,000+位教授', {
      left: 40,
      top: h * 0.06 + 130,
      fontSize: 24,
      fontFamily: 'system-ui, sans-serif',
      fontWeight: 'normal',
      fill: '#FFFFFF',
      width: w - 80,
      shadow: new Shadow({ color: 'rgba(0,0,0,0.5)', blur: 4, offsetX: 1, offsetY: 1 }),
    });
    fc.add(subtitle);

    // 4 selling points
    const points = [
      '✦ AI智能匹配，精准推荐导师',
      '✦ 一键生成个性化套磁信',
      '✦ 覆盖全部澳洲八大名校',
      '✦ 科研方向深度分析报告',
    ];
    points.forEach((text, i) => {
      const pt = new Textbox(text, {
        left: 60,
        top: h * 0.60 + i * 50,
        fontSize: 22,
        fontFamily: 'system-ui, sans-serif',
        fontWeight: 'normal',
        fill: '#FFFFFF',
        width: w - 120,
        shadow: new Shadow({ color: 'rgba(0,0,0,0.6)', blur: 4, offsetX: 1, offsetY: 1 }),
      });
      fc.add(pt);
    });

    // Bottom slogan
    const slogan = new Textbox('Koala — 陪你从申请到毕业，每一步都在', {
      left: 40,
      top: h - 160,
      fontSize: 20,
      fontFamily: 'system-ui, sans-serif',
      fontWeight: 'normal',
      fill: '#D4A843',
      width: w - 80,
      shadow: new Shadow({ color: 'rgba(0,0,0,0.5)', blur: 4, offsetX: 1, offsetY: 1 }),
    });
    fc.add(slogan);

    // Website + email
    const contact = new Textbox('www.koalaphd.com  ·  info@koalastudy.net', {
      left: 40,
      top: h - 110,
      fontSize: 18,
      fontFamily: 'system-ui, sans-serif',
      fontWeight: 'normal',
      fill: 'rgba(255,255,255,0.8)',
      width: w - 80,
      shadow: new Shadow({ color: 'rgba(0,0,0,0.4)', blur: 3, offsetX: 1, offsetY: 1 }),
    });
    fc.add(contact);

    // QR code
    await addQRCode(fc, refCode, ch, sz);

    fc.requestRenderAll();
  }

  // ── QR Code ─────────────────────────────────────────
  async function addQRCode(fc: Canvas, refCode: string, ch: string, sz: PosterSize) {
    const { w, h } = SIZE_CONFIGS[sz];
    const url = `https://koalaphd.com/koala/auth?ref=${refCode}&ch=${ch}`;
    try {
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 360,
        margin: 2,
        color: { dark: '#1a2332', light: '#FFFFFF' },
      });
      const qrImg = await FabricImage.fromURL(qrDataUrl);
      const qrSize = 180;
      qrImg.set({
        left: w - qrSize - 50,
        top: h - qrSize - 140,
        scaleX: qrSize / (qrImg.width || qrSize),
        scaleY: qrSize / (qrImg.height || qrSize),
        shadow: new Shadow({ color: 'rgba(0,0,0,0.3)', blur: 8, offsetX: 2, offsetY: 2 }),
      });
      meta(qrImg)[QR_KEY] = true;

      // White background pad for QR
      const pad = 12;
      const qrBg = new Rect({
        left: w - qrSize - 50 - pad,
        top: h - qrSize - 140 - pad,
        width: qrSize + pad * 2,
        height: qrSize + pad * 2,
        fill: '#FFFFFF',
        rx: 12,
        ry: 12,
        shadow: new Shadow({ color: 'rgba(0,0,0,0.2)', blur: 10, offsetX: 2, offsetY: 2 }),
      });
      meta(qrBg)[QR_KEY] = true;

      const qrLabel = new Textbox('扫码了解更多', {
        left: w - qrSize - 50 - pad,
        top: h - 140 + pad + 4,
        fontSize: 14,
        fontFamily: 'system-ui, sans-serif',
        fill: 'rgba(255,255,255,0.7)',
        width: qrSize + pad * 2,
        textAlign: 'center',
        editable: false,
        shadow: new Shadow({ color: 'rgba(0,0,0,0.4)', blur: 3, offsetX: 1, offsetY: 1 }),
      });
      meta(qrLabel)[QR_KEY] = true;

      const qrGroup = new Group([qrBg, qrImg, qrLabel], {
        left: w - qrSize - 50 - pad,
        top: h - qrSize - 140 - pad,
      });
      meta(qrGroup)[QR_KEY] = true;
      fc.add(qrGroup);
    } catch (e) {
      console.error('QR generation failed', e);
    }
  }

  // ── Switch background ───────────────────────────────
  const switchBackground = useCallback(async (id: string) => {
    setBgId(id);
    const fc = fabricRef.current;
    if (!fc) return;
    await loadBackground(fc, id, size);
    fc.requestRenderAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  // ── Switch size ─────────────────────────────────────
  const switchSize = useCallback(async (newSize: PosterSize) => {
    const fc = fabricRef.current;
    if (!fc) return;
    setSize(newSize);
    const { w, h } = SIZE_CONFIGS[newSize];
    fc.setDimensions({ width: w, height: h });
    await loadBackground(fc, bgId, newSize);
    fc.requestRenderAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bgId]);

  // ── Add text element ────────────────────────────────
  function addText() {
    const fc = fabricRef.current;
    if (!fc) return;
    const { w, h } = SIZE_CONFIGS[size];
    const tb = new Textbox('双击编辑文字', {
      left: w / 2 - 150,
      top: h / 2 - 30,
      fontSize: 28,
      fontFamily: 'system-ui, sans-serif',
      fontWeight: 'normal',
      fill: '#FFFFFF',
      width: 300,
      shadow: new Shadow({ color: 'rgba(0,0,0,0.5)', blur: 4, offsetX: 1, offsetY: 1 }),
    });
    fc.add(tb);
    fc.setActiveObject(tb);
    fc.requestRenderAll();
  }

  // ── Add QR element ──────────────────────────────────
  async function addQR() {
    const fc = fabricRef.current;
    if (!fc) return;
    // Remove existing QR
    const toRemove = fc.getObjects().filter(o => meta(o)[QR_KEY]);
    toRemove.forEach(o => fc.remove(o));
    await addQRCode(fc, referralCode, channel, size);
    fc.requestRenderAll();
  }

  // ── Toolbar actions ─────────────────────────────────
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

  // ── Export ──────────────────────────────────────────
  function exportPNG() {
    const fc = fabricRef.current;
    if (!fc) return;
    fc.discardActiveObject();
    fc.requestRenderAll();
    const { w } = SIZE_CONFIGS[size];
    const multiplier = Math.max(1, 1080 / w);
    const dataUrl = fc.toDataURL({ format: 'png', quality: 1, multiplier });
    const link = document.createElement('a');
    link.download = `koala-poster-${bgId}-${referralCode}.png`;
    link.href = dataUrl;
    link.click();
  }

  // ── Render ──────────────────────────────────────────
  const { w: canvasW, h: canvasH } = SIZE_CONFIGS[size];

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left panel */}
        <div className="w-full lg:w-[280px] shrink-0 space-y-4">
          {/* Background selector */}
          <div className="rounded-xl p-4 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] space-y-3">
            {/* Gradient themes */}
            <div>
              <div className="text-[10px] font-medium text-[#6B7280] dark:text-[#94A3B8] mb-2">渐变主题</div>
              <div className="flex flex-wrap gap-2">
                {GRADIENT_BACKGROUNDS.map(bg => (
                  <button
                    key={bg.id}
                    onClick={() => switchBackground(bg.id)}
                    className={`relative rounded-lg overflow-hidden w-[72px] aspect-[3/4] transition-all ${
                      bgId === bg.id
                        ? 'ring-2 ring-[#F59E0B] ring-offset-1 ring-offset-white dark:ring-offset-[#1E293B]'
                        : 'hover:ring-1 hover:ring-[#D1D5DB] dark:hover:ring-[#475569]'
                    }`}
                  >
                    <div
                      className="absolute inset-0"
                      style={bg.colors.length > 1
                        ? { background: `linear-gradient(135deg, ${bg.colors[0]}, ${bg.colors[1]})` }
                        : { background: bg.colors[0] }
                      }
                    />
                    {bg.colors[0] === '#FFFFFF' && (
                      <div className="absolute inset-0 border border-[#E5E7EB] dark:border-[#475569] rounded-lg" />
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent p-1">
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

            <div className="border-t border-[#E5E7EB] dark:border-[#334155]" />

            {/* Image backgrounds */}
            <div>
              <div className="text-[10px] font-medium text-[#6B7280] dark:text-[#94A3B8] mb-2">图片背景</div>
              <div className="flex flex-wrap gap-2">
                {IMAGE_BACKGROUNDS.map(bg => (
                  <button
                    key={bg.id}
                    onClick={() => switchBackground(bg.id)}
                    className={`relative rounded-lg overflow-hidden w-[72px] aspect-[3/4] transition-all ${
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
          </div>

          {/* Add elements */}
          <div className="rounded-xl p-4 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155]">
            <div className="text-xs font-medium text-[#374151] dark:text-[#CBD5E1] mb-3">添加元素</div>
            <div className="flex gap-2">
              <button
                onClick={addText}
                className="flex-1 py-2.5 rounded-lg text-xs font-medium bg-[#F3F4F6] dark:bg-[#334155] text-[#374151] dark:text-[#CBD5E1] hover:bg-[#E5E7EB] dark:hover:bg-[#475569] transition flex items-center justify-center gap-1.5"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 3v3M13 3v3M3 3h10M8 3v10M6 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                + 文字
              </button>
              <button
                onClick={addQR}
                className="flex-1 py-2.5 rounded-lg text-xs font-medium bg-[#F3F4F6] dark:bg-[#334155] text-[#374151] dark:text-[#CBD5E1] hover:bg-[#E5E7EB] dark:hover:bg-[#475569] transition flex items-center justify-center gap-1.5"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="10" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="1" y="10" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="11" y="11" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.5"/></svg>
                + QR码
              </button>
            </div>
          </div>

          {/* Text toolbar (when text selected) */}
          {selectedObj && selectedObj instanceof Textbox && (
            <div className="rounded-xl p-4 bg-white dark:bg-[#1E293B] border border-[#F59E0B]/40 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-[#374151] dark:text-[#CBD5E1]">文字编辑</div>
                <button
                  onClick={deleteSelected}
                  className="text-[10px] px-2 py-1 rounded bg-[#FEE2E2] dark:bg-[#7F1D1D]/30 text-[#991B1B] dark:text-[#F87171] hover:bg-[#FECACA] dark:hover:bg-[#7F1D1D]/50 transition"
                >
                  删除
                </button>
              </div>

              {/* Font family */}
              <div>
                <label className="text-[10px] text-[#6B7280] dark:text-[#94A3B8] block mb-1">字体</label>
                <select
                  value={toolbarProps.fontFamily}
                  onChange={e => updateSelectedText('fontFamily', e.target.value)}
                  className="w-full rounded-lg px-2 py-1.5 text-xs bg-[#F9FAFB] dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] text-[#111827] dark:text-[#F1F5F9]"
                >
                  {FONT_OPTIONS.map(f => (
                    <option key={f} value={f}>{FONT_LABELS[f] || f}</option>
                  ))}
                </select>
              </div>

              {/* Font size slider */}
              <div>
                <label className="text-[10px] text-[#6B7280] dark:text-[#94A3B8] flex justify-between mb-1">
                  <span>字号</span>
                  <span className="font-mono">{toolbarProps.fontSize}px</span>
                </label>
                <input
                  type="range"
                  min={12}
                  max={72}
                  value={toolbarProps.fontSize}
                  onChange={e => updateSelectedText('fontSize', Number(e.target.value))}
                  className="w-full accent-[#F59E0B]"
                />
              </div>

              {/* Color picker */}
              <div>
                <label className="text-[10px] text-[#6B7280] dark:text-[#94A3B8] block mb-1">颜色</label>
                <div className="flex gap-1.5">
                  {TEXT_COLORS.map(c => (
                    <button
                      key={c.value}
                      onClick={() => updateSelectedText('fill', c.value)}
                      className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition flex items-center justify-center gap-1 ${
                        toolbarProps.fill === c.value
                          ? 'ring-2 ring-[#F59E0B] ring-offset-1 ring-offset-white dark:ring-offset-[#1E293B]'
                          : ''
                      }`}
                      style={{
                        background: c.value === '#FFFFFF' ? '#F3F4F6' : c.value === '#000000' ? '#1E293B' : '#D4A843',
                        color: c.value === '#FFFFFF' ? '#374151' : '#FFFFFF',
                      }}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bold toggle */}
              <div>
                <label className="text-[10px] text-[#6B7280] dark:text-[#94A3B8] block mb-1">样式</label>
                <button
                  onClick={() => updateSelectedText('fontWeight', toolbarProps.fontWeight === 'bold' ? 'normal' : 'bold')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                    toolbarProps.fontWeight === 'bold'
                      ? 'bg-[#111827] dark:bg-[#F1F5F9] text-white dark:text-[#0F172A]'
                      : 'bg-[#F3F4F6] dark:bg-[#334155] text-[#6B7280] dark:text-[#94A3B8]'
                  }`}
                >
                  B
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Canvas */}
        <div className="flex-1 min-w-0">
          <div className="rounded-xl bg-[#F9FAFB] dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] p-4 flex items-center justify-center overflow-hidden">
            <div
              style={{
                width: '100%',
                maxWidth: 540,
                aspectRatio: `${canvasW}/${canvasH}`,
                position: 'relative',
              }}
            >
              <canvas
                ref={canvasRef}
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'block',
                  borderRadius: 8,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar: size switch + download */}
      <div className="flex items-center justify-between gap-3 rounded-xl p-3 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155]">
        <div className="flex gap-2">
          {(Object.entries(SIZE_CONFIGS) as [PosterSize, typeof SIZE_CONFIGS['3:4']][]).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => switchSize(key)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition ${
                size === key
                  ? 'bg-[#FEF3C7] dark:bg-[#F59E0B]/20 text-[#92400E] dark:text-[#F59E0B]'
                  : 'bg-[#F3F4F6] dark:bg-[#334155] text-[#6B7280] dark:text-[#94A3B8] hover:bg-[#E5E7EB] dark:hover:bg-[#475569]'
              }`}
            >
              {cfg.label}
            </button>
          ))}
        </div>
        <button
          onClick={exportPNG}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-medium bg-[#F59E0B] text-white hover:bg-[#D97706] transition shadow-sm"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2M8 2v9M5 8l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          下载 PNG
        </button>
      </div>
    </div>
  );
}
