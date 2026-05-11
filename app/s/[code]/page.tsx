'use client';

import { useEffect, useState, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import QuestionRenderer from '../../components/survey/QuestionRenderer';
import { generateDeviceFingerprint } from '../../lib/services/deviceFingerprint';

interface Question {
  id: string;
  type: string;
  title: string;
  description?: string;
  options?: string[];
  required: boolean;
  config?: Record<string, unknown>;
}

interface SurveyData {
  id: string;
  title: string;
  description?: string;
  welcome_message?: string;
  brand_color?: string;
  cover_image?: string;
  questions: Question[];
  require_login: boolean;
  allow_anonymous: boolean;
}

type PageState = 'cover' | 'questions' | 'submitted';

export default function PublicSurveyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();

  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [pageState, setPageState] = useState<PageState>('cover');
  const startTime = useRef(Date.now());

  useEffect(() => {
    fetch(`/api/surveys/public?code=${code}&ref=${code}`)
      .then(async r => {
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          throw new Error(data.error || '问卷不存在');
        }
        return r.json();
      })
      .then(data => setSurvey(data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [code]);

  function handleAnswer(questionId: string, value: unknown) {
    setAnswers(prev => {
      const next = { ...prev };
      const q = survey?.questions.find(q => q.id === questionId);
      if (q?.type === 'multiple_choice') {
        const arr = (prev[questionId] as string[]) || [];
        if (arr.includes(value as string)) {
          next[questionId] = arr.filter(v => v !== value);
        } else {
          next[questionId] = [...arr, value as string];
        }
      } else {
        next[questionId] = value;
      }
      return next;
    });
  }

  async function handleSubmit() {
    if (!survey) return;

    const missing = survey.questions.filter(q =>
      q.required && (
        answers[q.id] === undefined ||
        answers[q.id] === '' ||
        (Array.isArray(answers[q.id]) && (answers[q.id] as unknown[]).length === 0)
      )
    );
    if (missing.length > 0) {
      const firstMissing = survey.questions.indexOf(missing[0]);
      setCurrentStep(firstMissing);
      alert(`请完成必填题：${missing[0].title}`);
      return;
    }

    setSubmitting(true);
    try {
      const fingerprint = generateDeviceFingerprint();
      const duration = Math.round((Date.now() - startTime.current) / 1000);
      const res = await fetch('/api/surveys/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          survey_id: survey.id,
          answers,
          device_fingerprint: fingerprint,
          metadata: { duration_seconds: duration, user_agent: navigator.userAgent },
          sales_code: code,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 409) { setError('你已经提交过这份问卷了'); return; }
        throw new Error(data.error || '提交失败');
      }

      router.push(`/s/${code}/success`);
    } catch (e) {
      alert(e instanceof Error ? e.message : '提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 text-sm">加载问卷中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-3">😥</div>
          <p className="text-slate-600 text-sm">{error}</p>
          <p className="text-xs text-slate-400 mt-2">如有疑问请联系 Koala Study Advisors</p>
        </div>
      </div>
    );
  }

  if (!survey) return null;

  const brandColor = survey.brand_color || '#D4A843';
  const questions = survey.questions || [];
  const estimatedMinutes = Math.max(1, Math.ceil(questions.length * 0.5));

  // Cover page
  if (pageState === 'cover') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center space-y-5">
          {survey.cover_image && (
            <img src={survey.cover_image} alt="" className="w-full h-40 object-cover rounded-xl" />
          )}
          <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center text-2xl" style={{ backgroundColor: `${brandColor}15` }}>
            📋
          </div>
          <h1 className="text-xl font-bold text-slate-800">{survey.title}</h1>
          {survey.description && (
            <p className="text-sm text-slate-500 leading-relaxed">{survey.description}</p>
          )}
          {survey.welcome_message && (
            <p className="text-sm text-slate-600">{survey.welcome_message}</p>
          )}
          <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
            <span>共 {questions.length} 题</span>
            <span>·</span>
            <span>约 {estimatedMinutes} 分钟</span>
          </div>
          <button
            onClick={() => { setPageState('questions'); startTime.current = Date.now(); }}
            className="w-full py-3 rounded-xl text-white text-sm font-medium"
            style={{ backgroundColor: brandColor }}
          >
            开始填写
          </button>
          <p className="text-xs text-slate-300">您的回答将被保密处理</p>
        </div>
      </div>
    );
  }

  // Questions
  const currentQuestion = questions[currentStep];
  const isLastStep = currentStep >= questions.length - 1;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-slate-200 z-50">
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${((currentStep + 1) / questions.length) * 100}%`, backgroundColor: brandColor }}
        />
      </div>

      <div className="max-w-lg mx-auto px-4 pt-12 pb-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-lg font-bold text-slate-800">{survey.title}</h1>
          <p className="text-xs text-slate-400 mt-1">{currentStep + 1} / {questions.length}</p>
        </div>

        {/* Current question */}
        {currentQuestion && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
            <div className="flex items-start gap-1">
              <h2 className="text-base font-medium text-slate-800">{currentQuestion.title}</h2>
              {currentQuestion.required && <span className="text-red-400 text-sm">*</span>}
            </div>
            {currentQuestion.description && (
              <p className="text-sm text-slate-400">{currentQuestion.description}</p>
            )}
            <QuestionRenderer
              question={currentQuestion}
              value={answers[currentQuestion.id]}
              onChange={v => handleAnswer(currentQuestion.id, v)}
              brandColor={brandColor}
            />
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-6">
          {currentStep > 0 && (
            <button
              onClick={() => setCurrentStep(s => s - 1)}
              className="px-6 py-3 rounded-xl text-sm text-slate-500 bg-white border border-slate-200 hover:bg-slate-50"
            >
              上一题
            </button>
          )}
          {isLastStep ? (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-3 rounded-xl text-white text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: brandColor }}
            >
              {submitting ? '提交中...' : '提交问卷'}
            </button>
          ) : (
            <button
              onClick={() => setCurrentStep(s => Math.min(questions.length - 1, s + 1))}
              className="flex-1 py-3 rounded-xl text-white text-sm font-medium"
              style={{ backgroundColor: brandColor }}
            >
              下一题
            </button>
          )}
        </div>

        {/* Quick nav dots */}
        <div className="flex justify-center gap-1.5 mt-6">
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              className="w-2 h-2 rounded-full transition-all"
              style={{
                backgroundColor: i === currentStep ? brandColor : answers[questions[i].id] !== undefined ? `${brandColor}60` : '#e2e8f0',
              }}
            />
          ))}
        </div>

        <div className="text-center mt-8">
          <span className="text-xs text-slate-300">Powered by Koala Study Advisors</span>
        </div>
      </div>
    </div>
  );
}
