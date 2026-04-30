'use client';

import { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ShareConfig {
  type: 'professor' | 'blog' | 'report' | 'niv_result';
  id: string;
  title: string;
  summary: string;
  url: string;
}

interface ShareOption {
  key: string;
  label: string;
  emoji: string;
}

// ─── Configuration ────────────────────────────────────────────────────────────

const SHARE_OPTIONS: Record<ShareConfig['type'], ShareOption[]> = {
  professor: [
    { key: 'wechat', label: '朋友圈', emoji: '💬' },
    { key: 'weibo',  label: '微博',   emoji: '📱' },
    { key: 'link',   label: '复制链接', emoji: '🔗' },
    { key: 'pdf',    label: '下载PDF', emoji: '📄' },
    { key: 'card',   label: '生成卡片', emoji: '🖼️' },
  ],
  blog: [
    { key: 'wechat', label: '朋友圈', emoji: '💬' },
    { key: 'weibo',  label: '微博',   emoji: '📱' },
    { key: 'link',   label: '复制链接', emoji: '🔗' },
    { key: 'card',   label: '生成卡片', emoji: '🖼️' },
  ],
  report: [
    { key: 'pdf',   label: '下载PDF', emoji: '📄' },
    { key: 'email', label: '发送邮箱', emoji: '📧' },
    { key: 'link',  label: '分享链接', emoji: '🔗' },
  ],
  niv_result: [
    { key: 'card', label: '生成卡片', emoji: '🖼️' },
    { key: 'link', label: '复制链接', emoji: '🔗' },
  ],
};

// ─── ShareBar Component ───────────────────────────────────────────────────────

interface ShareBarProps {
  config: ShareConfig;
  /** Optional element ID to capture for card generation */
  captureId?: string;
  className?: string;
}

export default function ShareBar({ config, captureId, className = '' }: ShareBarProps) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [shareText, setShareText] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const options = SHARE_OPTIONS[config.type] ?? [];

  const buildShareLink = () =>
    `${config.url}?utm_source=share&utm_medium=${config.type}&utm_campaign=organic`;

  const handleOption = async (key: string) => {
    setActiveKey(key);
    setLoading(true);
    setCopied(false);

    try {
      switch (key) {
        case 'link': {
          const link = buildShareLink();
          await navigator.clipboard.writeText(link);
          setShareText(link);
          setCopied(true);
          break;
        }

        case 'wechat':
        case 'weibo': {
          // Fetch AI-generated copy from backend
          const res = await fetch('/api/social/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sourceType: config.type,
              sourceId: config.id,
              title: config.title,
              summary: config.summary,
            }),
          });
          const data = await res.json() as Record<string, string>;
          const text: string = key === 'wechat' ? data.wechatMoments : data.weibo;
          setShareText(text ?? '');
          await navigator.clipboard.writeText(text ?? '');
          setCopied(true);
          break;
        }

        case 'card': {
          if (!captureId) {
            setShareText('请提供 captureId 以生成卡片。');
            break;
          }
          // Attempt to use html2canvas if available; install it to enable card export
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const html2canvas = (await import('html2canvas' as any)).default as (el: HTMLElement, opts?: object) => Promise<HTMLCanvasElement>;
            const element = document.getElementById(captureId);
            if (!element) { setShareText('元素未找到。'); break; }

            const canvas = await html2canvas(element, {
              scale: 2,
              backgroundColor: '#fdf9ef',
              width: 375,
              windowWidth: 375,
            });

            canvas.toBlob((blob: Blob | null) => {
              if (!blob) return;
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `koala-share-${config.id}.png`;
              a.click();
              URL.revokeObjectURL(url);
            }, 'image/png');

            setShareText('卡片已生成，正在下载...');
          } catch {
            setShareText('卡片生成功能需要安装 html2canvas，请联系开发团队。');
          }
          break;
        }

        case 'pdf': {
          // Trigger PDF download — assume the page has a /api/report/[id] endpoint
          const link = document.createElement('a');
          link.href = `/api/report/${config.id}`;
          link.download = `koala-report-${config.id}.pdf`;
          link.click();
          setShareText('PDF 下载中...');
          break;
        }

        case 'email': {
          window.location.href = `mailto:?subject=${encodeURIComponent(config.title)}&body=${encodeURIComponent(buildShareLink())}`;
          setShareText('已打开邮件客户端。');
          break;
        }

        default:
          break;
      }
    } catch {
      setShareText('操作失败，请重试。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button
            key={opt.key}
            onClick={() => handleOption(opt.key)}
            disabled={loading}
            className={`
              flex items-center gap-1 px-3 py-1.5 rounded-full text-sm border transition-colors
              ${activeKey === opt.key
                ? 'bg-amber-100 border-amber-400 text-amber-800'
                : 'bg-white border-stone-300 text-stone-600 hover:border-amber-400 hover:text-amber-700'}
              disabled:opacity-50
            `}
          >
            <span>{opt.emoji}</span>
            <span>{opt.label}</span>
          </button>
        ))}
      </div>

      {/* Feedback area */}
      {shareText && (
        <div className="rounded-lg bg-stone-50 border border-stone-200 p-3 text-sm text-stone-700 space-y-1">
          {copied && (
            <p className="text-emerald-600 font-medium text-xs">✓ 已复制到剪贴板</p>
          )}
          <p className="break-all whitespace-pre-wrap">{shareText}</p>
        </div>
      )}
    </div>
  );
}
