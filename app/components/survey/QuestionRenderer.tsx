'use client';

import { useState } from 'react';

interface QuestionConfig {
  max?: number;
  min?: number;
  minLabel?: string;
  maxLabel?: string;
}

interface Question {
  id: string;
  type: string;
  title: string;
  description?: string;
  options?: string[];
  required: boolean;
  config?: QuestionConfig;
}

interface QuestionRendererProps {
  question: Question;
  value: unknown;
  onChange: (value: unknown) => void;
  brandColor?: string;
}

export default function QuestionRenderer({ question, value, onChange, brandColor = '#D4A843' }: QuestionRendererProps) {
  const [textValue, setTextValue] = useState((value as string) || '');

  switch (question.type) {
    case 'single_choice':
      return (
        <div className="space-y-2">
          {question.options?.map((opt) => (
            <button
              type="button"
              key={opt}
              onClick={() => onChange(opt)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all text-left ${
                value === opt ? 'border-current bg-opacity-5' : 'border-slate-200 hover:border-slate-300'
              }`}
              style={value === opt ? { borderColor: brandColor, backgroundColor: `${brandColor}10` } : {}}
            >
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                  value === opt ? 'border-current' : 'border-slate-300'
                }`}
                style={value === opt ? { borderColor: brandColor } : {}}
              >
                {value === opt && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: brandColor }} />}
              </div>
              <span className="text-sm text-slate-700">{opt}</span>
            </button>
          ))}
        </div>
      );

    case 'multiple_choice':
      return (
        <div className="space-y-2">
          {question.options?.map((opt) => {
            const selected = Array.isArray(value) && value.includes(opt);
            return (
              <button
                type="button"
                key={opt}
                onClick={() => onChange(opt)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all text-left ${
                  selected ? 'bg-opacity-5' : 'border-slate-200 hover:border-slate-300'
                }`}
                style={selected ? { borderColor: brandColor, backgroundColor: `${brandColor}10` } : {}}
              >
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                    selected ? '' : 'border-slate-300'
                  }`}
                  style={selected ? { borderColor: brandColor, backgroundColor: brandColor } : {}}
                >
                  {selected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
                <span className="text-sm text-slate-700">{opt}</span>
              </button>
            );
          })}
        </div>
      );

    case 'text':
      return (
        <textarea
          value={textValue}
          onChange={e => { setTextValue(e.target.value); onChange(e.target.value); }}
          placeholder="请输入你的回答..."
          rows={3}
          className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors resize-none"
          style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
          onFocus={e => e.target.style.borderColor = brandColor}
          onBlur={e => e.target.style.borderColor = '#e2e8f0'}
        />
      );

    case 'rating': {
      const max = (question.config?.max as number) || 5;
      return (
        <div className="flex gap-2">
          {Array.from({ length: max }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              onClick={() => onChange(n)}
              className="w-10 h-10 rounded-full text-lg transition-all"
              style={(value as number) >= n
                ? { backgroundColor: brandColor, color: 'white' }
                : { backgroundColor: '#f1f5f9', color: '#94a3b8' }
              }
            >
              ★
            </button>
          ))}
        </div>
      );
    }

    case 'scale': {
      const min = (question.config?.min as number) ?? 0;
      const max = (question.config?.max as number) ?? 10;
      const minLabel = question.config?.minLabel || '';
      const maxLabel = question.config?.maxLabel || '';
      const nums = Array.from({ length: max - min + 1 }, (_, i) => min + i);
      return (
        <div className="space-y-2">
          <div className="flex gap-1 flex-wrap">
            {nums.map(n => (
              <button
                key={n}
                onClick={() => onChange(n)}
                className="w-9 h-9 rounded-lg text-sm font-medium transition-all"
                style={value === n
                  ? { backgroundColor: brandColor, color: 'white' }
                  : { backgroundColor: '#f1f5f9', color: '#64748b' }
                }
              >
                {n}
              </button>
            ))}
          </div>
          {(minLabel || maxLabel) && (
            <div className="flex justify-between text-xs text-slate-400 px-1">
              <span>{minLabel}</span>
              <span>{maxLabel}</span>
            </div>
          )}
        </div>
      );
    }

    case 'dropdown':
      return (
        <select
          value={(value as string) || ''}
          onChange={e => onChange(e.target.value)}
          className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none bg-white"
          style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
        >
          <option value="">请选择...</option>
          {question.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );

    case 'date':
      return (
        <input
          type="date"
          value={(value as string) || ''}
          onChange={e => onChange(e.target.value)}
          className="border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none"
        />
      );

    default:
      return <p className="text-sm text-slate-400">不支持的题型</p>;
  }
}
