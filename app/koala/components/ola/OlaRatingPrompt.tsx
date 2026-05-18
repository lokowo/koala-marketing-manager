'use client';

import { useState } from 'react';
import { OlaAvatar } from './OlaAvatar';

interface OlaRatingPromptProps {
  sessionId: string;
  onClose: () => void;
}

export function OlaRatingPrompt({ sessionId, onClose }: OlaRatingPromptProps) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (rating === 0 || submitting) return;
    setSubmitting(true);
    try {
      await fetch('/api/ola/rating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, rating, comment: comment.trim() || null }),
      });
      setSubmitted(true);
      setTimeout(onClose, 2000);
    } catch {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="mx-4 mb-3 rounded-2xl p-4 text-center animate-[slideUp_0.3s_ease-out] bg-white dark:bg-[#111c28] border border-gray-200 dark:border-gray-700/50 shadow-lg dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
        <OlaAvatar state="celebrate" size="sm" />
        <p className="mt-2 text-sm font-medium text-gray-900 dark:text-[#e8e4dc]">谢谢反馈！🐨</p>
      </div>
    );
  }

  return (
    <div className="mx-4 mb-3 rounded-2xl p-4 animate-[slideUp_0.3s_ease-out] bg-white dark:bg-[#111c28] border border-gray-200 dark:border-gray-700/50 shadow-lg dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div className="flex items-center gap-2 mb-3">
        <OlaAvatar state="suggest" size="sm" />
        <span className="text-sm font-medium text-gray-900 dark:text-[#e8e4dc]">跟小欧聊得怎么样？</span>
      </div>

      <div className="flex justify-center gap-1 mb-3">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="text-2xl transition-transform active:scale-90"
          >
            {star <= (hovered || rating) ? '⭐' : '☆'}
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder="有什么建议？（可选）"
        rows={2}
        className="w-full rounded-xl px-3 py-2 text-xs resize-none outline-none bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-[#e8e4dc] placeholder:text-gray-400 dark:placeholder:text-[#5a5550]"
      />

      <div className="flex items-center justify-between mt-3">
        <button onClick={onClose} className="text-xs text-gray-400 dark:text-[#6a6058]">跳过</button>
        <button
          onClick={handleSubmit}
          disabled={rating === 0 || submitting}
          className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${rating > 0 ? 'bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]' : 'bg-gray-200 dark:bg-white/10 text-gray-400 dark:text-[#5a5550]'}`}
        >
          {submitting ? '提交中...' : '提交'}
        </button>
      </div>
    </div>
  );
}
