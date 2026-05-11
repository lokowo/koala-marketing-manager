'use client';

import { useState } from 'react';

interface ShareCardProps {
  shareCode: string;
  surveyId: string;
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

export default function ShareCard({ shareCode, surveyId, title, brandColor = '#D4A843', qrCodes, onGenerateQR, isSales }: ShareCardProps) {
  const [qrLabel, setQrLabel] = useState('');
  const [showGenerate, setShowGenerate] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  async function handleCopyLink(code: string) {
    const url = `${baseUrl}/s/${code}`;
    await navigator.clipboard.writeText(url);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  function handleGenerate() {
    if (onGenerateQR) {
      onGenerateQR(qrLabel.trim());
      setQrLabel('');
      setShowGenerate(false);
    }
  }

  // Non-sales users see a notice instead of QR generation
  if (!isSales) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-700">问卷分享</h3>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
          <p className="text-sm text-amber-800 font-medium">问卷需通过销售推广</p>
          <p className="text-xs text-amber-600 mt-1">
            每份问卷的分享链接绑定销售人员，以追踪推广来源。请通知销售团队为此问卷生成推广二维码。
          </p>
        </div>
        {qrCodes && qrCodes.length > 0 && (
          <div className="border-t border-slate-100 pt-4">
            <h4 className="text-sm font-medium text-slate-600 mb-3">已有 {qrCodes.length} 个推广码</h4>
            <div className="space-y-2">
              {qrCodes.map(qr => (
                <div key={qr.id} className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-600 font-mono truncate">{qr.sales_code}</div>
                  </div>
                  <div className="text-xs text-slate-400">扫码 {qr.scan_count} / 提交 {qr.response_count}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Sales users: generate and view their own QR codes
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
      <h3 className="text-sm font-semibold text-slate-700">我的推广码</h3>

      {qrCodes && qrCodes.length > 0 ? (
        <div className="space-y-3">
          {qrCodes.map(qr => {
            const qrUrl = `${baseUrl}/s/${qr.sales_code}`;
            const fallbackQrImg = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrUrl)}`;
            return (
              <div key={qr.id} className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-start gap-4">
                  <img
                    src={qr.qr_image_url || fallbackQrImg}
                    alt="QR Code"
                    className="w-28 h-28 rounded-lg border border-slate-200 bg-white"
                  />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="text-sm font-medium text-slate-700">{qr.label || title}</div>
                    <div className="text-xs text-slate-400 font-mono break-all">{qrUrl}</div>
                    <button
                      onClick={() => handleCopyLink(qr.sales_code)}
                      className="px-3 py-1 rounded-lg text-xs text-white transition-colors"
                      style={{ backgroundColor: copied === qr.sales_code ? '#22c55e' : brandColor }}
                    >
                      {copied === qr.sales_code ? '已复制' : '复制链接'}
                    </button>
                    <div className="flex gap-4 text-xs text-slate-500 pt-1">
                      <span>扫码 <strong className="text-slate-700">{qr.scan_count}</strong></span>
                      <span>提交 <strong className="text-slate-700">{qr.response_count}</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6 bg-slate-50 rounded-xl">
          <p className="text-sm text-slate-500 mb-3">还没有生成推广码</p>
          <button
            onClick={() => setShowGenerate(true)}
            className="px-5 py-2 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: brandColor }}
          >
            生成我的推广二维码
          </button>
        </div>
      )}

      {/* Generate new QR */}
      {qrCodes && qrCodes.length > 0 && !showGenerate && (
        <button
          onClick={() => setShowGenerate(true)}
          className="w-full py-2 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-amber-300 hover:text-amber-600 transition-colors"
        >
          + 生成新推广码
        </button>
      )}

      {showGenerate && (
        <div className="flex items-center gap-2 bg-amber-50 p-3 rounded-lg">
          <input
            type="text"
            value={qrLabel}
            onChange={e => setQrLabel(e.target.value)}
            placeholder="标签（如: 微信群A、线下活动B）"
            className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
          />
          <button
            onClick={handleGenerate}
            className="px-4 py-1.5 rounded-lg text-sm text-white flex-shrink-0"
            style={{ backgroundColor: brandColor }}
          >
            生成
          </button>
          <button
            onClick={() => setShowGenerate(false)}
            className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-slate-600"
          >
            取消
          </button>
        </div>
      )}

      <div className="text-xs text-slate-400 bg-slate-50 p-3 rounded-lg">
        💡 每个推广码追踪独立数据。建议为不同渠道（微信、小红书、线下等）分别生成推广码。
      </div>
    </div>
  );
}
