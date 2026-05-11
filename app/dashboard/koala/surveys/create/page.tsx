'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { QuestionType } from '../../../../lib/services/surveyService';

interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  questions: Array<{
    type: QuestionType;
    title: string;
    description?: string;
    options?: string[];
    required: boolean;
    config?: Record<string, unknown>;
  }>;
}

export default function CreateSurveyPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('blank');
  const [step, setStep] = useState<'template' | 'details'>('template');

  useEffect(() => {
    fetch('/api/surveys/templates')
      .then(r => r.json())
      .then(d => setTemplates(d.templates || []))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: description.trim() || undefined }),
      });
      if (!res.ok) throw new Error('Failed');
      const survey = await res.json();

      const tpl = templates.find(t => t.id === selectedTemplate);
      if (tpl && tpl.questions.length > 0) {
        for (const q of tpl.questions) {
          await fetch('/api/surveys/questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ survey_id: survey.id, ...q }),
          });
        }
      }

      router.push(`/dashboard/koala/surveys/edit?id=${survey.id}`);
    } catch {
      alert('创建失败，请重试');
      setCreating(false);
    }
  }

  if (loading) {
    return <div className="text-center py-20 text-slate-400 text-sm">加载模板中...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">新建问卷</h1>
        <p className="text-sm text-slate-500 mt-0.5">选择模板快速开始，或创建空白问卷</p>
      </div>

      {step === 'template' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {templates.map(tpl => (
              <button
                key={tpl.id}
                onClick={() => setSelectedTemplate(tpl.id)}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  selectedTemplate === tpl.id ? 'border-amber-400 bg-amber-50/50' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="text-2xl mb-2">{tpl.icon}</div>
                <div className="text-sm font-medium text-slate-700">{tpl.name}</div>
                <div className="text-xs text-slate-400 mt-0.5">{tpl.description}</div>
                {tpl.questions.length > 0 && (
                  <div className="text-xs text-slate-400 mt-1">{tpl.questions.length} 个预设问题</div>
                )}
              </button>
            ))}
          </div>
          <button
            onClick={() => setStep('details')}
            className="w-full py-2.5 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: '#D4A843' }}
          >
            下一步
          </button>
        </div>
      )}

      {step === 'details' && (
        <div className="space-y-4 bg-white rounded-xl border border-slate-200 p-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">问卷标题 *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="例：PhD申请意向调研"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">描述（可选）</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="简要描述问卷用途..."
              rows={2}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setStep('template')}
              className="px-4 py-2 rounded-lg text-sm text-slate-500 hover:bg-slate-100"
            >
              返回
            </button>
            <button
              onClick={handleCreate}
              disabled={!title.trim() || creating}
              className="flex-1 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: '#D4A843' }}
            >
              {creating ? '创建中...' : '创建问卷'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
