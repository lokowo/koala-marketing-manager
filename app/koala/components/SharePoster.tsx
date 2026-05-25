'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Download, Loader2, Share2 } from 'lucide-react';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';

/* ── Theme / background definitions ─────────────────────── */

interface GradientTheme {
  kind: 'gradient';
  id: string;
  label: string;
  gradient: string;
}

interface ImageTheme {
  kind: 'image';
  id: string;
  label: string;
  src: string;
}

type PosterTheme = GradientTheme | ImageTheme;

const GRADIENT_THEMES: GradientTheme[] = [
  { kind: 'gradient', id: 'dark',   label: '深邃',     gradient: 'from-[#0F1419] via-[#1A1A2E] to-[#0d2818]' },
  { kind: 'gradient', id: 'navy',   label: '海军蓝',   gradient: 'from-[#0a1628] via-[#162040] to-[#0a2030]' },
  { kind: 'gradient', id: 'warm',   label: '暖金',     gradient: 'from-[#1a1408] via-[#2a1e10] to-[#1a1408]' },
];

const IMAGE_THEMES: ImageTheme[] = [
  { kind: 'image', id: 'bg-11', label: '砂岩主楼',   src: '/images/posters/11.png' },
  { kind: 'image', id: 'bg-22', label: '蓝花楹校园', src: '/images/posters/22.png' },
  { kind: 'image', id: 'bg-33', label: '林荫主楼',   src: '/images/posters/33.png' },
  { kind: 'image', id: 'bg-44', label: 'STEM大楼',   src: '/images/posters/44.png' },
  { kind: 'image', id: 'bg-55', label: '图书馆',     src: '/images/posters/55.png' },
  { kind: 'image', id: 'bg-66', label: '蓝花楹步道', src: '/images/posters/66.png' },
];

const ALL_THEMES: PosterTheme[] = [...GRADIENT_THEMES, ...IMAGE_THEMES];

/* ── Component ──────────────────────────────────────────── */

interface SharePosterProps {
  open: boolean;
  onClose: () => void;
  matchCount?: number;
  emailCount?: number;
  proposalCount?: number;
}

