'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Download, Loader2, Share2 } from 'lucide-react';

/* ── Theme definitions (must match API THEMES keys) ──── */

interface ThemeOption {
  id: string;
  label: string;
  kind: 'gradient' | 'image';
  preview: string; // CSS gradient or image path for the picker swatch
}

const GRADIENT_THEMES: ThemeOption[] = [
  { id: 'dark',  label: '深邃',     kind: 'gradient', preview: 'linear-gradient(135deg, #0F1419, #1A1A2E, #0d2818)' },
  { id: 'navy',  label: '海军蓝',   kind: 'gradient', preview: 'linear-gradient(135deg, #0a1628, #162040, #0a2030)' },
  { id: 'warm',  label: '暖金',     kind: 'gradient', preview: 'linear-gradient(135deg, #1a1408, #2a1e10, #1a1408)' },
];

const IMAGE_THEMES: ThemeOption[] = [
  { id: 'bg-11', label: '砂岩主楼',   kind: 'image', preview: '/images/posters/11.png' },
  { id: 'bg-22', label: '蓝花楹校园', kind: 'image', preview: '/images/posters/22.png' },
  { id: 'bg-33', label: '林荫主楼',   kind: 'image', preview: '/images/posters/33.png' },
  { id: 'bg-44', label: 'STEM大楼',   kind: 'image', preview: '/images/posters/44.png' },
  { id: 'bg-55', label: '图书馆',     kind: 'image', preview: '/images/posters/55.png' },
  { id: 'bg-66', label: '蓝花楹步道', kind: 'image', preview: '/images/posters/66.png' },
];

const ALL_THEMES: ThemeOption[] = [...GRADIENT_THEMES, ...IMAGE_THEMES];

/* ── Component ──────────────────────────────────────── */

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
}: SharePosterProps) {
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [themeId, setThemeId] = useState('dark');
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }, []);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setImgLoaded(false);
    setImgError(false);
    fetch('/api/user/credits')
      .then(r => r.json())
      .then(d => {
        setReferralCode(d.referralCode ?? '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  // Reset image state when theme changes
  useEffect(() => {
    setImgLoaded(false);
    setImgError(false);
  }, [themeId]);

  const posterUrl = referralCode
    ? `/api/invite-poster?code=${encodeURIComponent(referralCode)}&theme=${encodeURIComponent(themeId)}`
    : '';

  const handleSave = async () => {
    if (!posterUrl || saving) return;
    setSaving(true);
    try {
      const res = await fetch(posterUrl);
      if (!res.ok) throw new Error('fetch failed');
      const blob = await res.blob();

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        const dataUrl = URL.createObjectURL(blob);
        const win = window.open(dataUrl, '_blank');
        if (!win) {
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = `koala-invite-${referralCode}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
        showToast('长按图片保存到相册');
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `koala-invite-${referralCode}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('海报已保存');
      }
    } catch {
      showToast('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = () => {
    if (!referralCode) return;
    navigator.clipboard.writeText(`https://koalaphd.com/koala/auth?ref=${referralCode}`).then(() => showToast('链接已复制'));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-10 right-0 text-white/80 hover:text-white z-10">
          <X className="size-6" />
        </button>

        {loading ? (
          <div className="w-full rounded-2xl bg-white/10 flex items-center justify-center" style={{ aspectRatio: '750/1334' }}>
            <Loader2 className="size-6 text-white/40 animate-spin" />
          </div>
        ) : !referralCode ? (
          <div className="w-full rounded-2xl bg-white/10 flex items-center justify-center py-20">
            <p className="text-white/60 text-sm">未找到邀请码</p>
          </div>
        ) : (
          <>
            {/* Server-rendered poster image */}
            {!imgLoaded && !imgError && (
              <div className="w-full rounded-2xl bg-white/10 flex items-center justify-center" style={{ aspectRatio: '750/1334' }}>
                <Loader2 className="size-6 text-white/40 animate-spin" />
              </div>
            )}

            {imgError && (
              <div className="w-full rounded-2xl bg-white/10 flex flex-col items-center justify-center gap-3 py-20">
                <div className="text-white/60 text-sm">海报加载失败</div>
                <button
                  onClick={() => { setImgError(false); setImgLoaded(false); }}
                  className="text-xs px-4 py-2 rounded-lg bg-white/10 text-white/80 hover:bg-white/20"
                >
                  重试
                </button>
              </div>
            )}

            {!imgError && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={posterUrl}
                alt="邀请海报"
                className={`w-full rounded-2xl shadow-2xl ${imgLoaded ? '' : 'hidden'}`}
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgError(true)}
              />
            )}

            {/* Theme picker */}
            <div className="mt-3 space-y-2">
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
                        className={`size-10 rounded-lg border-2 ${themeId === t.id ? 'border-[#D4A843]' : 'border-white/20'}`}
                        style={{ background: t.preview }}
                      />
                      <span className="text-[9px] text-white/60">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="border-t border-white/10" />
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
                        style={{ backgroundImage: `url(${t.preview})` }}
                      />
                      <span className="text-[9px] text-white/60">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Hint */}
            <p className="text-center text-white/80 text-xs mt-3">长按图片保存到相册，或点击下方按钮</p>

            {/* Actions */}
            <div className="flex gap-3 mt-3">
              <button
                onClick={handleSave}
                disabled={saving || !imgLoaded}
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
