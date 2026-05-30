'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, X } from 'lucide-react';

type TabKey = 'verified' | 'downgraded' | 'search';

interface Professor {
  id: string;
  name: string;
  university: string;
  data_sources: string[] | null;
  research_areas: string[] | null;
  verification_status: string;
  downgrade_reason: string | null;
  position_title: string | null;
  verified_at: string | null;
  downgraded_at: string | null;
}

interface ApiResponse {
  professors: Professor[];
  total: number;
  page: number;
  pageSize: number;
}

interface ConfirmState {
  professor: Professor;
  action: 'verify' | 'unverify';
}

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

export default function ProfessorsVerifiedPage() {
  const [tab, setTab] = useState<TabKey>('verified');
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => { setPage(1); }, [tab, debouncedSearch]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const statusParam = tab === 'downgraded' ? 'downgraded' : tab === 'search' ? 'Verified' : 'Verified';
      const params = new URLSearchParams({ status: statusParam, page: String(page) });
      if (tab === 'search' && debouncedSearch.trim()) {
        params.set('search', debouncedSearch.trim());
      }

      // 搜索 tab：同时拉 Verified 和 downgraded（合并展示）
      if (tab === 'search') {
        const [vRes, dRes] = await Promise.all([
          fetch(`/api/admin/professors/verification?status=Verified&page=${page}${debouncedSearch.trim() ? `&search=${encodeURIComponent(debouncedSearch.trim())}` : ''}`),
          fetch(`/api/admin/professors/verification?status=downgraded&page=${page}${debouncedSearch.trim() ? `&search=${encodeURIComponent(debouncedSearch.trim())}` : ''}`),
        ]);
        const v: ApiResponse = vRes.ok ? await vRes.json() : { professors: [], total: 0, page, pageSize: 50 };
        const d: ApiResponse = dRes.ok ? await dRes.json() : { professors: [], total: 0, page, pageSize: 50 };
        const merged = [...v.professors, ...d.professors].sort((a, b) => a.name.localeCompare(b.name));
        setProfessors(merged);
        setTotal(v.total + d.total);
        setPageSize(v.pageSize || 50);
      } else {
        const res = await fetch(`/api/admin/professors/verification?${params.toString()}`);
        if (!res.ok) {
          setProfessors([]);
          setTotal(0);
        } else {
          const d: ApiResponse = await res.json();
          setProfessors(d.professors || []);
          setTotal(d.total || 0);
          setPageSize(d.pageSize || 50);
        }
      }
    } catch {
      setProfessors([]);
      setTotal(0);
    }
    setLoading(false);
  }, [tab, page, debouncedSearch]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  const handleAction = async () => {
    if (!confirm) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/professors/verification', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          professorId: confirm.professor.id,
          action: confirm.action,
          reason: confirm.action === 'unverify' ? 'manual_admin' : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || '操作失败', 'error');
      } else {
        showToast(
          confirm.action === 'verify'
            ? `已恢复 ${confirm.professor.name} 为 Verified`
            : `已将 ${confirm.professor.name} 移出 Verified`,
          'success'
        );
        setConfirm(null);
        fetchData();
      }
    } catch {
      showToast('网络错误，请重试', 'error');
    }
    setSubmitting(false);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div>
        <h2 className="text-2xl font-light tracking-tight text-gray-900 dark:text-gray-100">教授审核中心</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">管理 Verified 教授池 — 控制学生端推荐范围</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        <TabButton active={tab === 'verified'} onClick={() => setTab('verified')}>
          ✅ 已发布<span className="text-gray-400 text-xs ml-1">(Verified)</span>
        </TabButton>
        <TabButton active={tab === 'downgraded'} onClick={() => setTab('downgraded')}>
          ⚠️ 待审核<span className="text-gray-400 text-xs ml-1">(降级)</span>
        </TabButton>
        <TabButton active={tab === 'search'} onClick={() => setTab('search')}>
          🔍 搜索
        </TabButton>
      </div>

      {/* Search box (always shown in search tab) */}
      {tab === 'search' && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="按教授名 / 大学搜索（合并显示 Verified + 降级）"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
      )}

      {/* Count bar */}
      <div className="text-xs text-gray-500 dark:text-gray-400">
        {loading ? '加载中…' : `共 ${total.toLocaleString()} 位教授`}
        {tab === 'downgraded' && total > 0 && (
          <span className="ml-2 text-amber-600 dark:text-amber-400">— 这些教授当前不会被推荐给学生</span>
        )}
      </div>

      {/* List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {loading && professors.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">加载中…</div>
        ) : professors.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-2">📭</div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {tab === 'search' && !debouncedSearch ? '输入关键词开始搜索' : '暂无数据'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
            {professors.map((p) => (
              <ProfessorRow
                key={p.id}
                professor={p}
                onUnverify={() => setConfirm({ professor: p, action: 'unverify' })}
                onVerify={() => setConfirm({ professor: p, action: 'verify' })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            第 {page} / {totalPages} 页 · 每页 {pageSize}
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* Confirm modal */}
      {confirm && (
        <ConfirmModal
          professor={confirm.professor}
          action={confirm.action}
          submitting={submitting}
          onConfirm={handleAction}
          onCancel={() => !submitting && setConfirm(null)}
        />
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active
          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
      }`}
    >
      {children}
    </button>
  );
}

function SourceTag({ dataSources }: { dataSources: string[] | null }) {
  const isOfficial = Array.isArray(dataSources) && dataSources.includes('university_website');
  return (
    <span
      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
        isOfficial
          ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
          : 'bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-400'
      }`}
      title={isOfficial ? '来源含大学官网' : '仅来自论文/学术数据库'}
    >
      {isOfficial ? '官网' : '论文库'}
    </span>
  );
}

