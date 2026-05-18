'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle, ExternalLink, ChevronLeft, ChevronRight, Zap } from 'lucide-react';

interface QualityIssue {
  id: string;
  name: string;
  university: string;
  issues: string[];
}

interface QualityStats {
  total: number;
  missingEmail: number;
  missingFaculty: number;
  missingProfile: number;
  missingScholar: number;
  noPapers: number;
  noGrants: number;
  complete: number;
}

interface EnrichResult {
  mode: string;
  processed: number;
  updated: number;
  skipped: number;
}

export default function QualityPage() {
  const [stats, setStats] = useState<QualityStats | null>(null);
  const [issues, setIssues] = useState<QualityIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalIssues, setTotalIssues] = useState(0);

  // Enrichment state
  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<EnrichResult | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        filter: filter === 'all' ? 'all' : filter,
        page: String(page),
        limit: '50',
      });
      const res = await fetch(`/api/admin/quality?${params}`);
      if (!res.ok) throw new Error();
      const d = await res.json();
      setStats(d.stats);
      setIssues(d.issues || []);
      setTotalPages(d.pagination?.totalPages ?? 1);
      setTotalIssues(d.pagination?.total ?? 0);
    } catch {
      // keep previous state
    }
    setLoading(false);
  }, [filter, page]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [filter]);

  const runEnrichment = async (mode: 'pattern' | 'ai', limit: number) => {
    setEnriching(true);
    setEnrichResult(null);
    try {
      const res = await fetch('/api/admin/enrich-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, limit }),
      });
      const data = await res.json();
      setEnrichResult(data);
      // Refresh stats after enrichment
      fetchData();
    } catch {
      setEnrichResult({ mode, processed: 0, updated: 0, skipped: 0 });
    }
    setEnriching(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">数据质量检查</h2>
          <p className="text-sm text-slate-500 mt-0.5">检测已验证教授数据的完整性问题</p>
        </div>
        <Link
          href="/dashboard/koala/professors"
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 no-underline"
        >
          返回教授库
        </Link>
      </div>

      {loading && !stats ? (
        <div className="text-sm text-slate-400">加载中...</div>
      ) : (
        <>
          {/* Stats overview */}
          {stats && (
            <>
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="grid grid-cols-3 divide-x divide-slate-200">
                  <div className="text-center px-4">
                    <div className="text-3xl font-bold text-slate-900">{stats.total.toLocaleString()}</div>
                    <div className="text-xs text-slate-500 mt-1">已验证教授总数</div>
                  </div>
                  <div className="text-center px-4">
                    <div className="text-3xl font-bold text-emerald-600">{stats.complete.toLocaleString()}</div>
                    <div className="text-xs text-slate-500 mt-1">数据完整</div>
                    <div className="text-[10px] text-slate-400">{stats.total > 0 ? Math.round((stats.complete / stats.total) * 100) : 0}%</div>
                  </div>
                  <div className="text-center px-4">
                    <div className="text-3xl font-bold text-amber-600">{(stats.total - stats.complete).toLocaleString()}</div>
                    <div className="text-xs text-slate-500 mt-1">缺少部分字段</div>
                    <div className="text-[10px] text-slate-400">{stats.total > 0 ? Math.round(((stats.total - stats.complete) / stats.total) * 100) : 0}%</div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard label="数据完整" value={stats.complete} total={stats.total} color="emerald" icon={<CheckCircle className="size-4" />} />
                <StatCard label="缺少邮箱" value={stats.missingEmail} total={stats.total} color="red" icon={<AlertTriangle className="size-4" />} />
                <StatCard label="缺少学院" value={stats.missingFaculty} total={stats.total} color="amber" icon={<AlertTriangle className="size-4" />} />
                <StatCard label="缺少 Profile URL" value={stats.missingProfile} total={stats.total} color="amber" icon={<AlertTriangle className="size-4" />} />
              </div>
            </>
          )}

          {/* Batch enrichment panel */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="size-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-slate-800">批量数据补全</h3>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              自动为缺失邮箱的教授生成 firstname.lastname@university.edu.au 格式邮箱，或使用 AI 搜索验证。
            </p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => runEnrichment('pattern', 500)}
                disabled={enriching}
                className="px-3 py-1.5 text-xs bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 font-medium"
              >
                {enriching ? '处理中...' : '邮箱模式补全 (500条)'}
              </button>
              <button
                onClick={() => runEnrichment('ai', 10)}
                disabled={enriching}
                className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 font-medium"
              >
                {enriching ? '处理中...' : 'AI 搜索补全 (10条)'}
              </button>
            </div>
            {enrichResult && (
              <div className="mt-3 p-2 bg-emerald-50 rounded-lg text-xs text-emerald-700">
                完成：处理 {enrichResult.processed} 条，更新 {enrichResult.updated} 条，跳过 {enrichResult.skipped} 条
              </div>
            )}
          </div>

          {/* Filter pills */}
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'all', label: '全部问题' },
              { key: 'missing_email', label: '缺邮箱' },
              { key: 'missing_faculty', label: '缺学院' },
              { key: 'missing_profile', label: '缺 Profile' },
              { key: 'missing_scholar', label: '缺 Scholar' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  filter === f.key
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Issues list */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 text-xs text-slate-500">
              {totalIssues} 位学者有数据问题
            </div>
            {issues.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle className="size-8 mx-auto text-emerald-300 mb-2" />
                <p className="text-sm text-slate-400">所有数据完整</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {issues.map(prof => (
                  <div key={prof.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <Link href={`/dashboard/koala/professors/${prof.id}`} className="text-sm font-medium text-slate-800 hover:text-blue-600 no-underline">
                        {prof.name}
                      </Link>
                      <p className="text-xs text-slate-400 mt-0.5">{prof.university}</p>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {prof.issues.map(issue => (
                          <span key={issue} className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600">
                            {issue}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Link href={`/dashboard/koala/professors/${prof.id}`} className="text-xs text-blue-600 no-underline flex items-center gap-1 flex-shrink-0 ml-3">
                      修复 <ExternalLink className="size-3" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <div className="text-xs text-slate-400">第 {page} / {totalPages} 页</div>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, total, color, icon }: {
  label: string; value: number; total: number; color: string; icon: React.ReactNode;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const colors: Record<string, { text: string; bar: string }> = {
    emerald: { text: 'text-emerald-700', bar: 'bg-emerald-400' },
    red: { text: 'text-red-700', bar: 'bg-red-400' },
    amber: { text: 'text-amber-700', bar: 'bg-amber-400' },
  };
  const c = colors[color] || colors.amber;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <span className={c.text}>{icon}</span>
      </div>
      <div className="text-2xl font-bold text-slate-900">{value.toLocaleString()}</div>
      <div className="flex items-center gap-2 mt-2">
        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${c.bar}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[10px] text-slate-400">{pct}%</span>
      </div>
    </div>
  );
}
