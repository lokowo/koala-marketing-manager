'use client';

import { useState, useEffect, useCallback } from 'react';
import { Check, X } from 'lucide-react';

interface FeedbackCardProps {
  conversationId: string;
  onDismiss: () => void;
}

interface FeedbackQuestion {
  key: string;
  question: string;
  type: 'choice' | 'text';
  options?: string[];
}

const QUESTION_POOL: FeedbackQuestion[] = [
  { key: 'helpfulness', question: 'Ola 的回答有帮助吗？', type: 'choice', options: ['很有用', '一般', '没用'] },
  { key: 'tone', question: '语气觉得怎样？', type: 'choice', options: ['太正式', '刚好', '太随意'] },
  { key: 'recommend', question: '会推荐给同学吗？', type: 'choice', options: ['会', '可能', '不会'] },
  { key: 'match_accuracy', question: '匹配的教授准吗？', type: 'choice', options: ['很准', '还行', '不准'] },
  { key: 'improvement', question: '最希望改进什么？', type: 'text' },
  { key: 'confusion', question: '哪个环节困惑了？', type: 'text' },
];

export function FeedbackCard({ conversationId, onDismiss }: FeedbackCardProps) {
  const [question, setQuestion] = useState<FeedbackQuestion | null>(null);
  const [textValue, setTextValue] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const idx = Math.floor(Math.random() * QUESTION_POOL.length);
    setQuestion(QUESTION_POOL[idx]);
  }, []);

  const submit = useCallback(async (answer: string) => {
    if (!question || submitting) return;
    setSubmitting(true);
    try {
      await fetch('/api/chat/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          questionKey: question.key,
          answer,
        }),
      });
      setSubmitted(true);
      setTimeout(onDismiss, 1200);
    } catch {
      onDismiss();
    }
  }, [question, conversationId, onDismiss, submitting]);

  if (!question) return null;

  if (submitted) {
    return (
      <div className="mt-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] shadow-sm px-4 py-3 animate-in fade-in duration-200">
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
          <Check size={16} />
          感谢反馈！
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="px-4 py-3 flex items-center justify-between">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {question.question}
        </p>
        <button
          onClick={onDismiss}
          className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
          aria-label="跳过"
        >
          <X size={14} />
        </button>
      </div>

      <div className="px-4 pb-3">
        {question.type === 'choice' && question.options ? (
          <div className="flex gap-2 flex-wrap">
            {question.options.map((opt) => (
              <button
                key={opt}
                disabled={submitting}
                onClick={() => submit(opt)}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 bg-white dark:bg-white/5 hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-500/50 dark:hover:text-blue-400 transition-colors disabled:opacity-50 min-h-[36px]"
              >
                {opt}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              maxLength={50}
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              placeholder="简短描述…"
              className="flex-1 h-9 px-3 text-sm bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-blue-500 dark:focus:border-blue-500/50 focus:ring-2 focus:ring-blue-50 dark:focus:ring-blue-500/10 transition-colors"
            />
            <button
              disabled={!textValue.trim() || submitting}
              onClick={() => submit(textValue.trim())}
              className="px-3 h-9 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              提交
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
