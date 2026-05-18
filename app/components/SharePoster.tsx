'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import QRCode from 'qrcode';

async function drawPosterFallback(
  displayName: string, referralCode: string, qrDataUrl: string,
  remainingInvites: number, isUnlimited: boolean, isExhausted: boolean,
): Promise<string> {
  const W = 600, H = 800;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Header
  ctx.fillStyle = '#1A1A2E';
  ctx.fillRect(0, 0, W, 200);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🐨 Koala PhD', W / 2, 110);
  ctx.font = '14px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('AI 智能博士申请平台', W / 2, 150);

  // Body
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 200, W, 520);

  ctx.fillStyle = '#1A1A2E';
  ctx.font = '16px sans-serif';
  ctx.fillText(`${displayName} 邀请你加入`, W / 2, 250);
  ctx.fillStyle = '#888';
  ctx.font = '13px sans-serif';
  ctx.fillText('扫码注册即送 35 积分 + 额外 5 积分奖励', W / 2, 280);

  // QR code
  if (qrDataUrl) {
    const img = new Image();
    img.src = qrDataUrl;
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; });
    ctx.drawImage(img, (W - 200) / 2, 310, 200, 200);
  }

  // Referral code
  ctx.fillStyle = '#999';
  ctx.font = '12px sans-serif';
  ctx.fillText('邀请码', W / 2, 550);
  ctx.fillStyle = '#1A1A2E';
  ctx.font = 'bold 28px monospace';
  ctx.fillText(referralCode, W / 2, 585);

  // Remaining
  ctx.fillStyle = '#999';
  ctx.font = '13px sans-serif';
  const remainText = isExhausted ? '邀请名额已用完' : isUnlimited ? '无限邀请名额' : `剩余 ${remainingInvites} 个邀请名额`;
  ctx.fillText(remainText, W / 2, 620);

  // Footer
  ctx.fillStyle = '#F9FAFB';
  ctx.fillRect(0, 660, W, 140);
  ctx.fillStyle = '#999';
  ctx.font = '11px sans-serif';
  ctx.fillText('koalaphd.com · AI 匹配 4,200+ 位澳洲教授', W / 2, 700);

  return canvas.toDataURL('image/png');
}

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
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
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
      await document.fonts.ready;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const html2canvas = (await import('html2canvas' as any)).default;
      const canvas = await html2canvas(posterRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#FFFFFF',
        logging: false,
      });
      const dataUrl = canvas.toDataURL('image/png');

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        setGeneratedImageUrl(dataUrl);
        showToast('长按图片保存到相册');
      } else {
        const link = document.createElement('a');
        link.download = `koala-invite-${referralCode}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('海报已保存');
      }
    } catch (err) {
      console.error('[SharePoster] html2canvas failed:', err);
      // Fallback: draw poster with Canvas API directly
      try {
        const fallbackDataUrl = await drawPosterFallback(displayName, referralCode, qrDataUrl, remainingInvites, isUnlimited, isExhausted);
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) {
          setGeneratedImageUrl(fallbackDataUrl);
          showToast('长按图片保存到相册');
        } else {
          const link = document.createElement('a');
          link.download = `koala-invite-${referralCode}.png`;
          link.href = fallbackDataUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          showToast('海报已保存');
        }
      } catch {
        showToast('截图失败，请手动截屏或复制链接');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralUrl).then(() => showToast('链接已复制'));
  };

  const handleClose = () => {
    setGeneratedImageUrl(null);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={handleClose}>
      <div className="relative w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <button onClick={handleClose} className="absolute -top-10 right-0 text-white/80 hover:text-white">
          <X className="size-6" />
        </button>

        {generatedImageUrl ? (
          <>
            {/* Generated image for long-press save */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={generatedImageUrl} alt="邀请海报" className="w-full rounded-2xl shadow-2xl" />
            <p className="text-center text-white/80 text-xs mt-3">长按图片保存到相册</p>

            {/* Actions */}
            <div className="flex gap-3 mt-3">
              <button
                onClick={() => setGeneratedImageUrl(null)}
                className="flex-1 py-3 rounded-xl font-medium text-sm bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-colors"
              >
                重新生成
              </button>
              <button
                onClick={handleCopyLink}
                className="flex-1 py-3 rounded-xl font-medium text-sm bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-colors"
              >
                复制链接
              </button>
            </div>
          </>
        ) : (
          <>
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
