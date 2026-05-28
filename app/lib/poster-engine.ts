import QRCode from 'qrcode';

// ── Types ──────────────────────────────────────────────

export type TemplateId = 'minimal' | 'academic' | 'vibrant';
export type Variant = 'A' | 'B';
export type PosterSize = '3:4' | '1:1' | '9:16';

export interface PosterOptions {
  template: TemplateId;
  variant: Variant;
  size: PosterSize;
  headline: string;
  subtitle: string;
  refCode: string;
  channel: string;
  showQR: boolean;
  showUrl: boolean;
  showRefCode: boolean;
  showChannelBadge: boolean;
  seed: number;
}

interface TemplateConfig {
  bg: string;
  gradient?: { stops: [string, string] };
  textColor: string;
  accentColor: string;
  mutedColor: string;
  titleFont: string;
  bodyFont: string;
  decorStyle: 'lines' | 'dots';
}

interface Zones {
  padding: number;
  width: number;
  height: number;
  logo: { x: number; y: number };
  title: { x: number; y: number; maxWidth: number };
  subtitle: { x: number; y: number; maxWidth: number };
  qrArea: { centerX: number; centerY: number; size: number };
  captionLine: { centerX: number; y: number };
  infoBar: { y: number };
  urlText: { x: number; y: number };
  refCodeText: { x: number; y: number };
  channelBadge: { x: number; y: number };
}

// ── Template Configs ───────────────────────────────────

const TEMPLATES: Record<TemplateId, TemplateConfig> = {
  minimal: {
    bg: '#FFFFFF',
    textColor: '#1E293B',
    accentColor: '#F59E0B',
    mutedColor: '#94A3B8',
    titleFont: '300 {size}px system-ui, sans-serif',
    bodyFont: '{size}px system-ui, sans-serif',
    decorStyle: 'lines',
  },
  academic: {
    bg: '#0F172A',
    textColor: '#E2E8F0',
    accentColor: '#F59E0B',
    mutedColor: '#3B82F6',
    titleFont: '{size}px Georgia, serif',
    bodyFont: '{size}px system-ui, sans-serif',
    decorStyle: 'lines',
  },
  vibrant: {
    bg: '',
    gradient: { stops: ['#F59E0B', '#EC4899'] },
    textColor: '#FFFFFF',
    accentColor: '#FFFFFF',
    mutedColor: '#FDE68A',
    titleFont: 'bold {size}px system-ui, sans-serif',
    bodyFont: '{size}px system-ui, sans-serif',
    decorStyle: 'dots',
  },
};

export const TEMPLATE_META: Record<TemplateId, {
  label: string;
  desc: string;
  palette: string[];
  platforms: string[];
}> = {
  minimal: {
    label: '简约',
    desc: '白底 · 简洁干净',
    palette: ['#FFFFFF', '#F59E0B', '#1E293B', '#94A3B8'],
    platforms: ['微信', '邮件', 'WhatsApp'],
  },
  academic: {
    label: '学术',
    desc: '深蓝底 · 专业权威',
    palette: ['#0F172A', '#F59E0B', '#3B82F6', '#E2E8F0'],
    platforms: ['知乎', 'LinkedIn', '学术群'],
  },
  vibrant: {
    label: '活力',
    desc: '渐变彩色 · 年轻风',
    palette: ['#F59E0B', '#EC4899', '#8B5CF6', '#FDE68A'],
    platforms: ['小红书', '抖音', 'B站'],
  },
};

// ── Channel Colors ─────────────────────────────────────

const CH_COLORS: Record<string, { bg: string; text: string }> = {
  wechat:      { bg: '#22C55E', text: '#FFFFFF' },
  xiaohongshu: { bg: '#EF4444', text: '#FFFFFF' },
  douyin:      { bg: '#1E293B', text: '#FFFFFF' },
  weibo:       { bg: '#FF6900', text: '#FFFFFF' },
  zhihu:       { bg: '#0066FF', text: '#FFFFFF' },
  bilibili:    { bg: '#00A1D6', text: '#FFFFFF' },
  email:       { bg: '#3B82F6', text: '#FFFFFF' },
  whatsapp:    { bg: '#25D366', text: '#FFFFFF' },
  offline:     { bg: '#8B5CF6', text: '#FFFFFF' },
  friend:      { bg: '#F59E0B', text: '#FFFFFF' },
  other:       { bg: '#6B7280', text: '#FFFFFF' },
};

const CH_LABELS: Record<string, string> = {
  wechat: '微信', xiaohongshu: '小红书', douyin: '抖音', weibo: '微博',
  zhihu: '知乎', bilibili: 'B站', email: '邮件', whatsapp: 'WhatsApp',
  offline: '线下', friend: '朋友推荐', other: '其他',
};

