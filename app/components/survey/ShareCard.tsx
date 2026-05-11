'use client';

import { useState } from 'react';

interface ShareCardProps {
  shareCode: string;
  title: string;
  brandColor?: string;
  qrCodes?: Array<{
    id: string;
    label?: string;
    sales_code: string;
    qr_image_url?: string;
    scan_count: number;
    response_count: number;
  }>;
  onGenerateQR?: (label: string) => void;
  isSales?: boolean;
}

export default function ShareCard({ shareCode, title, brandColor = '#D4A843', qrCodes, onGenerateQR, isSales }: ShareCardProps) {
  const [copied, setCopied] = useState(false);
  const [qrLabel, setQrLabel] = useState('');
  const [showGenerate, setShowGenerate] = useState(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl = `${baseUrl}/s/${shareCode}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleGenerate() {
    if (onGenerateQR) {
      onGenerateQR(qrLabel.trim());
      setQrLabel('');
      setShowGenerate(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
      <h3 className="text-sm font-semibold text-slate-700">分享问卷</h3>

      {/* Share link */}
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={shareUrl}
          className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 font-mono"
        />
        <button
          onClick={handleCopy}
          className="px-4 py-2 rounded-lg text-sm text-white transition-colors"
          style={{ backgroundColor: copied ? '#22c55e' : brandColor }}
        >
          {copied ? '已复制' : '复制'}
        </button>
      </div>

      {/* QR Code section for Sales */}
      {isSales && (
        <div className="border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-slate-600">我的二维码</h4>
            <button
              onClick={() => setShowGenerate(v => !v)}
              className="text-sm px-3 py-1 rounded-lg transition-colors"
              style={{ color: brandColor, backgroundColor: `${brandColor}15` }}
            >
              + 生成新二维码
            </button>
          </div>

          {showGenerate && (
            <div className="flex items-center gap-2 mb-3 bg-amber-50 p-3 rounded-lg">
              <input
                type="text"
                value={qrLabel}
                onChange={e => setQrLabel(e.target.value)}
                placeholder="二维码标签（如: 线下活动A）"
                className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
              />
              <button
                onClick={handleGenerate}
                className="px-4 py-1.5 rounded-lg text-sm text-white"
                style={{ backgroundColor: brandColor }}
              >
                生成
              </button>
            </div>
          )}

          {qrCodes && qrCodes.length > 0 ? (
            <div className="space-y-3">
              {qrCodes.map(qr => (
                <div key={qr.id} className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg">
                  {qr.qr_image_url && (
                    <img src={qr.qr_image_url} alt="QR" className="w-16 h-16 rounded border border-slate-200" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-700 truncate">{qr.label || '未命名'}</div>
                    <div className="text-xs text-slate-400 mt-0.5 font-mono">{qr.sales_code}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-slate-400">扫码 {qr.scan_count} / 提交 {qr.response_count}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">还没有生成二维码</p>
          )}
        </div>
      )}

      {/* WeChat share hint */}
      <div className="text-xs text-slate-400 bg-slate-50 p-3 rounded-lg">
        💡 分享到微信：复制链接发送给好友，或生成二维码打印后扫码填写。问卷标题「{title}」会作为微信分享卡片标题。
      </div>
    </div>
  );
}
