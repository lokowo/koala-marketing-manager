'use client';

import { useState, useCallback, useRef } from 'react';
import { X } from 'lucide-react';

interface SharePosterProps {
  open: boolean;
  onClose: () => void;
  referralCode: string;
  referralUrl: string;
  remainingInvites: number;
  displayName: string;
}

export default function SharePoster({ open, onClose, referralCode, referralUrl }: SharePosterProps) {
  const [toast, setToast] = useState('');
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [saving, setSaving] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralUrl).then(() => showToast('链接已复制'));
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/og/invite?code=${encodeURIComponent(referralCode)}`);
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
      showToast('保存失败，请长按图片保存');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setImgLoaded(false);
    setImgError(false);
    onClose();
  };

  if (!open) return null;

  const posterSrc = `/api/og/invite?code=${encodeURIComponent(referralCode)}`;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={handleClose}>
      <div className="relative w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <button onClick={handleClose} className="absolute -top-10 right-0 text-white/80 hover:text-white">
          <X className="size-6" />
        </button>

        {/* Loading skeleton */}
        {!imgLoaded && !imgError && (
          <div className="w-full rounded-2xl bg-white/10 animate-pulse flex items-center justify-center" style={{ aspectRatio: '750/1334' }}>
            <div className="text-white/40 text-sm">生成海报中...</div>
          </div>
        )}

        {/* Error state */}
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

        {/* Server-rendered poster image */}
        {!imgError && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imgRef}
            src={posterSrc}
            alt="邀请海报"
            className={`w-full rounded-2xl shadow-2xl ${imgLoaded ? '' : 'hidden'}`}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
          />
        )}

        {imgLoaded && (
          <p className="text-center text-white/80 text-xs mt-3">长按图片保存到相册，或点击下方按钮</p>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-3">
          <button
            onClick={handleSave}
            disabled={saving || !imgLoaded}
            className="flex-1 py-3 rounded-xl font-medium text-sm bg-[#1A1A2E] text-white disabled:opacity-40 transition-opacity"
          >
            {saving ? '保存中...' : '保存海报'}
          </button>
          <button
            onClick={handleCopyLink}
            className="flex-1 py-3 rounded-xl font-medium text-sm bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-colors"
          >
            复制链接
          </button>
        </div>

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
