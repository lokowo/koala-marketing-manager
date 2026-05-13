'use client';

import { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';

interface Question {
  id: string;
  title: string;
  type: string;
}

interface SurveyResponse {
  id: string;
  answers: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  respondent_id?: string;
  source?: string;
  sales_code?: string;
  completed_at?: string;
  created_at: string;
}

export default function SalesResponsesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: surveyId } = use(params);

  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [surveyTitle, setSurveyTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!surveyId) return;
    setLoading(true);
    const [surveyRes, responsesRes] = await Promise.all([
      fetch(`/api/surveys/${surveyId}`).then(r => r.json()),
      fetch(`/api/surveys/responses?survey_id=${surveyId}&page=${page}&limit=30`).then(r => r.json()),
    ]);
    setSurveyTitle(surveyRes.title || '');
    setQuestions(surveyRes.questions || []);
    setResponses(responsesRes.responses || []);
    setTotal(responsesRes.total || 0);
    setLoading(false);
  }, [surveyId, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function formatAnswer(value: unknown): string {
    if (value === null || value === undefined) return '—';
    if (Array.isArray(value)) return value.join(', ');
    return String(value);
  }

  const selectedResponse = responses.find(r => r.id === selectedId);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/sales/surveys" className="text-slate-400 hover:text-slate-600 text-sm no-underline">&larr; 返回</Link>
        <h1 className="text-lg font-bold text-slate-800">{surveyTitle} — 回复明细</h1>
        <span className="text-sm text-slate-400">共 {total} 条</span>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">加载中...</div>
      ) : responses.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-slate-500 text-sm">暂无回复</p>
        </div>
      ) : (
        <div className="flex gap-5">
          <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-4 py-3 text-slate-500 font-medium">#</th>
                  <th className="px-4 py-3 text-slate-500 font-medium">提交时间</th>
                  <th className="px-4 py-3 text-slate-500 font-medium">姓名</th>
                  <th className="px-4 py-3 text-slate-500 font-medium">手机</th>
                  <th className="px-4 py-3 text-slate-500 font-medium">邮箱</th>
                  <th className="px-4 py-3 text-slate-500 font-medium">来源</th>
                  <th className="px-4 py-3 text-slate-500 font-medium">注册</th>
                  {questions.slice(0, 3).map(q => (
                    <th key={q.id} className="px-4 py-3 text-slate-500 font-medium max-w-[120px] truncate">{q.title}</th>
                  ))}
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {responses.map((r, i) => {
                  const meta = r.metadata || {};
                  return (
                    <tr key={r.id} className={`border-t border-slate-100 cursor-pointer transition-colors ${
                      selectedId === r.id ? 'bg-amber-50' : 'hover:bg-slate-50/50'
                    }`} onClick={() => setSelectedId(r.id)}>
                      <td className="px-4 py-3 text-slate-400">{(page - 1) * 30 + i + 1}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">
                        {new Date(r.created_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 text-slate-700 text-xs">{(meta.respondent_name as string) || '—'}</td>
                      <td className="px-4 py-3 text-slate-700 text-xs">{(meta.respondent_phone as string) || '—'}</td>
                      <td className="px-4 py-3 text-slate-700 text-xs">{(meta.respondent_email as string) || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          r.source === 'qrcode' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {r.source === 'qrcode' ? '二维码' : '直接访问'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {r.respondent_id ? (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-600">已注册</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-400">未注册</span>
                        )}
                      </td>
                      {questions.slice(0, 3).map(q => (
                        <td key={q.id} className="px-4 py-3 text-slate-600 text-xs max-w-[120px] truncate">
                          {formatAnswer(r.answers[q.id])}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs text-amber-500">查看</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {total > 30 && (
              <div className="flex items-center justify-center gap-2 py-3 border-t border-slate-100">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                  className="px-3 py-1 rounded text-sm text-slate-500 hover:bg-slate-100 disabled:opacity-40">上一页</button>
                <span className="text-sm text-slate-400">{page} / {Math.ceil(total / 30)}</span>
                <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 30)}
                  className="px-3 py-1 rounded text-sm text-slate-500 hover:bg-slate-100 disabled:opacity-40">下一页</button>
              </div>
            )}
          </div>

          {selectedResponse && (
            <div className="w-80 bg-white rounded-xl border border-slate-200 p-5 space-y-4 flex-shrink-0 self-start sticky top-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">回复详情</h3>
                <button onClick={() => setSelectedId(null)} className="text-slate-400 hover:text-slate-600 text-xs">关闭</button>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 space-y-1">
                <div className="text-xs font-medium text-slate-500 mb-1">联系信息</div>
                <div className="text-sm text-slate-700">{(selectedResponse.metadata?.respondent_name as string) || '—'}</div>
                <div className="text-xs text-slate-500">{(selectedResponse.metadata?.respondent_phone as string) || '—'}</div>
                <div className="text-xs text-slate-500">{(selectedResponse.metadata?.respondent_email as string) || '—'}</div>
                {selectedResponse.metadata?.respondent_wechat ? (
                  <div className="text-xs text-slate-500">微信: {String(selectedResponse.metadata.respondent_wechat)}</div>
                ) : null}
                {selectedResponse.respondent_id ? (
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-600">已注册</span>
                ) : (
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-400">未注册</span>
                )}
              </div>
              <div className="text-xs text-slate-400 space-y-1">
                <div>提交时间: {new Date(selectedResponse.created_at).toLocaleString('zh-CN')}</div>
                <div>来源: {selectedResponse.source === 'qrcode' ? '二维码' : '直接访问'}</div>
                {selectedResponse.sales_code && <div>Sales: {selectedResponse.sales_code}</div>}
              </div>
              <div className="border-t border-slate-100 pt-3 space-y-3">
                {questions.map(q => (
                  <div key={q.id}>
                    <div className="text-xs text-slate-400 mb-0.5">{q.title}</div>
                    <div className="text-sm text-slate-700">{formatAnswer(selectedResponse.answers[q.id])}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
