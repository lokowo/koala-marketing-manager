'use client';

import { Mail, Copy, AlertCircle } from 'lucide-react';
import { useGmail } from './GmailContext';

interface GmailAuthPromptProps {
  onSkip: () => void;
  message?: string;
}

export function GmailAuthPrompt({ onSkip, message }: GmailAuthPromptProps) {
  const { token_expired, connectUrl } = useGmail();

  return (
    <div className="rounded-xl border border-blue-200 dark:border-blue-500/20 bg-blue-50/50 dark:bg-blue-500/5 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-[#4285f4]/10 flex items-center justify-center shrink-0 mt-0.5">
          <Mail size={18} className="text-[#4285f4]" />
        </div>
        <div className="flex-1 min-w-0">
          {token_expired && (
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mb-1.5">
              <AlertCircle size={12} /> Gmail 授权已过期，需重新连接
            </p>
          )}
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
            {token_expired ? '重新连接 Gmail' : '连接你的 Gmail'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            {message || '授权 Gmail 后可直接从你的邮箱发送套磁信，教授看到的是你的真实邮箱，回复率更高。'}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <a
          href={connectUrl()}
          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium rounded-lg bg-[#4285f4] text-white no-underline hover:bg-[#3367d6] transition-colors"
        >
          <Mail size={13} /> 授权 Gmail
        </a>
        <button
          onClick={onSkip}
          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
        >
          <Copy size={13} /> 跳过（复制邮件内容）
        </button>
      </div>

      <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center">
        仅申请 Gmail 发送权限，不读取任何邮件内容
      </p>
    </div>
  );
}