export default function SharePoster({
  open,
  onClose,
  matchCount,
  emailCount,
  proposalCount,
}: SharePosterProps) {
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [themeId, setThemeId] = useState('dark');
  const posterRef = useRef<HTMLDivElement>(null);

  const currentTheme = ALL_THEMES.find(t => t.id === themeId) ?? ALL_THEMES[0];

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }, []);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch('/api/user/credits')
      .then(r => r.json())
      .then(async d => {
        const code = d.referralCode ?? '';
        setReferralCode(code);
        if (code) {
          const url = `https://koalaphd.com/?ref=${code}`;
          const dataUrl = await QRCode.toDataURL(url, {
            width: 200,
            margin: 1,
            color: { dark: '#1A1A2E', light: '#FFFFFF' },
          });
          setQrDataUrl(dataUrl);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  const hookLine = (() => {
    if (matchCount && matchCount > 0) return `我用 Koala PhD 匹配到 ${matchCount} 位澳洲博士导师`;
    if (emailCount && emailCount > 0) return `我已用 Koala PhD 发出 ${emailCount} 封套磁信`;
    if (proposalCount && proposalCount > 0) return `我用 Koala PhD 生成了 ${proposalCount} 份研究计划`;
    return '我在用 Koala PhD 找澳洲博士导师';
  })();

  const handleSave = async () => {
    if (!posterRef.current || saving) return;
    setSaving(true);
    try {
      const canvas = await html2canvas(posterRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
        logging: false,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `koala-share-${referralCode || 'poster'}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast('海报已保存');
    } catch {
      showToast('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = () => {
    if (!referralCode) return;
    navigator.clipboard.writeText(`https://koalaphd.com/?ref=${referralCode}`).then(() => showToast('链接已复制'));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-10 right-0 text-white/80 hover:text-white z-10">
          <X className="size-6" />
        </button>

        {loading ? (
          <div className="w-full rounded-2xl bg-white/10 flex items-center justify-center" style={{ aspectRatio: '3/4' }}>
            <Loader2 className="size-6 text-white/40 animate-spin" />
          </div>
        ) : (
          <>
            {/* Poster — rendered as HTML, captured by html2canvas */}
            <div
              ref={posterRef}
              className="w-full rounded-2xl overflow-hidden shadow-2xl"
              style={{ aspectRatio: '3/4' }}
            >
              {/* Background layer */}
              <div className="relative w-full h-full">
                {/* Gradient background */}
                {currentTheme.kind === 'gradient' && (
                  <div className={`absolute inset-0 bg-gradient-to-br ${(currentTheme as GradientTheme).gradient}`} />
                )}

                {/* Image background with overlays */}
                {currentTheme.kind === 'image' && (
                  <>
                    {/* Photo */}
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${(currentTheme as ImageTheme).src})` }}
                    />
                    {/* Layer 1: brand-color tinted overlay — "fog" */}
                    <div className="absolute inset-0 bg-[#0F1419]/[0.50]" />
                    {/* Layer 2: gradient scrim — darker at top/bottom, transparent middle */}
                    <div
                      className="absolute inset-0"
                      style={{
                        background: 'linear-gradient(to bottom, rgba(15,20,25,0.55) 0%, rgba(15,20,25,0.10) 40%, rgba(15,20,25,0.10) 60%, rgba(15,20,25,0.55) 100%)',
                      }}
                    />
                  </>
                )}

                {/* Content layer */}
                <div className="relative w-full h-full flex flex-col justify-between p-6">
                  {/* Decorative dots */}
                  <div className="absolute top-0 right-0 w-40 h-40 opacity-10">
                    <div className="absolute top-6 right-6 size-2 rounded-full bg-[#D4A843]" />
                    <div className="absolute top-6 right-14 size-1.5 rounded-full bg-[#D4A843]" />
                    <div className="absolute top-14 right-10 size-1 rounded-full bg-[#D4A843]" />
                    <div className="absolute top-20 right-4 size-2.5 rounded-full bg-[#D4A843]" />
                    <div className="absolute top-16 right-20 size-1.5 rounded-full bg-[#D4A843]" />
                  </div>
                  <div className="absolute bottom-20 left-0 w-32 h-32 opacity-[0.06]">
                    <div className="absolute bottom-4 left-4 size-3 rounded-full bg-[#5a8060]" />
                    <div className="absolute bottom-10 left-8 size-2 rounded-full bg-[#5a8060]" />
                    <div className="absolute bottom-2 left-16 size-1.5 rounded-full bg-[#5a8060]" />
                  </div>

                  {/* Top section */}
                  <div>
                    {/* Brand */}
                    <div className="flex items-center gap-2 mb-8">
                      <div className="size-8 rounded-full bg-[#D4A843] flex items-center justify-center text-[#0F1419] text-sm font-bold">K</div>
                      <span className="text-white/80 text-xs font-medium tracking-wide" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>Koala PhD</span>
                    </div>

                    {/* Hook */}
                    <h2
                      className="text-white text-xl font-bold leading-tight mb-3"
                      style={{
                        fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',
                        textShadow: '0 2px 8px rgba(0,0,0,0.6), 0 1px 2px rgba(0,0,0,0.4)',
                      }}
                    >
                      {hookLine}
                    </h2>
                    <p
                      className="text-white/60 text-xs leading-relaxed"
                      style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}
                    >
                      覆盖全澳 38 所大学导师与学者
                      <br />
                      AI 驱动精准匹配，一键生成套磁信
                    </p>
                  </div>

                  {/* Middle — features */}
                  <div className="flex gap-3 my-4">
                    {[
                      { emoji: '🎯', label: 'AI 选校' },
                      { emoji: '✉️', label: '套磁信' },
                      { emoji: '📝', label: '研究计划' },
                    ].map(f => (
                      <div key={f.label} className="flex-1 rounded-xl bg-white/[0.08] border border-white/[0.10] px-3 py-2.5 text-center">
                        <div className="text-lg mb-0.5">{f.emoji}</div>
                        <div
                          className="text-white/70 text-[10px]"
                          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}
                        >
                          {f.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Bottom — QR + code */}
                  <div className="flex items-end justify-between mt-auto">
                    <div>
                      <p
                        className="text-white/50 text-[10px] mb-1"
                        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
                      >
                        扫码注册，各得 15 积分
                      </p>
                      {referralCode && (
                        <div className="flex items-center gap-1.5">
                          <span
                            className="text-white/50 text-[10px]"
                            style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
                          >
                            邀请码
                          </span>
                          <span
                            className="text-[#D4A843] text-sm font-bold font-mono tracking-wider"
                            style={{ textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}
                          >
                            {referralCode}
                          </span>
                        </div>
                      )}
                      <p
                        className="text-white/25 text-[9px] mt-2"
                        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}
                      >
                        koalaphd.com
                      </p>
                    </div>
                    {qrDataUrl && (
                      <div className="rounded-lg overflow-hidden bg-white p-1.5 shadow-lg">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={qrDataUrl} alt="QR" className="size-20" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Theme picker — wrapping grid, all visible */}
            <div className="mt-3 space-y-2">
              {/* Gradient themes */}
              <div>
                <p className="text-[10px] text-white/40 mb-1.5 px-1">渐变主题</p>
                <div className="flex flex-wrap gap-2">
                  {GRADIENT_THEMES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setThemeId(t.id)}
                      className={`flex flex-col items-center gap-1 ${themeId === t.id ? 'opacity-100' : 'opacity-60 hover:opacity-80'} transition-opacity`}
                    >
                      <div
                        className={`size-10 rounded-lg bg-gradient-to-br ${t.gradient} border-2 ${themeId === t.id ? 'border-[#D4A843]' : 'border-white/20'}`}
                      />
                      <span className="text-[9px] text-white/60">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Separator */}
              <div className="border-t border-white/10" />
              {/* Image themes */}
              <div>
                <p className="text-[10px] text-white/40 mb-1.5 px-1">图片背景</p>
                <div className="flex flex-wrap gap-2">
                  {IMAGE_THEMES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setThemeId(t.id)}
                      className={`flex flex-col items-center gap-1 ${themeId === t.id ? 'opacity-100' : 'opacity-60 hover:opacity-80'} transition-opacity`}
                    >
                      <div
                        className={`size-10 rounded-lg bg-cover bg-center border-2 ${themeId === t.id ? 'border-[#D4A843]' : 'border-white/20'}`}
                        style={{ backgroundImage: `url(${t.src})` }}
                      />
                      <span className="text-[9px] text-white/60">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Hint */}
            <p className="text-center text-white/60 text-xs mt-3">长按图片保存，或点击下方按钮</p>

            {/* Actions */}
            <div className="flex gap-3 mt-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl font-medium text-sm bg-[#1A1A2E] text-white disabled:opacity-40 transition-opacity"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                {saving ? '保存中...' : '保存海报'}
              </button>
              <button
                onClick={handleCopyLink}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl font-medium text-sm bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-colors"
              >
                <Share2 size={14} />
                复制链接
              </button>
            </div>
          </>
        )}

        {/* Toast */}
        {toast && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/80 text-white text-xs rounded-lg whitespace-nowrap">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}

export function SharePosterTrigger({
  label = '分享海报',
  matchCount,
  emailCount,
  proposalCount,
  className = '',
}: {
  label?: string;
  matchCount?: number;
  emailCount?: number;
  proposalCount?: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className={className || 'flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors'}>
        <Share2 size={13} />
        {label}
      </button>
      <SharePoster
        open={open}
        onClose={() => setOpen(false)}
        matchCount={matchCount}
        emailCount={emailCount}
        proposalCount={proposalCount}
      />
    </>
  );
}
