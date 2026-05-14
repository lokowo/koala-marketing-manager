'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import QRCode from 'qrcode';

interface SharePosterProps {
  open: boolean;
  onClose: () => void;
  referralCode: string;
  referralUrl: string;
  remainingInvites: number;
  displayName: string;
}

export default function SharePoster({ open, onClose, referralCode, referralUrl, remainingInvites, displayName }: SharePosterProps) {
  const posterRef = useRef<HTMLDivElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const isUnlimited = remainingInvites === -1;
  const isExhausted = !isUnlimited && remainingInvites <= 0;

  useEffect(() => {
    if (referralUrl) {
      QRCode.toDataURL(referralUrl, { width: 200, margin: 2, color: { dark: '#1A1A2E', light: '#FFFFFF' } })
        .then(setQrDataUrl)
        .catch(() => {});
    }
  }, [referralUrl]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }, []);

  const handleSave = async () => {
    if (!posterRef.current) return;
    setSaving(true);
    try {
      const html2canvas = (await import('html2canvas' as string)).default as (el: HTMLElement, opts?: Record<string, unknown>) => Promise<HTMLCanvasElement>;
      const canvas = await html2canvas(posterRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#FFFFFF',
      });
      const link = document.createElement('a');
      link.download = `koala-invite-${referralCode}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast('海报已保存');
    } catch {
      showToast('截图失败，请手动复制链接');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralUrl).then(() => showToast('链接已复制'));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-10 right-0 text-white/80 hover:text-white">
          <X className="size-6" />
        </button>

        {/* Poster */}
        <div ref={posterRef} className="bg-white rounded-2xl overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="bg-[#1A1A2E] px-6 pt-6 pb-4 text-center">
            <div className="text-3xl mb-2">🐨</div>
            <h2 className="text-white text-lg font-bold">Koala PhD</h2>
            <p className="text-white/60 text-xs mt-1">AI 智能博士申请平台</p>
          </div>

          {/* Body */}
          <div className="px-6 py-5 text-center">
            <p className="text-gray-800 text-sm mb-1">
              <span className="font-semibold text-[#1A1A2E]">{displayName}</span> 邀请你加入
            </p>
            <p className="text-gray-500 text-xs mb-4">扫码注册即送 35 积分 + 额外 5 积分奖励</p>

            {/* QR Code */}
            {qrDataUrl && (
              <div className="inline-block p-3 bg-gray-50 rounded-xl mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="QR Code" className="w-40 h-40" />
              </div>
            )}

            {/* Referral code */}
            <div className="mb-4">
              <p className="text-[10px] text-gray-400 mb-1">邀请码</p>
              <p className="text-xl font-bold tracking-[0.3em] text-[#1A1A2E] font-mono">{referralCode}</p>
            </div>

            {/* Remaining */}
            <div className="text-xs text-gray-400">
              {isExhausted
                ? '邀请名额已用完'
                : isUnlimited
                  ? '无限邀请名额'
                  : `剩余 ${remainingInvites} 个邀请名额`
              }
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-3 text-center">
            <p className="text-[10px] text-gray-400">koalaphd.com · AI 匹配 4,200+ 位澳洲教授</p>
          </div>
        </div>

        {/* Actions (outside poster, not captured by html2canvas) */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleSave}
            disabled={saving || isExhausted}
            className="flex-1 py-3 rounded-xl font-medium text-sm bg-[#1A1A2E] text-white disabled:opacity-40 transition-opacity"
          >
            {saving ? '生成中...' : isExhausted ? '名额已用完' : '保存海报'}
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
