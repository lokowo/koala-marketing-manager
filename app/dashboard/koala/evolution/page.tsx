'use client';

import { useState, useEffect, useCallback } from 'react';

type Status = 'pending' | 'executed' | 'needs_human' | 'approved' | 'rejected';
type Role = 'super_admin' | 'admin' | 'sales' | 'viewer';

interface Fix {
  id: string;
  report_id: string | null;
  fix_type: string;
  target: string;
  section: string | null;
  change_description: string;
  data: unknown;
  status: Status | 'failed';
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  executed_at: string | null;
  created_at: string;
}

interface ReportSummary {
  week_number: number | null;
  summary: string | null;
  total_turns: number | null;
  unique_users: number | null;
  created_at: string;
}

interface ApiResponse {
  data: Fix[];
  total: number;
  reviewers: Record<string, string>;
  reports: Record<string, ReportSummary>;
  counts: Record<string, number>;
  currentRole: Role | null;
}

const FIX_TYPE_META: Record<string, { label: string; cls: string }> = {
  prompt_update: {
    label: 'prompt_update',
    cls: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-900',
  },
  knowledge_add: {
    label: 'knowledge_add',
    cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900',
  },
  requires_human: {
    label: 'requires_human',
    cls: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700',
  },
};

const STATUS_TABS: { key: Status; label: string }[] = [
  { key: 'pending', label: '待审核' },
  { key: 'executed', label: '已执行' },
  { key: 'needs_human', label: '需人工' },
  { key: 'approved', label: '已批准' },
  { key: 'rejected', label: '已拒绝' },
];

export default function EvolutionReviewPage() {
  const [tab, setTab] = useState<Status>('pending');
  const [items, setItems] = useState<Fix[]>([]);
  const [reviewers, setReviewers] = useState<Record<string, string>>({});
  const [reports, setReports] = useState<Record<string, ReportSummary>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
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
        const json = (await r.json()) as ApiResponse;
        setItems(json.data ?? []);
        setReviewers(json.reviewers ?? {});
        setReports(json.reports ?? {});
        setCounts(json.counts ?? {});
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

  useEffect(() => {
    load();
  }, [load]);

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
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
          每周 Cron 自动分析对话数据，AI 学到的改进建议会落入 <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs">ola_pending_fixes</code> 表。
          <br />
          <span className="text-gray-700 dark:text-gray-300">
            改 persona / prompt 的 <span className="font-medium">需 super_admin 批准后由 Claude Code 指令落地</span>；加知识的已自动执行（executed）；其他归入"需人工"。
          </span>
        </p>
      </div>

      {!isSuper && role === 'admin' && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-sm text-amber-800 dark:text-amber-200">
          你以 <span className="font-medium">admin</span> 身份登录，可查看全部 fix，但批准 / 拒绝 prompt_update 类 fix 仅限 super_admin。
        </div>
      )}

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors flex items-center gap-1 ${
                tab === t.key
                  ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-gray-100 font-medium'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t.label}
              {counts[t.key] !== undefined && counts[t.key] > 0 && (
                <span className="text-[10px] text-gray-400 dark:text-gray-500">({counts[t.key]})</span>
              )}
            </button>
          ))}
        </div>
        <button onClick={load} className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
          刷新
        </button>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm">加载中...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            该状态下暂无 fix
          </div>
        ) : (
          items.map((f) => {
            const meta = FIX_TYPE_META[f.fix_type] ?? {
              label: f.fix_type,
              cls: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700',
            };
            const reviewerName = f.reviewed_by ? reviewers[f.reviewed_by] ?? f.reviewed_by.slice(0, 8) : null;
            const report = f.report_id ? reports[f.report_id] : null;
            const isApprovable = f.fix_type === 'prompt_update' && f.status === 'pending';
            const isNonApprovablePending = f.fix_type !== 'prompt_update' && f.status === 'pending';
            return (
              <div
                key={f.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${meta.cls}`}>{meta.label}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[260px]" title={f.target}>
                        target: <code className="text-[11px]">{f.target}</code>
                      </span>
                      {f.section && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          section: <code className="text-[11px]">{f.section}</code>
                        </span>
                      )}
                      <span className="text-xs text-gray-400 dark:text-gray-500">· {formatDate(f.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed mb-2">
                      {f.change_description}
                    </p>

                    {report && (
                      <div className="mt-2 p-2.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900">
                        <div className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                          所属报告
                          {report.week_number !== null && <> · Week {report.week_number}</>}
                          <span className="text-[10px] text-blue-500 dark:text-blue-400 ml-1">
                            {formatDate(report.created_at)}
                          </span>
                        </div>
                        {report.summary && (
                          <div className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                            {report.summary}
                          </div>
                        )}
                        {(report.total_turns !== null || report.unique_users !== null) && (
                          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                            {report.total_turns !== null && <span>{report.total_turns} 轮对话</span>}
                            {report.unique_users !== null && <span> · {report.unique_users} 位用户</span>}
                          </div>
                        )}
                      </div>
                    )}

                    {f.status !== 'pending' && (
                      <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                        {f.status === 'executed' && <>✅ 已执行 {f.executed_at && <>· {formatDate(f.executed_at)}</>}</>}
                        {f.status === 'approved' && <>✅ 已批准</>}
                        {f.status === 'rejected' && <>❌ 已拒绝</>}
                        {f.status === 'needs_human' && <>⚠️ 需人工处理</>}
                        {f.status === 'failed' && <>⚠️ 执行失败</>}
                        {reviewerName && <> · 由 {reviewerName}</>}
                        {f.reviewed_at && <> · {formatDate(f.reviewed_at)}</>}
                        {f.review_note && (
                          <div className="mt-1 text-gray-600 dark:text-gray-400">备注：{f.review_note}</div>
                        )}
                      </div>
                    )}
                  </div>

                  {isApprovable && (
                    <div className="flex-shrink-0 flex flex-col gap-2 w-24">
                      {isSuper ? (
                        <>
                          <button
                            onClick={() => openAction(f.id, 'approve')}
                            className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                          >
                            批准
                          </button>
                          <button
                            onClick={() => openAction(f.id, 'reject')}
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
                  {isNonApprovablePending && (
                    <div className="flex-shrink-0 text-[11px] text-gray-400 dark:text-gray-500 max-w-[120px] text-right">
                      {f.fix_type === 'knowledge_add'
                        ? '知识入库类，Cron 会自动执行'
                        : '人工跟进类，无需审批'}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {actionId && actionType && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={closeAction}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-md p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
              确认{actionType === 'approve' ? '批准' : '拒绝'}此 prompt_update？
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">
              {actionType === 'approve'
                ? '批准后 status 会变为 approved，但本接口不会自动改 persona / 配置。需要你在 Claude Code 中引用此 fix ID 进行落地。'
                : '拒绝后此 fix 将归档，不会再出现在待审核列表。'}
            </p>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              审核备注（可选，≤2000 字）
            </label>
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
