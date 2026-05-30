'use client';

import { useState, useEffect, useCallback } from 'react';

type Status = 'pending' | 'approved' | 'rejected';
type Role = 'super_admin' | 'admin' | 'sales' | 'viewer';

interface Suggestion {
  id: string;
  category: string;
  title: string;
  suggestion: string;
  evidence: string | null;
  source_sample_count: number | null;
  status: Status;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
}

const CATEGORY_LABELS: Record<string, { label: string; cls: string }> = {
  persona:   { label: '人设',   cls: 'bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300' },
  prompt:    { label: 'Prompt', cls: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
  knowledge: { label: '知识',   cls: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
  feature:   { label: '功能',   cls: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
  flow:      { label: '流程',   cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
};

export default function EvolutionReviewPage() {
  const [tab, setTab] = useState<Status>('pending');
  const [items, setItems] = useState<Suggestion[]>([]);
  const [reviewers, setReviewers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<Role | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const isSuper = role === 'super_admin';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/evolution?status=${tab}&limit=50`);
      if (r.ok) {
        const json = await r.json();
        setItems(json.data ?? []);
        setReviewers(json.reviewers ?? {});
        setRole(json.currentRole ?? null);
      } else {
        setItems([]);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  function openAction(id: string, type: 'approve' | 'reject') {
    setActionId(id);
    setActionType(type);
    setNoteDraft('');
  }

  function closeAction() {
    if (submitting) return;
    setActionId(null);
    setActionType(null);
    setNoteDraft('');
  }

  async function submitAction() {
    if (!actionId || !actionType) return;
    setSubmitting(true);
    try {
      const r = await fetch('/api/admin/evolution', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: actionId, action: actionType, review_note: noteDraft || null }),
      });
      const json = await r.json().catch(() => ({}));
      if (r.ok) {
        setToast(json.message || (actionType === 'approve' ? '已批准' : '已拒绝'));
        setActionId(null);
        setActionType(null);
        setNoteDraft('');
        await load();
      } else {
        setToast(json.error || '操作失败');
      }
    } finally {
      setSubmitting(false);
      setTimeout(() => setToast(null), 6000);
    }
  }

  function formatDate(d: string | null) {
    if (!d) return '';
    return new Date(d).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-light tracking-tight text-gray-900 dark:text-gray-100">Ola 全局进化审核</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          每周 Cron 自动分析对话数据，归纳出 AI 学到的"全局改进建议"。
          <span className="font-medium text-gray-700 dark:text-gray-300">所有建议需由 super_admin 审核批准后才能由人工/Claude 落地为 persona / prompt / 知识库改动。</span>
        </p>
      </div>

      {!isSuper && role === 'admin' && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-sm text-amber-800 dark:text-amber-200">
          你以 <span className="font-medium">admin</span> 身份登录，可查看全部建议，但批准 / 拒绝仅限 super_admin。
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
          {(['pending', 'approved', 'rejected'] as Status[]).map(s => (
            <button
              key={s}
              onClick={() => setTab(s)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                tab === s
                  ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-gray-100 font-medium'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {s === 'pending' ? '待审核' : s === 'approved' ? '已批准' : '已拒绝'}
            </button>
          ))}
        </div>
        <button onClick={load} className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">刷新</button>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm">加载中...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            {tab === 'pending' ? '暂无待审核的建议' : tab === 'approved' ? '暂无已批准的建议' : '暂无已拒绝的建议'}
          </div>
        ) : (
          items.map(s => {
            const cat = CATEGORY_LABELS[s.category] ?? { label: s.category, cls: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' };
            const reviewerName = s.reviewed_by ? (reviewers[s.reviewed_by] ?? s.reviewed_by.slice(0, 8)) : null;
            return (
              <div key={s.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${cat.cls}`}>{cat.label}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">基于 {s.source_sample_count ?? '—'} 条样本</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">· {formatDate(s.created_at)}</span>
                    </div>
                    <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-1.5">{s.title}</h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-2">{s.suggestion}</p>
                    {s.evidence && (
                      <div className="mt-2 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700">
                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">依据</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{s.evidence}</div>
                      </div>
                    )}
                    {s.status !== 'pending' && (
                      <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                        {s.status === 'approved' ? '✅ 已批准' : '❌ 已拒绝'}
                        {reviewerName && <> · 由 {reviewerName}</>}
                        {s.reviewed_at && <> · {formatDate(s.reviewed_at)}</>}
                        {s.review_note && (
                          <div className="mt-1 text-gray-600 dark:text-gray-400">备注：{s.review_note}</div>
                        )}
                      </div>
                    )}
                  </div>

                  {s.status === 'pending' && (
                    <div className="flex-shrink-0 flex flex-col gap-2 w-24">
                      {isSuper ? (
                        <>
                          <button
                            onClick={() => openAction(s.id, 'approve')}
                            className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                          >
                            批准
                          </button>
                          <button
                            onClick={() => openAction(s.id, 'reject')}
                            className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700"
                          >
                            拒绝
                          </button>
                        </>
                      ) : (
                        <button
                          disabled
                          title="仅超级管理员可批准"
                          className="px-3 py-1.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 rounded-lg cursor-not-allowed"
                        >
                          仅超管
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {actionId && actionType && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={closeAction}>
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-md p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
              确认{actionType === 'approve' ? '批准' : '拒绝'}此建议？
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              {actionType === 'approve'
                ? '批准后建议会被标记为 approved，但不会自动改 persona / 配置。需要你或 Claude Code 进一步落地。'
                : '拒绝后建议将归档，不会再出现在待审核列表。'}
            </p>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">审核备注（可选）</label>
            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder={actionType === 'approve' ? '例如：先用一周 A/B 试一下' : '例如：样本量太小'}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={closeAction}
                disabled={submitting}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={submitAction}
                disabled={submitting}
                className={`px-3 py-1.5 text-sm text-white rounded-lg disabled:opacity-50 ${
                  actionType === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {submitting ? '提交中…' : actionType === 'approve' ? '确认批准' : '确认拒绝'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm shadow-lg max-w-md text-center">
          {toast}
        </div>
      )}
    </div>
  );
}
