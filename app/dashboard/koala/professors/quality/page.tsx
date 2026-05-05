'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';

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

export default function QualityPage() {
  const [stats, setStats] = useState<QualityStats | null>(null);
  const [issues, setIssues] = useState<QualityIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetch('/api/admin/quality')
      .then(r => r.ok ? r.json() : { stats: null, issues: [] })
      .then(d => {
        setStats(d.stats);
        setIssues(d.issues || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = filter === 'all'
    ? issues
    : issues.filter(i => i.issues.includes(filter));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">数据质量检查</h2>
        <p className="text-sm text-slate-500 mt-0.5">检测教授数据的完整性问题</p>
      </div>

      {loading ? (
        <div className="text-sm text-slate-400">加载中...</div>
      ) : (
        <>
          {/* Stats overview */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label="数据完整" value={stats.complete} total={stats.total} color="emerald" icon={<CheckCircle className="size-4" />} />
              <StatCard label="缺少邮箱" value={stats.missingEmail} total={stats.total} color="red" icon={<AlertTriangle className="size-4" />} />
              <StatCard label="缺少学院" value={stats.missingFaculty} total={stats.total} color="amber" icon={<AlertTriangle className="size-4" />} />
              <StatCard label="缺少 Profile URL" value={stats.missingProfile} total={stats.total} color="amber" icon={<AlertTriangle className="size-4" />} />
            </div>
          )}

          {/* Filter pills */}
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'all', label: '全部问题' },
              { key: 'missing_email', label: '缺邮箱' },
              { key: 'missing_faculty', label: '缺学院' },
              { key: 'missing_profile_url', label: '缺 Profile' },
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
              {filtered.length} 位教授有数据问题
            </div>
            {filtered.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle className="size-8 mx-auto text-emerald-300 mb-2" />
                <p className="text-sm text-slate-400">所有数据完整</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {filtered.slice(0, 100).map(prof => (
                  <div key={prof.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <Link href={`/dashboard/koala/professors/${prof.id}`} className="text-sm font-medium text-slate-800 hover:text-blue-600 no-underline">
                        {prof.name}
                      </Link>
                      <p className="text-xs text-slate-400 mt-0.5">{prof.university}</p>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {prof.issues.map(issue => (
                          <span key={issue} className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600">
                            {issue.replace('missing_', '缺 ').replace('no_', '无')}
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
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, total, color, icon }: {
  label: string; value: number; total: number; color: string; icon: React.ReactNode;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const colors: Record<string, { bg: string; text: string; bar: string }> = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-400' },
    red: { bg: 'bg-red-50', text: 'text-red-700', bar: 'bg-red-400' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-400' },
  };
  const c = colors[color] || colors.amber;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <span className={c.text}>{icon}</span>
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="flex items-center gap-2 mt-2">
        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${c.bar}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[10px] text-slate-400">{pct}%</span>
      </div>
    </div>
  );
}
