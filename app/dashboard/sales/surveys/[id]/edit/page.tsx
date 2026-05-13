'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import QuestionEditor from '../../../../../components/survey/QuestionEditor';
import SurveyPreview from '../../../../../components/survey/SurveyPreview';
import ShareCard from '../../../../../components/survey/ShareCard';
import type { QuestionType } from '../../../../../lib/services/surveyService';
import { questionsToSurveyJson } from '../../../../../lib/services/surveyJsonBuilder';

interface Question {
  id: string;
  type: QuestionType;
  title: string;
  description?: string;
  options?: string[];
  required: boolean;
  order_index: number;
  config?: Record<string, unknown>;
}

interface Survey {
  id: string;
  title: string;
  description?: string;
  status: string;
  share_code: string;
  welcome_message?: string;
  thank_you_message?: string;
  brand_color?: string;
  cover_image?: string;
  require_login: boolean;
  allow_anonymous: boolean;
  one_per_device: boolean;
  max_responses?: number;
  start_at?: string;
  end_at?: string;
  questions?: Question[];
  response_count?: number;
}

interface QRCode {
  id: string;
  label?: string;
  sales_code: string;
  qr_image_url?: string;
  scan_count: number;
  response_count: number;
}

export default function SalesEditSurveyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: surveyId } = use(params);
  const router = useRouter();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'questions' | 'settings' | 'preview' | 'share'>('questions');
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [thankYouMessage, setThankYouMessage] = useState('');
  const [brandColor, setBrandColor] = useState('#D4A843');
  const [requireLogin, setRequireLogin] = useState(false);
  const [allowAnonymous, setAllowAnonymous] = useState(true);
  const [onePerDevice, setOnePerDevice] = useState(true);
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [qrCodes, setQrCodes] = useState<QRCode[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchSurvey = useCallback(async () => {
    if (!surveyId) return;
    const res = await fetch(`/api/surveys/${surveyId}?_t=${Date.now()}`);
    if (!res.ok) { router.push('/dashboard/sales/surveys'); return; }
    const data = await res.json();
    setSurvey(data);
    setTitle(data.title);
    setDescription(data.description || '');
    setWelcomeMessage(data.welcome_message || '');
    setThankYouMessage(data.thank_you_message || '');
    setBrandColor(data.brand_color || '#D4A843');
    setRequireLogin(data.require_login);
    setAllowAnonymous(data.allow_anonymous);
    setOnePerDevice(data.one_per_device);
    setLoading(false);
  }, [surveyId, router]);

  useEffect(() => { fetchSurvey(); }, [fetchSurvey]);

  useEffect(() => {
    if (surveyId && tab === 'share') {
      fetch(`/api/surveys/qrcodes?survey_id=${surveyId}`)
        .then(r => r.json())
        .then(d => setQrCodes(d.qrcodes || []))
        .catch(() => {});
    }
  }, [surveyId, tab]);

  function buildSurveyJson() {
    const qs = survey?.questions || [];
    return questionsToSurveyJson(
      { title, description, welcome_message: welcomeMessage, brand_color: brandColor },
      qs.map(q => ({ ...q, config: q.config as Record<string, unknown> | undefined })),
    );
  }

  async function handleSaveSettings() {
    if (!surveyId) return;
    setSaving(true);
    const surveyJson = buildSurveyJson();
    await fetch(`/api/surveys/${surveyId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title, description: description || undefined,
        welcome_message: welcomeMessage || undefined,
        thank_you_message: thankYouMessage || undefined,
        brand_color: brandColor,
        require_login: requireLogin,
        allow_anonymous: allowAnonymous,
        one_per_device: onePerDevice,
        survey_json: surveyJson,
      }),
    });
    await fetchSurvey();
    setSaving(false);
    setTab('questions');
  }

  async function syncSurveyJson() {
    if (!surveyId) return;
    const res = await fetch(`/api/surveys/${surveyId}?_t=${Date.now()}`);
    if (!res.ok) return;
    const freshSurvey = await res.json();
    const qs = freshSurvey.questions || [];
    const json = questionsToSurveyJson(
      { title: freshSurvey.title, description: freshSurvey.description, welcome_message: freshSurvey.welcome_message, brand_color: freshSurvey.brand_color },
      qs.map((q: { config?: Record<string, unknown> }) => ({ ...q, config: q.config as Record<string, unknown> | undefined })),
    );
    await fetch(`/api/surveys/${surveyId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ survey_json: json }),
    });
  }

  async function handleAddQuestion(data: { type: QuestionType; title: string; description?: string; options?: string[]; required: boolean; config?: Record<string, unknown> }) {
    if (!surveyId) return;
    await fetch('/api/surveys/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ survey_id: surveyId, ...data }),
    });
    setAddingQuestion(false);
    await fetchSurvey();
    syncSurveyJson();
  }

  async function handleUpdateQuestion(qId: string, data: { type: QuestionType; title: string; description?: string; options?: string[]; required: boolean; config?: Record<string, unknown> }) {
    await fetch('/api/surveys/questions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: qId, ...data }),
    });
    await fetchSurvey();
    syncSurveyJson();
  }

  async function handleDeleteQuestion(qId: string) {
    if (!confirm('确定删除这个问题？')) return;
    setSurvey(prev => prev ? { ...prev, questions: (prev.questions || []).filter(q => q.id !== qId) } : prev);
    const res = await fetch('/api/surveys/questions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: qId }),
    });
    if (!res.ok) {
      await fetchSurvey();
      return;
    }
    await fetchSurvey();
    syncSurveyJson();
  }

  async function handleMoveQuestion(qId: string, direction: 'up' | 'down') {
    if (!survey?.questions) return;
    const qs = [...survey.questions];
    const idx = qs.findIndex(q => q.id === qId);
    if (idx < 0) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= qs.length) return;
    [qs[idx], qs[newIdx]] = [qs[newIdx], qs[idx]];
    await fetch('/api/surveys/questions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reorder: true, survey_id: surveyId, question_ids: qs.map(q => q.id) }),
    });
    await fetchSurvey();
    syncSurveyJson();
  }

  async function handleSaveAll() {
    if (!surveyId) return;
    setSaving(true);
    const surveyJson = buildSurveyJson();
    await fetch(`/api/surveys/${surveyId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title, description: description || undefined,
        welcome_message: welcomeMessage || undefined,
        thank_you_message: thankYouMessage || undefined,
        brand_color: brandColor,
        require_login: requireLogin,
        allow_anonymous: allowAnonymous,
        one_per_device: onePerDevice,
        survey_json: surveyJson,
      }),
    });
    await fetchSurvey();
    setSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  }

  async function handlePublish() {
    if (!surveyId) return;
    const questions = survey?.questions || [];
    if (questions.length === 0) { alert('请至少添加一个问题'); return; }
    const surveyJson = buildSurveyJson();
    await fetch(`/api/surveys/${surveyId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active', survey_json: surveyJson }),
    });
    fetchSurvey();
  }

  async function handleGenerateQR(label: string) {
    if (!surveyId) return;
    await fetch('/api/surveys/qrcodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ survey_id: surveyId, label }),
    });
    const res = await fetch(`/api/surveys/qrcodes?survey_id=${surveyId}`);
    const d = await res.json();
    setQrCodes(d.qrcodes || []);
  }

  if (loading) {
    return <div className="text-center py-20 text-slate-400 text-sm">加载问卷中...</div>;
  }

  if (!survey) {
    return <div className="text-center py-20 text-slate-500">问卷不存在</div>;
  }

  const questions = survey.questions || [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard/sales/surveys')} className="text-slate-400 hover:text-slate-600 text-sm">&larr; 返回</button>
          <h1 className="text-lg font-bold text-slate-800">{survey.title}</h1>
          <span className={`px-2 py-0.5 rounded-full text-xs ${
            survey.status === 'active' ? 'bg-green-100 text-green-600'
            : survey.status === 'paused' ? 'bg-amber-100 text-amber-600'
            : survey.status === 'closed' ? 'bg-red-100 text-red-600'
            : 'bg-slate-100 text-slate-500'
          }`}>
            {survey.status === 'active' ? '进行中' : survey.status === 'paused' ? '已暂停' : survey.status === 'closed' ? '已关闭' : '草稿'}
          </span>
        </div>
        <div className="flex gap-2 items-center">
          {saveSuccess && <span className="text-xs text-green-600">已保存</span>}
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: '#D4A843' }}
          >
            {saving ? '保存中...' : '保存'}
          </button>
          {survey.status === 'draft' && (
            <button onClick={handlePublish} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-green-500 hover:bg-green-600">
              发布问卷
            </button>
          )}
          {survey.status === 'active' && (
            <a href={`/s/${survey.share_code}`} target="_blank" rel="noopener" className="px-4 py-2 rounded-lg text-sm text-slate-600 border border-slate-200 hover:bg-slate-50 no-underline">
              预览链接
            </a>
          )}
        </div>
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
        {(['questions', 'settings', 'preview', 'share'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {{ questions: '问题编辑', settings: '问卷设置', preview: '预览', share: '推广' }[t]}
          </button>
        ))}
      </div>

      {tab === 'questions' && (
        <div className="space-y-3">
          {questions.map((q, i) => (
            <QuestionEditor
              key={q.id}
              question={q}
              index={i}
              onSave={data => handleUpdateQuestion(q.id, data)}
              onDelete={() => handleDeleteQuestion(q.id)}
              onMoveUp={i > 0 ? () => handleMoveQuestion(q.id, 'up') : undefined}
              onMoveDown={i < questions.length - 1 ? () => handleMoveQuestion(q.id, 'down') : undefined}
            />
          ))}

          {addingQuestion ? (
            <QuestionEditor
              index={questions.length}
              onSave={handleAddQuestion}
              onDelete={() => setAddingQuestion(false)}
            />
          ) : (
            <button
              onClick={() => setAddingQuestion(true)}
              className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-amber-300 hover:text-amber-600 transition-colors"
            >
              + 添加问题
            </button>
          )}
        </div>
      )}

      {tab === 'settings' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5 max-w-xl">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">问卷标题</label>
            <input
              type="text" value={title} onChange={e => setTitle(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">描述</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">欢迎语</label>
            <input type="text" value={welcomeMessage} onChange={e => setWelcomeMessage(e.target.value)}
              placeholder="填写前显示的欢迎信息"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">感谢语</label>
            <input type="text" value={thankYouMessage} onChange={e => setThankYouMessage(e.target.value)}
              placeholder="提交后显示的感谢信息"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">品牌色</label>
            <div className="flex items-center gap-3">
              <input type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer" />
              <input type="text" value={brandColor} onChange={e => setBrandColor(e.target.value)}
                className="w-28 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-3">
            <h3 className="text-sm font-medium text-slate-700">访问控制</h3>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={requireLogin} onChange={e => setRequireLogin(e.target.checked)} className="rounded" />
              需要登录后填写
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={allowAnonymous} onChange={e => setAllowAnonymous(e.target.checked)} className="rounded" />
              允许匿名填写
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={onePerDevice} onChange={e => setOnePerDevice(e.target.checked)} className="rounded" />
              每台设备限填一次
            </label>
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-6 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: '#D4A843' }}
          >
            {saving ? '保存中...' : '保存设置'}
          </button>
        </div>
      )}

      {tab === 'preview' && (
        <SurveyPreview
          title={title}
          description={description}
          welcomeMessage={welcomeMessage}
          brandColor={brandColor}
          coverImage={survey.cover_image}
          questions={questions}
        />
      )}

      {tab === 'share' && (
        <ShareCard
          shareCode={survey.share_code}
          surveyId={survey.id}
          title={survey.title}
          brandColor={brandColor}
          qrCodes={qrCodes}
          onGenerateQR={handleGenerateQR}
          isSales={true}
        />
      )}
    </div>
  );
}
