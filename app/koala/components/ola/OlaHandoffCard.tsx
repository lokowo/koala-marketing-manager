'use client';

import { useState, useEffect, useRef } from 'react';
import { OlaAvatar } from './OlaAvatar';
import { Loader2, CheckCircle2, Mail } from 'lucide-react';

interface OlaHandoffCardProps {
  userId?: string;
  userEmail?: string;
  messages?: { role: string; content: string }[];
  onClose?: () => void;
}

export function OlaHandoffCard({ userId, userEmail, messages, onClose }: OlaHandoffCardProps) {
  const [step, setStep] = useState<'collect_email' | 'submitting' | 'done'>(
    userEmail ? 'submitting' : 'collect_email',
  );
  const [email, setEmail] = useState(userEmail ?? '');
  const [error, setError] = useState<string | null>(null);

  async function submitHandoff(contactEmail: string) {
    setStep('submitting');
    setError(null);

    try {
      const recentMsgs = (messages ?? []).slice(-20);
      const summaryLines = recentMsgs
        .filter(m => m.role === 'user')
        .slice(-5)
        .map(m => m.content.slice(0, 200));
      const summary = summaryLines.length > 0
        ? `用户最近的问题：\n${summaryLines.join('\n')}`
        : '用户请求转接人工顾问';

      const res = await fetch('/api/ola/handoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId ?? null,
          reason: 'user_requested',
          conversation_summary: summary,
          collected_data: { contact_email: contactEmail },
        }),
      });

      if (!res.ok) throw new Error('提交失败');
      setStep('done');
    } catch {
      setError('提交失败，请稍后再试');
      setStep('collect_email');
    }
  }

  const autoSubmitted = useRef(false);
  useEffect(() => {
    if (userEmail && !autoSubmitted.current) {
      autoSubmitted.current = true;
      submitHandoff(userEmail);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (step === 'done') {
    return (
      <div className="rounded-xl border p-4 my-3 bg-gradient-to-br from-[#f0fdf4] to-[#ecfdf5] dark:from-[#0a1f15] dark:to-[#0d2818] border-[#bbf7d0] dark:border-[#166534]">
        <div className="flex items-start gap-3">
          <OlaAvatar state="suggest" size="sm" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="size-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">已转交顾问</span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              顾问老师会在 <strong>24 小时内</strong> 通过邮件联系你。我已帮你整理了对话要点，顾问能更快帮到你~
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="size-3.5 text-[#0D7C5F]" />
                <span className="text-gray-600 dark:text-gray-400">回复邮箱：</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-base">💬</span>
                <span className="text-gray-600 dark:text-gray-400">或微信加：</span>
                <span className="font-medium text-[#0D7C5F]">KoalaStudyAdvisor</span>
              </div>
            </div>
            {onClose && (
              <button onClick={onClose} className="mt-3 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                我知道了
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'submitting') {
    return (
      <div className="rounded-xl border p-4 my-3 bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10">
        <div className="flex items-center gap-3">
          <Loader2 className="size-5 animate-spin text-[#0D7C5F]" />
          <span className="text-sm text-gray-600 dark:text-gray-400">正在转接顾问...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border p-4 my-3 bg-gradient-to-br from-[#f0fdf4] to-[#ecfdf5] dark:from-[#0a1f15] dark:to-[#0d2818] border-[#bbf7d0] dark:border-[#166534]">
      <div className="flex items-start gap-3">
        <OlaAvatar state="suggest" size="sm" />
        <div className="flex-1">
          <p className="text-sm text-gray-800 dark:text-gray-200 mb-3">
            没问题！顾问老师需要一个邮箱来联系你：
          </p>
          {error && (
            <p className="text-xs text-red-500 mb-2">{error}</p>
          )}
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="flex-1 px-3 py-2 rounded-lg text-sm border bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-[#e8e4dc] outline-none focus:border-[#0D7C5F]"
            />
            <button
              onClick={() => {
                if (!email || !email.includes('@')) {
                  setError('请输入有效邮箱');
                  return;
                }
                submitHandoff(email);
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-[#0D7C5F] text-white hover:bg-[#0a6b52]"
            >
              提交
            </button>
          </div>
          {onClose && (
            <button onClick={onClose} className="mt-2 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              算了，继续跟 Ola 聊
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