function ProfessorRow({
  professor,
  onUnverify,
  onVerify,
}: {
  professor: Professor;
  onUnverify: () => void;
  onVerify: () => void;
}) {
  const isVerified = professor.verification_status === 'Verified';
  const areas = professor.research_areas?.slice(0, 4) ?? [];
  const extra = (professor.research_areas?.length ?? 0) - areas.length;

  return (
    <div className="px-4 py-3 flex items-start justify-between gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{professor.name}</span>
          {professor.position_title && (
            <span className="text-xs text-gray-500 dark:text-gray-400">{professor.position_title}</span>
          )}
          <SourceTag dataSources={professor.data_sources} />
          {!isVerified && professor.downgrade_reason && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
              {professor.downgrade_reason}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{professor.university}</p>
        {areas.length > 0 && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {areas.map((a, i) => (
              <span
                key={`${a}-${i}`}
                className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
              >
                {a}
              </span>
            ))}
            {extra > 0 && <span className="text-[10px] text-gray-400">+{extra}</span>}
          </div>
        )}
      </div>
      <div className="flex-shrink-0">
        {isVerified ? (
          <button
            onClick={onUnverify}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
          >
            去 Verified
          </button>
        ) : (
          <button
            onClick={onVerify}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
          >
            恢复 Verified
          </button>
        )}
      </div>
    </div>
  );
}

function ConfirmModal({
  professor,
  action,
  submitting,
  onConfirm,
  onCancel,
}: {
  professor: Professor;
  action: 'verify' | 'unverify';
  submitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const isVerify = action === 'verify';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onCancel}>
      <div
        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 p-5 border-b border-gray-100 dark:border-gray-700">
          <div
            className={`size-9 rounded-full flex items-center justify-center flex-shrink-0 ${
              isVerify ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-amber-100 dark:bg-amber-900/40'
            }`}
          >
            {isVerify ? (
              <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-300" />
            ) : (
              <AlertTriangle className="size-5 text-amber-600 dark:text-amber-300" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {isVerify ? '恢复 Verified？' : '移出 Verified？'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {professor.name} · {professor.university}
            </p>
          </div>
          <button
            onClick={onCancel}
            disabled={submitting}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 disabled:opacity-50"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="p-5">
          <div
            className={`text-sm rounded-lg p-3 ${
              isVerify
                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
            }`}
          >
            {isVerify
              ? '此教授将进入学生推荐池，C 端用户可在搜索/匹配结果中看到。'
              : '此教授将移出学生推荐池，C 端用户将不再看到。已发出的套磁信不受影响。'}
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 pb-5">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg text-white disabled:opacity-50 ${
              isVerify ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            {submitting ? '处理中…' : isVerify ? '确认恢复' : '确认移出'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 z-[60]">
      <div
        className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium border ${
          type === 'success'
            ? 'bg-green-50 dark:bg-green-900/80 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700'
            : 'bg-red-50 dark:bg-red-900/80 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700'
        }`}
      >
        <span>{type === 'success' ? '✓' : '✗'}</span>
        <span>{message}</span>
      </div>
    </div>
  );
}
