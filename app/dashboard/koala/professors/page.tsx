'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Search, Filter, ChevronDown, ChevronLeft, ChevronRight, ExternalLink, AlertTriangle } from 'lucide-react';

interface Professor {
  id: string;
  name: string;
  university: string;
  faculty: string;
  positionTitle: string | null;
  email: string;
  researchAreas: string[];
  hIndex: number | null;
  citationCount: number | null;
  acceptingStudents: string | null;
  verificationStatus: string;
  updatedAt: string | null;
}

interface ApiResponse {
  data: Professor[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

const UNIVERSITIES = [
  'All', 'University of Melbourne', 'University of Sydney', 'UNSW Sydney',
  'Australian National University', 'University of Queensland', 'Monash University',
  'University of Western Australia', 'University of Adelaide',
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Verified: { bg: '#dcfce7', text: '#16a34a' },
  Pending: { bg: '#fef3c7', text: '#d97706' },
  Rejected: { bg: '#fee2e2', text: '#dc2626' },
};

const PAGE_SIZES = [50, 100] as const;

export default function ProfessorsPage() {
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [university, setUniversity] = useState('All');
  const [status, setStatus] = useState('Verified');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(50);

  // Stats from quality API — fetched once
  const [missingEmailCount, setMissingEmailCount] = useState(0);
  const [missingFacultyCount, setMissingFacultyCount] = useState(0);
  const statsLoaded = useRef(false);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, university, status, pageSize]);

  // Build URL and fetch professors
  const fetchProfessors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(pageSize));
      params.set('showAll', 'true');

      if (debouncedSearch) params.set('search', debouncedSearch);
      if (university !== 'All') params.set('university', university);
      if (status !== 'All') params.set('verificationStatus', status);

      const res = await fetch(`/api/professors?${params.toString()}`);
      const json: ApiResponse = await res.json();

      setProfessors(json.data || []);
      setTotal(json.total ?? 0);
    } catch {
      setProfessors([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, university, status]);

  useEffect(() => {
    fetchProfessors();
  }, [fetchProfessors]);

  // Fetch stats from quality API (server-side counts) once on mount
  useEffect(() => {
    if (statsLoaded.current) return;
    statsLoaded.current = true;

    fetch('/api/admin/quality?limit=1')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.stats) {
          setMissingEmailCount(d.stats.missingEmail ?? 0);
          setMissingFacultyCount(d.stats.missingFaculty ?? 0);
        }
      })
      .catch(() => {});
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Generate visible page numbers (show up to 7 pages around current)
  const getPageNumbers = (): (number | '...')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | '...')[] = [1];
    const start = Math.max(2, page - 2);
    const end = Math.min(totalPages - 1, page + 2);
    if (start > 2) pages.push('...');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push('...');
    pages.push(totalPages);
    return pages;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">教授库管理</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            共 {total} 位学者
            {missingEmailCount > 0 && <span className="text-amber-600 ml-2">· {missingEmailCount} 缺邮箱</span>}
            {missingFacultyCount > 0 && <span className="text-amber-600 ml-2">· {missingFacultyCount} 缺学院</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/koala/professors/quality"
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 no-underline flex items-center gap-1.5"
          >
            🔍 数据质量
          </Link>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索教授名、大学、研究方向..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400"
          />
        </div>
        <button
          onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg transition-colors ${
            showFilters ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Filter className="size-3.5" />
          筛选
          <ChevronDown className={`size-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {showFilters && (
        <div className="flex gap-3 flex-wrap bg-slate-50 rounded-lg p-3">
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">大学</label>
            <select value={university} onChange={e => setUniversity(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
              {UNIVERSITIES.map(u => <option key={u} value={u}>{u === 'All' ? '全部' : u}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">审核状态</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
              <option value="All">全部</option>
              <option value="Verified">已验证</option>
              <option value="Pending">待审核</option>
              <option value="Rejected">已拒绝</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">每页显示</label>
            <select
              value={pageSize}
              onChange={e => setPageSize(Number(e.target.value) as (typeof PAGE_SIZES)[number])}
              className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
            >
              {PAGE_SIZES.map(s => <option key={s} value={s}>{s} 条</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Results count */}
      <div className="text-xs text-slate-400">
        {loading ? '加载中...' : (
          <>
            第 {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} 条，共 {total} 位学者
          </>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-slate-600 font-medium text-xs">教授</th>
                <th className="text-left px-4 py-3 text-slate-600 font-medium text-xs">大学</th>
                <th className="text-left px-4 py-3 text-slate-600 font-medium text-xs">研究方向</th>
                <th className="text-left px-4 py-3 text-slate-600 font-medium text-xs">H-index</th>
                <th className="text-left px-4 py-3 text-slate-600 font-medium text-xs">邮箱</th>
                <th className="text-left px-4 py-3 text-slate-600 font-medium text-xs">状态</th>
                <th className="px-4 py-3 text-xs" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">加载中...</td></tr>
              ) : professors.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">无匹配结果</td></tr>
              ) : (
                professors.map(prof => {
                  const sc = STATUS_COLORS[prof.verificationStatus] || STATUS_COLORS.Pending;
                  return (
                    <tr key={prof.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/koala/professors/${prof.id}`} className="text-sm font-medium text-slate-800 hover:text-blue-600 no-underline">
                          {prof.name}
                        </Link>
                        {prof.positionTitle && (
                          <p className="text-[11px] text-slate-400 mt-0.5">{prof.positionTitle}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{prof.university}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {(prof.researchAreas || []).slice(0, 2).map(a => (
                            <span key={a} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{a}</span>
                          ))}
                          {(prof.researchAreas || []).length > 2 && (
                            <span className="text-[10px] text-slate-400">+{prof.researchAreas.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{prof.hIndex ?? '—'}</td>
                      <td className="px-4 py-3 text-xs">
                        {prof.email ? (
                          <span className="text-slate-600">{prof.email}</span>
                        ) : (
                          <span className="flex items-center gap-1 text-amber-600">
                            <AlertTriangle className="size-3" /> 缺失
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: sc.bg, color: sc.text }}>
                          {prof.verificationStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/koala/professors/${prof.id}`}
                          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 no-underline"
                        >
                          详情 <ExternalLink className="size-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination controls */}
      {!loading && total > 0 && (
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-slate-400">
            共 {totalPages} 页
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="上一页"
            >
              <ChevronLeft className="size-4" />
            </button>

            {getPageNumbers().map((n, i) =>
              n === '...' ? (
                <span key={`dots-${i}`} className="px-2 text-xs text-slate-400">...</span>
              ) : (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`min-w-[32px] h-8 rounded-lg text-xs font-medium transition-colors ${
                    n === page
                      ? 'bg-slate-800 text-white'
                      : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {n}
                </button>
              )
            )}

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="下一页"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
