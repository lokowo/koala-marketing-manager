'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AnalyticsCharts from '../../../../components/survey/AnalyticsCharts';

interface AnalyticsData {
  total_responses: number;
  completion_rate: number;
  avg_completion_time_seconds: number;
  responses_by_day: Array<{ date: string; count: number }>;
  responses_by_source: Array<{ source: string; count: number }>;
  question_stats: Array<{
    question_id: string;
    question_title: string;
    question_type: string;
    answer_distribution: Record<string, number>;
    text_answers?: string[];
  }>;
}

interface Survey {
  id: string;
  title: string;
  brand_color?: string;
}

function AnalyticsContent() {
  const searchParams = useSearchParams();
  const surveyId = searchParams.get('id');

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!surveyId) return;
    Promise.all([
      fetch(`/api/surveys/${surveyId}`).then(r => r.json()),
      fetch(`/api/surveys/analytics?survey_id=${surveyId}`).then(r => r.json()),
      fetch('/api/admin/me').then(r => r.ok ? r.json() : null),
    ]).then(([s, a, me]) => {
      setSurvey(s);
      setAnalytics(a);
      if (me?.role) setRole(me.role);
    }).finally(() => setLoading(false));
  }, [surveyId]);

  if (loading) return <div className="text-center py-20 text-slate-400 text-sm">加载分析数据...</div>;
  if (!survey || !analytics) return <div className="text-center py-20 text-slate-500">问卷不存在</div>;

  const canSeeResponses = role === 'super_admin' || role === 'admin';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/koala/surveys" className="text-slate-400 hover:text-slate-600 text-sm no-underline">&larr; 返回</Link>
          <h1 className="text-lg font-bold text-slate-800">{survey.title} — 数据分析</h1>
        </div>
        {canSeeResponses && (
          <Link
            href={`/dashboard/koala/surveys/responses?id=${surveyId}`}
            className="px-4 py-2 rounded-lg text-sm text-slate-600 border border-slate-200 hover:bg-slate-50 no-underline"
          >
            查看回复明细
          </Link>
        )}
      </div>

      <AnalyticsCharts data={analytics} brandColor={survey.brand_color} />
    </div>
  );
}

export default function AnalyticsPage() {
  return <Suspense fallback={<div className="text-center py-20 text-slate-400 text-sm">加载中...</div>}><AnalyticsContent /></Suspense>;
}
