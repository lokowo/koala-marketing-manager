'use client';

import { useState } from 'react';
import type { QuestionType } from '../../lib/services/surveyService';

interface QuestionData {
  id?: string;
  type: QuestionType;
  title: string;
  description?: string;
  options?: string[];
  required: boolean;
  config?: Record<string, unknown>;
}

interface QuestionEditorProps {
  question?: QuestionData;
  index: number;
  onSave: (data: Omit<QuestionData, 'id'>) => void;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

const QUESTION_TYPES: { value: QuestionType; label: string; icon: string }[] = [
  { value: 'single_choice', label: '单选', icon: '⭕' },
  { value: 'multiple_choice', label: '多选', icon: '☑️' },
  { value: 'text', label: '文本', icon: '✏️' },
  { value: 'rating', label: '评分', icon: '⭐' },
  { value: 'scale', label: '量表', icon: '📊' },
  { value: 'dropdown', label: '下拉', icon: '📋' },
  { value: 'date', label: '日期', icon: '📅' },
];

export default function QuestionEditor({ question, index, onSave, onDelete, onMoveUp, onMoveDown }: QuestionEditorProps) {
  const [type, setType] = useState<QuestionType>(question?.type || 'single_choice');
  const [title, setTitle] = useState(question?.title || '');
  const [description, setDescription] = useState(question?.description || '');
  const [options, setOptions] = useState<string[]>(question?.options || ['选项 1', '选项 2']);
  const [required, setRequired] = useState(question?.required ?? true);
  const [config, setConfig] = useState<Record<string, unknown>>(question?.config || {});
  const [expanded, setExpanded] = useState(!question?.id);

  const needsOptions = ['single_choice', 'multiple_choice', 'dropdown'].includes(type);

  function handleSave() {
    if (!title.trim()) return;
    onSave({
      type,
      title: title.trim(),
      description: description.trim() || undefined,
      options: needsOptions ? options.filter(o => o.trim()) : undefined,
      required,
      config: Object.keys(config).length > 0 ? config : undefined,
    });
    setExpanded(false);
  }

  function addOption() {
    setOptions([...options, `选项 ${options.length + 1}`]);
  }

  function removeOption(i: number) {
    setOptions(options.filter((_, idx) => idx !== i));
  }

  function updateOption(i: number, val: string) {
    const next = [...options];
    next[i] = val;
    setOptions(next);
  }

  if (!expanded) {
    return (
      <div className="border border-slate-200 rounded-lg p-3 flex items-center gap-3 hover:border-slate-300 transition-colors group">
        <span className="text-sm text-slate-400 font-mono w-6">{index + 1}</span>
        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-500">
          {QUESTION_TYPES.find(t => t.value === type)?.label}
        </span>
        <span className="flex-1 text-sm text-slate-700 truncate">{title || '未命名问题'}</span>
        {required && <span className="text-xs text-red-400">必填</span>}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onMoveUp && <button onClick={onMoveUp} className="p-1 rounded hover:bg-slate-100 text-slate-400 text-xs">↑</button>}
          {onMoveDown && <button onClick={onMoveDown} className="p-1 rounded hover:bg-slate-100 text-slate-400 text-xs">↓</button>}
          <button onClick={() => setExpanded(true)} className="p-1 rounded hover:bg-slate-100 text-slate-400 text-xs">编辑</button>
          {onDelete && <button onClick={onDelete} className="p-1 rounded hover:bg-red-50 text-red-400 text-xs">删除</button>}
        </div>
      </div>
    );
  }

  return (
    <div className="border-2 border-amber-300 rounded-lg p-4 bg-amber-50/30 space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-400 font-mono w-6">{index + 1}</span>
        <select
          value={type}
          onChange={e => setType(e.target.value as QuestionType)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white"
        >
          {QUESTION_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-slate-600 ml-auto">
          <input type="checkbox" checked={required} onChange={e => setRequired(e.target.checked)} className="rounded" />
          必填
        </label>
      </div>

      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="问题标题"
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
      />

      <input
        type="text"
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="问题描述（可选）"
        className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
      />

      {needsOptions && (
        <div className="space-y-2 pl-6">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-slate-300 text-sm">{type === 'multiple_choice' ? '☐' : '○'}</span>
              <input
                type="text"
                value={opt}
                onChange={e => updateOption(i, e.target.value)}
                className="flex-1 border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-amber-300"
              />
              {options.length > 1 && (
                <button onClick={() => removeOption(i)} className="text-red-400 hover:text-red-500 text-xs px-1">×</button>
              )}
            </div>
          ))}
          <button onClick={addOption} className="text-sm text-amber-600 hover:text-amber-700">+ 添加选项</button>
        </div>
      )}

      {type === 'rating' && (
        <div className="flex items-center gap-2 pl-6">
          <span className="text-sm text-slate-500">最高分</span>
          <select
            value={(config.max as number) || 5}
            onChange={e => setConfig({ ...config, max: parseInt(e.target.value) })}
            className="border border-slate-200 rounded px-2 py-1 text-sm"
          >
            {[3, 5, 7, 10].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      )}

      {type === 'scale' && (
        <div className="flex items-center gap-3 pl-6">
          <div className="flex items-center gap-1">
            <span className="text-sm text-slate-500">范围</span>
            <input
              type="number"
              value={(config.min as number) ?? 0}
              onChange={e => setConfig({ ...config, min: parseInt(e.target.value) })}
              className="w-14 border border-slate-200 rounded px-2 py-1 text-sm"
            />
            <span className="text-slate-400">~</span>
            <input
              type="number"
              value={(config.max as number) ?? 10}
              onChange={e => setConfig({ ...config, max: parseInt(e.target.value) })}
              className="w-14 border border-slate-200 rounded px-2 py-1 text-sm"
            />
          </div>
          <input
            type="text"
            value={(config.minLabel as string) || ''}
            onChange={e => setConfig({ ...config, minLabel: e.target.value })}
            placeholder="低分标签"
            className="flex-1 border border-slate-200 rounded px-2 py-1 text-sm"
          />
          <input
            type="text"
            value={(config.maxLabel as string) || ''}
            onChange={e => setConfig({ ...config, maxLabel: e.target.value })}
            placeholder="高分标签"
            className="flex-1 border border-slate-200 rounded px-2 py-1 text-sm"
          />
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={!title.trim()}
          className="px-4 py-1.5 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          保存
        </button>
        {question?.id && (
          <button onClick={() => setExpanded(false)} className="px-4 py-1.5 text-slate-500 rounded-lg text-sm hover:bg-slate-100">
            取消
          </button>
        )}
        {onDelete && (
          <button onClick={onDelete} className="px-4 py-1.5 text-red-400 rounded-lg text-sm hover:bg-red-50 ml-auto">
            删除问题
          </button>
        )}
      </div>
    </div>
  );
}
