'use client';

import { useState, useCallback } from 'react';
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

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralUrl).then(() => showToast('链接已复制'));
  };

  const handleClose = () => {
    setImgLoaded(false);
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
        {!imgLoaded && (
          <div className="w-full rounded-2xl bg-white/10 animate-pulse flex items-center justify-center" style={{ aspectRatio: '750/1334' }}>
            <div className="text-white/40 text-sm">生成海报中...</div>
          </div>
        )}

        {/* Server-rendered poster image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={posterSrc}
          alt="邀请海报"
          className={`w-full rounded-2xl shadow-2xl ${imgLoaded ? '' : 'hidden'}`}
          onLoad={() => setImgLoaded(true)}
        />

        <p className="text-center text-white/80 text-xs mt-3">长按图片保存到相册</p>

        {/* Actions */}
        <div className="flex gap-3 mt-3">
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
