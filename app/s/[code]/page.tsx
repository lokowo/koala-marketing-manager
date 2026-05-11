'use client';

import { useEffect, useState, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { generateDeviceFingerprint } from '../../lib/services/deviceFingerprint';

const SurveyRenderer = dynamic(
  () => import('../../components/survey/SurveyRenderer'),
  { ssr: false, loading: () => <div className="min-h-screen bg-slate-50 flex items-center justify-center"><span className="text-slate-400 text-sm">加载问卷中...</span></div> }
);

interface SurveyData {
  id: string;
  title: string;
  survey_json?: Record<string, unknown>;
}

export default function PublicSurveyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();

  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitError, setSubmitError] = useState('');
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

  async function handleComplete(results: Record<string, unknown>) {
    if (!survey) return;

    try {
      const fingerprint = generateDeviceFingerprint();
      const duration = Math.round((Date.now() - startTime.current) / 1000);
      const res = await fetch('/api/surveys/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          survey_id: survey.id,
          answers: results,
          device_fingerprint: fingerprint,
          metadata: { duration_seconds: duration, user_agent: navigator.userAgent },
          sales_code: code,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 409) {
          setSubmitError('你已经提交过这份问卷了');
          return;
        }
        throw new Error(data.error || '提交失败');
      }

      router.push(`/s/${code}/success`);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : '提交失败，请重试');
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

  if (!survey?.survey_json) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-4xl mb-3">😥</div>
          <p className="text-slate-600 text-sm">问卷数据加载异常</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto py-6 px-4">
        <SurveyRenderer
          surveyJson={survey.survey_json}
          onComplete={handleComplete}
        />
        {submitError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-center">
            <p className="text-sm text-red-600">{submitError}</p>
          </div>
        )}
        <div className="text-center mt-6">
          <span className="text-xs text-slate-300">Powered by Koala Study Advisors</span>
        </div>
      </div>
    </div>
  );
}
