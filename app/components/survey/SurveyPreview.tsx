'use client';

import QuestionRenderer from './QuestionRenderer';

interface Question {
  id: string;
  type: string;
  title: string;
  description?: string;
  options?: string[];
  required: boolean;
  config?: Record<string, unknown>;
}

interface SurveyPreviewProps {
  title: string;
  description?: string;
  welcomeMessage?: string;
  brandColor?: string;
  coverImage?: string;
  questions: Question[];
}

export default function SurveyPreview({ title, description, welcomeMessage, brandColor = '#D4A843', coverImage, questions }: SurveyPreviewProps) {
  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-100">
      {/* Phone frame */}
      <div className="bg-slate-900 text-white text-center py-2 text-xs">
        <span className="opacity-60">预览模式 · 375 × 812</span>
      </div>

      <div className="max-h-[600px] overflow-y-auto">
        {/* Cover */}
        {coverImage && (
          <div className="h-40 bg-slate-100 relative">
            <img src={coverImage} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Header */}
        <div className="px-6 pt-6 pb-4" style={{ borderBottom: `3px solid ${brandColor}` }}>
          <h2 className="text-lg font-bold text-slate-800">{title || '未命名问卷'}</h2>
          {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
          {welcomeMessage && <p className="text-sm text-slate-600 mt-2 italic">{welcomeMessage}</p>}
        </div>

        {/* Questions */}
        <div className="px-6 py-4 space-y-6">
          {questions.length === 0 && (
            <p className="text-center text-sm text-slate-400 py-8">暂无问题，请先添加</p>
          )}
          {questions.map((q, i) => (
            <div key={q.id || i} className="space-y-2">
              <div className="flex items-start gap-1">
                <span className="text-sm font-medium text-slate-700">
                  {i + 1}. {q.title}
                </span>
                {q.required && <span className="text-red-400 text-xs">*</span>}
              </div>
              {q.description && <p className="text-xs text-slate-400">{q.description}</p>}
              <QuestionRenderer
                question={q}
                value={undefined}
                onChange={() => {}}
                brandColor={brandColor}
              />
            </div>
          ))}
        </div>

        {/* Submit button */}
        {questions.length > 0 && (
          <div className="px-6 pb-6">
            <button
              disabled
              className="w-full py-3 rounded-xl text-white text-sm font-medium opacity-60"
              style={{ backgroundColor: brandColor }}
            >
              提交问卷
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-4 border-t border-slate-100">
          <span className="text-xs text-slate-400">Powered by Koala Study Advisors</span>
        </div>
      </div>
    </div>
  );
}