export function getChannelName(ch: string): string {
  return CH_LABELS[ch] || ch;
}

// ── Utilities ──────────────────────────────────────────

export function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function seededRandom(seed: number, min: number, max: number): number {
  const x = Math.sin(seed) * 10000;
  const r = x - Math.floor(x);
  return min + r * (max - min);
}

function seededInt(seed: number, min: number, max: number): number {
  return Math.floor(seededRandom(seed, min, max + 1));
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function fitText(ctx: CanvasRenderingContext2D, text: string, fontTemplate: string, maxWidth: number, startSize: number, minSize: number): number {
  let size = startSize;
  while (size > minSize) {
    ctx.font = fontTemplate.replace('{size}', String(size));
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 2;
  }
  return minSize;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const chars = text.split('');
  const lines: string[] = [];
  let line = '';
  for (const char of chars) {
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

// ── Size ───────────────────────────────────────────────

export function getSizeDimensions(size: PosterSize): { width: number; height: number } {
  switch (size) {
    case '1:1': return { width: 1080, height: 1080 };
    case '9:16': return { width: 1080, height: 1920 };
    case '3:4': default: return { width: 1080, height: 1440 };
  }
}

// ── Zone Calculator ────────────────────────────────────

function calcZones(w: number, h: number): Zones {
  const p = w * 0.05;
  return {
    padding: p,
    width: w,
    height: h,
    logo: { x: p, y: h * 0.03 },
    title: { x: w * 0.5, y: h * 0.22, maxWidth: w * 0.84 },
    subtitle: { x: w * 0.5, y: h * 0.34, maxWidth: w * 0.84 },
    qrArea: { centerX: w * 0.5, centerY: h * 0.56, size: Math.min(w, h) * 0.24 },
    captionLine: { centerX: w * 0.5, y: h * 0.72 },
    infoBar: { y: h * 0.82 },
    urlText: { x: p + 8, y: h * 0.86 },
    refCodeText: { x: p + 8, y: h * 0.90 },
    channelBadge: { x: w - p - 8, y: h * 0.86 },
  };
}

// ── Draw Functions ─────────────────────────────────────

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number, tmpl: TemplateConfig, opts: PosterOptions) {
  if (tmpl.gradient) {
    const angle = seededRandom(opts.seed + 2, 115, 155);
    const rad = (angle * Math.PI) / 180;
    const cx = w / 2, cy = h / 2;
    const len = Math.max(w, h);
    const x1 = cx - Math.cos(rad) * len / 2;
    const y1 = cy - Math.sin(rad) * len / 2;
    const x2 = cx + Math.cos(rad) * len / 2;
    const y2 = cy + Math.sin(rad) * len / 2;
    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    const stops = opts.variant === 'B'
      ? ['#8B5CF6', '#EC4899'] as const
      : tmpl.gradient.stops;
    grad.addColorStop(0, stops[0]);
    grad.addColorStop(1, stops[1]);
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = tmpl.bg;
  }
  ctx.fillRect(0, 0, w, h);
}

function drawDecorations(ctx: CanvasRenderingContext2D, w: number, h: number, tmpl: TemplateConfig, opts: PosterOptions) {
  const count = seededInt(opts.seed + 1, 3, 6);
  ctx.globalAlpha = 0.08;

  if ((opts.variant === 'A' && tmpl.decorStyle === 'lines') || (opts.variant === 'A' && tmpl.decorStyle === 'dots')) {
    ctx.strokeStyle = tmpl.accentColor;
    ctx.lineWidth = 2;
    for (let i = 0; i < count; i++) {
      const x1 = seededRandom(opts.seed + 10 + i, w * 0.1, w * 0.9);
      const y1 = seededRandom(opts.seed + 20 + i, h * 0.40, h * 0.52);
      const x2 = x1 + seededRandom(opts.seed + 30 + i, 40, 160);
      const y2 = y1 + seededRandom(opts.seed + 40 + i, -30, 30);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = tmpl.accentColor;
    for (let i = 0; i < count; i++) {
      const cx = seededRandom(opts.seed + 10 + i, w * 0.08, w * 0.92);
      const cy = seededRandom(opts.seed + 20 + i, h * 0.40, h * 0.52);
      const r = seededRandom(opts.seed + 30 + i, 8, 28);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.globalAlpha = 1;
}

function drawLogo(ctx: CanvasRenderingContext2D, zones: Zones, tmpl: TemplateConfig, isLeftAligned: boolean) {
  ctx.font = `600 24px system-ui, sans-serif`;
  ctx.fillStyle = tmpl.accentColor;
  ctx.textAlign = isLeftAligned ? 'left' : 'left';
  ctx.fillText('Koala PhD 考拉博士', zones.logo.x, zones.logo.y + 28);
}

function drawHeadline(ctx: CanvasRenderingContext2D, text: string, zones: Zones, tmpl: TemplateConfig, isLeftAligned: boolean) {
  const align = isLeftAligned ? 'left' : 'center';
  const x = isLeftAligned ? zones.padding + 8 : zones.title.x;
  const size = fitText(ctx, text, tmpl.titleFont, zones.title.maxWidth, 48, 28);
  ctx.font = tmpl.titleFont.replace('{size}', String(size));
  ctx.fillStyle = tmpl.textColor;
  ctx.textAlign = align;

  const lines = wrapText(ctx, text, zones.title.maxWidth);
  lines.forEach((line, i) => ctx.fillText(line, x, zones.title.y + i * (size + 8)));
}

function drawSubtitle(ctx: CanvasRenderingContext2D, text: string, zones: Zones, tmpl: TemplateConfig, isLeftAligned: boolean) {
  if (!text) return;
  const align = isLeftAligned ? 'left' : 'center';
  const x = isLeftAligned ? zones.padding + 8 : zones.subtitle.x;
  const size = fitText(ctx, text, tmpl.bodyFont, zones.subtitle.maxWidth, 28, 16);
  ctx.font = tmpl.bodyFont.replace('{size}', String(size));
  ctx.fillStyle = tmpl.accentColor;
  ctx.globalAlpha = 0.8;
  ctx.textAlign = align;
  ctx.fillText(text, x, zones.subtitle.y);
  ctx.globalAlpha = 1;
}

async function drawQRCode(ctx: CanvasRenderingContext2D, url: string, zone: Zones['qrArea'], tmpl: TemplateConfig) {
  try {
    const qrDataUrl = await QRCode.toDataURL(url, {
      width: zone.size * 2,
      margin: 1,
      color: { dark: '#1E293B', light: '#FFFFFF' },
    });
    const img = new Image();
    img.src = qrDataUrl;
    await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = reject; });

    const pad = zone.size * 0.08;
    ctx.fillStyle = '#FFFFFF';
    roundRect(ctx, zone.centerX - zone.size / 2 - pad, zone.centerY - zone.size / 2 - pad, zone.size + pad * 2, zone.size + pad * 2, 12);
    ctx.fill();

    if (tmpl.bg === '#FFFFFF') {
      ctx.strokeStyle = '#E5E7EB';
      ctx.lineWidth = 1;
      roundRect(ctx, zone.centerX - zone.size / 2 - pad, zone.centerY - zone.size / 2 - pad, zone.size + pad * 2, zone.size + pad * 2, 12);
      ctx.stroke();
    }

    ctx.drawImage(img, zone.centerX - zone.size / 2, zone.centerY - zone.size / 2, zone.size, zone.size);
  } catch { /* QR generation failed silently */ }
}

function drawRefCodeBox(ctx: CanvasRenderingContext2D, code: string, zone: Zones['qrArea'], tmpl: TemplateConfig) {
  const boxW = zone.size * 1.4;
  const boxH = zone.size * 1.1;
  const bx = zone.centerX - boxW / 2;
  const by = zone.centerY - boxH / 2;

  ctx.fillStyle = tmpl.bg === '#FFFFFF' ? '#F8FAFC' : 'rgba(255,255,255,0.08)';
  roundRect(ctx, bx, by, boxW, boxH, 16);
  ctx.fill();

  if (tmpl.bg === '#FFFFFF') {
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;
    roundRect(ctx, bx, by, boxW, boxH, 16);
    ctx.stroke();
  }

  ctx.textAlign = 'center';

  ctx.font = '20px system-ui, sans-serif';
  ctx.fillStyle = tmpl.textColor;
  ctx.globalAlpha = 0.6;
  ctx.fillText('🎁 注册输入邀请码', zone.centerX, by + boxH * 0.28);
  ctx.globalAlpha = 1;

  ctx.font = 'bold 44px system-ui, monospace';
  ctx.fillStyle = tmpl.accentColor;
  ctx.fillText(code, zone.centerX, by + boxH * 0.56);

  ctx.font = '18px system-ui, sans-serif';
  ctx.fillStyle = tmpl.textColor;
  ctx.globalAlpha = 0.5;
  ctx.fillText('领取免费积分', zone.centerX, by + boxH * 0.78);
  ctx.globalAlpha = 1;
}

function drawCaptionLine(ctx: CanvasRenderingContext2D, text: string, zone: Zones['captionLine'], tmpl: TemplateConfig) {
  ctx.font = '22px system-ui, sans-serif';
  ctx.fillStyle = tmpl.textColor;
  ctx.globalAlpha = 0.6;
  ctx.textAlign = 'center';
  ctx.fillText(text, zone.centerX, zone.y);
  ctx.globalAlpha = 1;
}

function drawChannelBadge(ctx: CanvasRenderingContext2D, channel: string, zone: Zones['channelBadge'], tmpl: TemplateConfig) {
  const label = (CH_LABELS[channel] || channel) + '推广';
  const colors = CH_COLORS[channel] || CH_COLORS.other;

  ctx.font = '500 16px system-ui, sans-serif';
  const tw = ctx.measureText(label).width;
  const pillW = tw + 24;
  const pillH = 28;
  const px = zone.x - pillW;
  const py = zone.y;

  ctx.fillStyle = tmpl.bg === '#FFFFFF' ? colors.bg : colors.bg;
  ctx.globalAlpha = tmpl.bg === '#FFFFFF' ? 0.12 : 0.25;
  roundRect(ctx, px, py, pillW, pillH, 14);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = tmpl.bg === '#FFFFFF' ? colors.bg : colors.text;
  ctx.textAlign = 'center';
  ctx.fillText(label, px + pillW / 2, py + 19);
}

function drawUrlText(ctx: CanvasRenderingContext2D, zone: Zones['urlText'], tmpl: TemplateConfig) {
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillStyle = tmpl.textColor;
  ctx.globalAlpha = 0.35;
  ctx.textAlign = 'left';
  ctx.fillText('www.koalaphd.com', zone.x, zone.y);
  ctx.globalAlpha = 1;
}

function drawRefCodeLabel(ctx: CanvasRenderingContext2D, code: string, pos: { x: number; y: number }, tmpl: TemplateConfig) {
  ctx.font = '500 16px system-ui, monospace';
  ctx.fillStyle = tmpl.accentColor;
  ctx.globalAlpha = 0.7;
  ctx.textAlign = 'left';
  ctx.fillText(`邀请码: ${code}`, pos.x, pos.y);
  ctx.globalAlpha = 1;
}

// ── Main Render ────────────────────────────────────────

export async function renderPoster(canvas: HTMLCanvasElement, opts: PosterOptions): Promise<void> {
  const { width, height } = getSizeDimensions(opts.size);
  canvas.width = width * 2;
  canvas.height = height * 2;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(2, 2);

  const tmpl = TEMPLATES[opts.template];
  const zones = calcZones(width, height);
  const isLeftAligned = opts.variant === 'B';

  // 1. Background
  drawBackground(ctx, width, height, tmpl, opts);

  // 2. Decorations (in whitespace zone)
  drawDecorations(ctx, width, height, tmpl, opts);

  // 3. Logo
  drawLogo(ctx, zones, tmpl, isLeftAligned);

  // 4. Headline
  drawHeadline(ctx, opts.headline, zones, tmpl, isLeftAligned);

  // 5. Subtitle
  if (opts.subtitle) {
    drawSubtitle(ctx, opts.subtitle, zones, tmpl, isLeftAligned);
  }

  // 6. QR or Ref Code Box
  if (opts.showQR) {
    const qrUrl = `https://www.koalaphd.com/koala/auth?ref=${opts.refCode}&ch=${opts.channel}`;
    await drawQRCode(ctx, qrUrl, zones.qrArea, tmpl);
    drawCaptionLine(ctx, `扫码注册 · ${getChannelName(opts.channel)}渠道`, zones.captionLine, tmpl);
    ctx.save();
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillStyle = tmpl.textColor;
    ctx.globalAlpha = 0.6;
    ctx.textAlign = 'center';
    ctx.fillText('📷 请使用手机相机扫码（微信扫码可能无法登录）', zones.captionLine.centerX, zones.captionLine.y + 48);
    ctx.globalAlpha = 1;
    ctx.restore();
  } else {
    drawRefCodeBox(ctx, opts.refCode, zones.qrArea, tmpl);
  }

  // 7. Bottom info bar
  let nextUrlY = zones.urlText.y;
  if (opts.showUrl) {
    drawUrlText(ctx, { ...zones.urlText, y: nextUrlY }, tmpl);
    nextUrlY += 20;
  }
  if (opts.showRefCode && opts.showQR) {
    drawRefCodeLabel(ctx, opts.refCode, { x: zones.refCodeText.x, y: nextUrlY }, tmpl);
  }
  if (opts.showChannelBadge) {
    drawChannelBadge(ctx, opts.channel, zones.channelBadge, tmpl);
  }
}

export function exportPoster(canvas: HTMLCanvasElement, opts: PosterOptions): void {
  const link = document.createElement('a');
  link.download = `koala-poster-${opts.template}-${opts.variant}-${opts.refCode}-${opts.channel}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
