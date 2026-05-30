'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, X, ClipboardList } from 'lucide-react';

type TabKey = 'verified' | 'downgraded' | 'search';

type AcceptingValue = 'yes' | 'likely' | 'maybe' | 'no' | '';

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
  accepting_students: string | null;
  recruitment_slots: number | null;
  recruitment_intel: string | null;
  recruitment_deadline: string | null;
  recruitment_updated_at: string | null;
  recruitment_updated_by: string | null;
}

interface ApiResponse {
  professors: Professor[];
  total: number;
  page: number;
  pageSize: number;
  updaters?: Record<string, string>;
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
  const [updaters, setUpdaters] = useState<Record<string, string>>({});
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [recruitProf, setRecruitProf] = useState<Professor | null>(null);

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
        setUpdaters({ ...(v.updaters ?? {}), ...(d.updaters ?? {}) });
      } else {
        const res = await fetch(`/api/admin/professors/verification?${params.toString()}`);
        if (!res.ok) {
          setProfessors([]);
          setTotal(0);
          setUpdaters({});
        } else {
          const d: ApiResponse = await res.json();
          setProfessors(d.professors || []);
          setTotal(d.total || 0);
          setPageSize(d.pageSize || 50);
          setUpdaters(d.updaters ?? {});
        }
      }
    } catch {
      setProfessors([]);
      setTotal(0);
      setUpdaters({});
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
                updaterName={p.recruitment_updated_by ? updaters[p.recruitment_updated_by] ?? null : null}
                onUnverify={() => setConfirm({ professor: p, action: 'unverify' })}
                onVerify={() => setConfirm({ professor: p, action: 'verify' })}
                onEditRecruitment={() => setRecruitProf(p)}
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

      {/* Recruitment intel modal */}
      {recruitProf && (
        <RecruitmentModal
          professor={recruitProf}
          updaterName={recruitProf.recruitment_updated_by ? updaters[recruitProf.recruitment_updated_by] ?? null : null}
          onClose={() => setRecruitProf(null)}
          onSaved={(updated) => {
            setProfessors((list) => list.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
            setRecruitProf(null);
            showToast(`已更新 ${updated.name} 的招生情报`, 'success');
          }}
          onError={(msg) => showToast(msg, 'error')}
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

const ACCEPTING_META: Record<string, { label: string; cls: string }> = {
  yes:    { label: '✅ 招生中',   cls: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700' },
  likely: { label: '🟡 可能招生', cls: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700' },
  maybe:  { label: '🟠 也许招生', cls: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700' },
  no:     { label: '🔴 不招生',   cls: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700' },
};

function formatYmd(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

function ProfessorRow({
  professor,
  updaterName,
  onUnverify,
  onVerify,
  onEditRecruitment,
}: {
  professor: Professor;
  updaterName: string | null;
  onUnverify: () => void;
  onVerify: () => void;
  onEditRecruitment: () => void;
}) {
  const isVerified = professor.verification_status === 'Verified';
  const areas = professor.research_areas?.slice(0, 4) ?? [];
  const extra = (professor.research_areas?.length ?? 0) - areas.length;
  const acc = professor.accepting_students && ACCEPTING_META[professor.accepting_students]
    ? ACCEPTING_META[professor.accepting_students]
    : null;
  const hasIntel = !!(professor.recruitment_intel || professor.recruitment_slots !== null || professor.recruitment_deadline || acc);

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
          {acc && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${acc.cls}`}>{acc.label}</span>
          )}
          {professor.recruitment_slots !== null && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700">
              剩 {professor.recruitment_slots} 名
            </span>
          )}
          {professor.recruitment_deadline && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700">
              截止 {formatYmd(professor.recruitment_deadline)}
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
        {professor.recruitment_intel && (
          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1.5 line-clamp-2 italic">
            <ClipboardList className="inline size-3 mr-1 -mt-0.5" />
            {professor.recruitment_intel}
          </p>
        )}
        {professor.recruitment_updated_at && (
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
            情报更新：{new Date(professor.recruitment_updated_at).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            {updaterName && <> · {updaterName}</>}
          </p>
        )}
      </div>
      <div className="flex-shrink-0 flex flex-col gap-1.5 items-end">
        <button
          onClick={onEditRecruitment}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1 ${
            hasIntel
              ? 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50'
              : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          title={hasIntel ? '编辑招生情报' : '录入招生情报'}
        >
          <ClipboardList className="size-3.5" />
          招生情报
        </button>
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

function RecruitmentModal({
  professor,
  updaterName,
  onClose,
  onSaved,
  onError,
}: {
  professor: Professor;
  updaterName: string | null;
  onClose: () => void;
  onSaved: (updated: Professor) => void;
  onError: (msg: string) => void;
}) {
  const [accepting, setAccepting] = useState<AcceptingValue>(
    (professor.accepting_students ?? '') as AcceptingValue,
  );
  const [slots, setSlots] = useState<string>(
    professor.recruitment_slots === null || professor.recruitment_slots === undefined
      ? ''
      : String(professor.recruitment_slots),
  );
  const [intel, setIntel] = useState<string>(professor.recruitment_intel ?? '');
  const [deadline, setDeadline] = useState<string>(professor.recruitment_deadline ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        professorId: professor.id,
        accepting_students: accepting === '' ? null : accepting,
        recruitment_intel: intel.trim() === '' ? null : intel.trim(),
        recruitment_deadline: deadline === '' ? null : deadline,
      };
      if (slots.trim() === '') {
        body.recruitment_slots = null;
      } else {
        const n = Number(slots);
        if (!Number.isFinite(n) || n < 0 || n > 99) {
          onError('剩余名额必须是 0-99 的整数');
          setSaving(false);
          return;
        }
        body.recruitment_slots = Math.floor(n);
      }
      const res = await fetch('/api/admin/professors/recruitment', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        onError(json.error || '保存失败');
        return;
      }
      onSaved({ ...professor, ...json.professor });
    } catch {
      onError('网络错误');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 p-5 border-b border-gray-100 dark:border-gray-700">
          <div className="size-9 rounded-full flex items-center justify-center flex-shrink-0 bg-blue-100 dark:bg-blue-900/40">
            <ClipboardList className="size-5 text-blue-600 dark:text-blue-300" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">招生情报</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              {professor.name} · {professor.university}
            </p>
          </div>
          <button onClick={onClose} disabled={saving} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 disabled:opacity-50">
            <X className="size-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">招生状态</label>
            <select
              value={accepting}
              onChange={(e) => setAccepting(e.target.value as AcceptingValue)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="">— 未设置 —</option>
              <option value="yes">✅ 招生中</option>
              <option value="likely">🟡 可能招生</option>
              <option value="maybe">🟠 也许招生</option>
              <option value="no">🔴 不招生</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">剩余名额</label>
              <input
                type="number"
                min={0}
                max={99}
                value={slots}
                onChange={(e) => setSlots(e.target.value)}
                placeholder="留空=未知"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">截止日期</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">情报备注</label>
            <textarea
              value={intel}
              onChange={(e) => setIntel(e.target.value)}
              rows={4}
              maxLength={4000}
              placeholder="例如：这学期还剩 1 个名额，要求 GPA 3.5+，6 月底截止。"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">将用于 Ola 学姐的导师推荐话术，请保持精炼真实。</p>
          </div>

          {professor.recruitment_updated_at && (
            <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2.5 border border-gray-100 dark:border-gray-700">
              上次更新：{new Date(professor.recruitment_updated_at).toLocaleString('zh-CN')}
              {updaterName && <> · {updaterName}</>}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 pb-5">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? '保存中…' : '保存情报'}
          </button>
        </div>
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
