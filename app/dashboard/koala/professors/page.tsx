'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Filter, ChevronDown, ExternalLink, AlertTriangle } from 'lucide-react';

interface Professor {
  id: string;
  name: string;
  university: string;
  faculty: string | null;
  position_title: string | null;
  email: string | null;
  research_areas: string[];
  h_index: number | null;
  citation_count: number | null;
  accepting_students: string | null;
  verification_status: string;
  updated_at: string | null;
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

export default function ProfessorsPage() {
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [university, setUniversity] = useState('All');
  const [status, setStatus] = useState('All');
  const [missingFilter, setMissingFilter] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetch('/api/professors')
      .then(r => r.json())
      .then(({ data }) => { setProfessors(data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = professors.filter(p => {
    if (search) {
      const q = search.toLowerCase();
      if (!p.name.toLowerCase().includes(q) &&
          !p.university.toLowerCase().includes(q) &&
          !(p.research_areas || []).some(a => a.toLowerCase().includes(q)) &&
          !(p.email || '').toLowerCase().includes(q)) {
        return false;
      }
    }
    if (university !== 'All' && p.university !== university) return false;
    if (status !== 'All' && p.verification_status !== status) return false;
    if (missingFilter === 'no_email' && p.email) return false;
    if (missingFilter === 'no_faculty' && p.faculty) return false;
    if (missingFilter === 'has_all' && (!p.email || !p.faculty)) return false;
    return true;
  });

  const missingEmailCount = professors.filter(p => !p.email).length;
  const missingFacultyCount = professors.filter(p => !p.faculty).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">教授库管理</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            共 {professors.length} 位教授
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
            placeholder="搜索教授名、大学、研究方向、邮箱..."
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
            <label className="block text-[11px] text-slate-500 mb-1">数据完整性</label>
            <select value={missingFilter} onChange={e => setMissingFilter(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
              <option value="All">全部</option>
              <option value="no_email">缺少邮箱</option>
              <option value="no_faculty">缺少学院</option>
              <option value="has_all">数据完整</option>
            </select>
          </div>
        </div>
      )}

      {/* Results count */}
      <div className="text-xs text-slate-400">
        显示 {filtered.length} / {professors.length} 位教授
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
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">无匹配结果</td></tr>
              ) : (
                filtered.map(prof => {
                  const sc = STATUS_COLORS[prof.verification_status] || STATUS_COLORS.Pending;
                  return (
                    <tr key={prof.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/koala/professors/${prof.id}`} className="text-sm font-medium text-slate-800 hover:text-blue-600 no-underline">
                          {prof.name}
                        </Link>
                        {prof.position_title && (
                          <p className="text-[11px] text-slate-400 mt-0.5">{prof.position_title}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{prof.university}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {(prof.research_areas || []).slice(0, 2).map(a => (
                            <span key={a} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{a}</span>
                          ))}
                          {(prof.research_areas || []).length > 2 && (
                            <span className="text-[10px] text-slate-400">+{prof.research_areas.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{prof.h_index ?? '—'}</td>
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
                          {prof.verification_status}
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
    </div>
  );
}
