'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, FileText, Award, Users, BookOpen, Wrench, BarChart3,
  ExternalLink, AlertTriangle, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus,
} from 'lucide-react';

const TABS = [
  { key: 'info', label: '基本信息', icon: FileText },
  { key: 'papers', label: '论文', icon: BookOpen },
  { key: 'grants', label: '经费', icon: Award },
  { key: 'research', label: '研究分析', icon: BarChart3 },
  { key: 'interactions', label: '学生互动', icon: Users },
  { key: 'repair', label: 'AI 修复', icon: Wrench },
] as const;
type TabKey = typeof TABS[number]['key'];

const POSITION_TITLES = [
  'Professor', 'Associate Professor', 'Senior Lecturer', 'Lecturer',
  'Research Fellow', 'Senior Research Fellow', 'Postdoctoral Fellow',
];

export default function ProfessorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [professor, setProfessor] = useState<AnyObj | null>(null);
  const [papers, setPapers] = useState<AnyObj[]>([]);
  const [grants, setGrants] = useState<AnyObj[]>([]);
  const [interactions, setInteractions] = useState<{ savedCount: number; outreachCount: number; students: AnyObj[]; outreachList: AnyObj[] }>({ savedCount: 0, outreachCount: 0, students: [], outreachList: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('info');
  const [form, setForm] = useState<AnyObj>({});
  const [saving, setSaving] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [repairResult, setRepairResult] = useState<AnyObj | null>(null);
  const [repairLog, setRepairLog] = useState<AnyObj[]>([]);
  const [researchProfile, setResearchProfile] = useState<AnyObj | null>(null);
  const [researchLoading, setResearchLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const profRes = await fetch(`/api/professors/${id}`);
        const { data } = await profRes.json();
        setProfessor(data);
        setForm(data || {});

        const [papersRes, grantsRes, interRes, logRes] = await Promise.all([
          fetch(`/api/professors/${id}/papers`).then(r => r.ok ? r.json() : { papers: [], data: [] }).catch(() => ({ papers: [], data: [] })),
          fetch(`/api/professors/${id}/grants`).then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] })),
          fetch(`/api/professors/${id}/interactions`).then(r => r.ok ? r.json() : { savedCount: 0, outreachCount: 0, students: [], outreachList: [] }).catch(() => ({ savedCount: 0, outreachCount: 0, students: [], outreachList: [] })),
          fetch(`/api/professors/${id}/repair-log`).then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] })),
        ]);
        setPapers(papersRes.papers || papersRes.data || []);
        setGrants(grantsRes.data || []);
        setInteractions(interRes);
        setRepairLog(logRes.data || []);
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, [id]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    const arrayFields = ['researchAreas', 'suitableStudentBackgrounds', 'potentialRpTopics'];
    setForm(prev => ({
      ...prev,
      [name]: arrayFields.includes(name) ? value.split(',').map((s: string) => s.trim()) : value,
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/professors/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const refreshed = await fetch(`/api/professors/${id}`).then(r => r.json());
    setProfessor(refreshed.data);
    setForm(refreshed.data);
    setSaving(false);
  }

  async function handleAiRepair() {
    setRepairing(true);
    setRepairResult(null);
    try {
      const res = await fetch(`/api/professors/${id}/ai-repair`, { method: 'POST' });
      const data = await res.json();
      setRepairResult(data);
      if (data.updated && Object.keys(data.updated).length > 0) {
        const refreshed = await fetch(`/api/professors/${id}`).then(r => r.json());
        setProfessor(refreshed.data);
        setForm(refreshed.data);
      }
    } catch {
      setRepairResult({ updated: {}, confidence: {}, notes: 'AI 修复请求失败' });
    }
    setRepairing(false);
  }

  async function loadResearchProfile() {
    setResearchLoading(true);
    try {
      const res = await fetch(`/api/professors/${id}/research-profile`);
      const data = await res.json();
      setResearchProfile(data);
    } catch { /* ignore */ }
    setResearchLoading(false);
  }

  async function handleEnrich() {
    setEnriching(true);
    try {
      const res = await fetch(`/api/professors/${id}/research-profile`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await loadResearchProfile();
        const refreshed = await fetch(`/api/professors/${id}`).then(r => r.json());
        setProfessor(refreshed.data);
        setForm(refreshed.data);
      }
    } catch { /* ignore */ }
    setEnriching(false);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-slate-400 text-sm">加载中...</p></div>;
  if (!professor) return <div className="p-6"><p className="text-red-500 text-sm">教授不存在</p></div>;

  const missingFields = ['email', 'profileUrl', 'googleScholarUrl', 'positionTitle', 'faculty'].filter(f => !professor[f]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/dashboard/koala/professors" className="p-2 rounded-lg hover:bg-slate-100 transition-colors mt-0.5">
          <ArrowLeft className="size-4 text-slate-600" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-slate-900">{professor.name}</h1>
          <p className="text-sm text-slate-500">{professor.university}{professor.faculty ? ` · ${professor.faculty}` : ''}{professor.positionTitle ? ` · ${professor.positionTitle}` : ''}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {professor.h_index && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">H-index: {professor.h_index}</span>}
            {professor.acceptingStudents === 'yes' && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">正在招生</span>}
            {missingFields.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                <AlertTriangle className="size-3" /> {missingFields.length} 字段缺失
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0"
              style={active
                ? { background: '#fff', color: '#0f172a', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                : { color: '#64748b' }}
            >
              <Icon className="size-3.5" />
              {t.label}
              {t.key === 'papers' && papers.length > 0 && <span className="text-[10px] text-slate-400 ml-0.5">({papers.length})</span>}
              {t.key === 'grants' && grants.length > 0 && <span className="text-[10px] text-slate-400 ml-0.5">({grants.length})</span>}
            </button>
          );
        })}
      </div>

      {/* Tab: 基本信息 */}
      {tab === 'info' && (
        <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="姓名" name="name" value={form.name} onChange={handleChange} required />
            <Field label="大学" name="university" value={form.university} onChange={handleChange} required />
            <Field label="学院" name="faculty" value={form.faculty} onChange={handleChange} missing={!professor.faculty} />
            <Field label="职称" name="title" value={form.title} onChange={handleChange} />
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Position Title{!professor.positionTitle && <MissingBadge />}</label>
              <select name="positionTitle" value={form.positionTitle ?? ''} onChange={handleChange} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <option value="">-- Select --</option>
                {POSITION_TITLES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <Field label="邮箱" name="email" type="email" value={form.email} onChange={handleChange} missing={!professor.email} />
            <Field label="Profile URL" name="profileUrl" type="url" value={form.profileUrl} onChange={handleChange} missing={!professor.profileUrl} />
            <Field label="Google Scholar" name="googleScholarUrl" type="url" value={form.googleScholarUrl} onChange={handleChange} missing={!professor.googleScholarUrl} />
            <Field label="研究方向" name="researchAreas" value={(form.researchAreas ?? []).join(', ')} onChange={handleChange} placeholder="逗号分隔" />
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">招生状态</label>
              <select name="acceptingStudents" value={form.acceptingStudents ?? 'unknown'} onChange={handleChange} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="likely">Likely</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">审核状态</label>
              <select name="verificationStatus" value={form.verificationStatus ?? 'Pending'} onChange={handleChange} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <option value="Verified">Verified</option>
                <option value="Pending">Pending</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">备注</label>
            <textarea name="references" value={form.references ?? ''} onChange={handleChange} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" rows={3} />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      )}

      {/* Tab: 论文 */}
      {tab === 'papers' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">论文 ({papers.length})</h3>
          </div>
          {papers.length === 0 ? (
            <p className="p-4 text-sm text-slate-300">暂无论文记录</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {papers.map((p, i) => (
                <div key={p.id || i} className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 leading-snug">{p.title}</p>
                      {p.journal && <p className="text-xs text-slate-500 mt-0.5">{p.journal}{p.year ? ` · ${p.year}` : ''}</p>}
                      {p.authors && <p className="text-xs text-slate-400 mt-0.5 truncate">{p.authors}</p>}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      {p.citation_count != null && <span className="text-xs text-slate-400">{p.citation_count} 引用</span>}
                      {p.doi && (
                        <a href={`https://doi.org/${p.doi}`} target="_blank" rel="noopener noreferrer" className="block text-xs text-blue-500 mt-0.5 no-underline">
                          DOI <ExternalLink className="size-3 inline" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: 经费 */}
      {tab === 'grants' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">经费 ({grants.length})</h3>
          </div>
          {grants.length === 0 ? (
            <p className="p-4 text-sm text-slate-300">暂无经费记录</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {grants.map((g, i) => (
                <div key={g.id || i} className="px-4 py-3">
                  <p className="text-sm font-medium text-slate-800">{g.title || g.grant_title}</p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {g.funding_body && <span className="text-xs text-slate-500">{g.funding_body}</span>}
                    {g.amount && <span className="text-xs font-medium text-emerald-600">${Number(g.amount).toLocaleString()}</span>}
                    {(g.start_year || g.year) && <span className="text-xs text-slate-400">{g.start_year || g.year}{g.end_year ? `–${g.end_year}` : ''}</span>}
                    {g.status && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${g.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{g.status}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: 研究分析 */}
      {tab === 'research' && (
        <ResearchTab
          profile={researchProfile}
          loading={researchLoading}
          enriching={enriching}
          onLoad={loadResearchProfile}
          onEnrich={handleEnrich}
          hasSS={!!professor.semantic_scholar_id}
        />
      )}

      {/* Tab: 学生互动 */}
      {tab === 'interactions' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <div className="text-2xl font-bold text-slate-800">{interactions.savedCount}</div>
              <div className="text-xs text-slate-400 mt-0.5">收藏该教授</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <div className="text-2xl font-bold text-slate-800">{interactions.outreachCount}</div>
              <div className="text-xs text-slate-400 mt-0.5">申请信总数</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <div className="text-2xl font-bold text-slate-800">{professor.profile_views ?? 0}</div>
              <div className="text-xs text-slate-400 mt-0.5">资料浏览</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">收藏的学生</h3>
            </div>
            {interactions.students.length === 0 ? (
              <p className="p-4 text-sm text-slate-300">暂无收藏记录 (需要 saved_professors 表)</p>
            ) : (
              <div className="divide-y divide-slate-50">
                {interactions.students.map((s, i) => (
                  <div key={i} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <span className="text-sm text-slate-700">{s.email_masked || '***'}</span>
                      {s.research_interests && <p className="text-xs text-slate-400 mt-0.5">{s.research_interests}</p>}
                    </div>
                    <span className="text-xs text-slate-400">{s.created_at ? new Date(s.created_at).toLocaleDateString('zh-CN') : ''}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">申请信</h3>
            </div>
            {interactions.outreachList.length === 0 ? (
              <p className="p-4 text-sm text-slate-300">暂无申请信记录</p>
            ) : (
              <div className="divide-y divide-slate-50">
                {interactions.outreachList.map((o, i) => (
                  <OutreachRow key={i} email={o} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: AI 修复 */}
      {tab === 'repair' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700">AI 一键修复</h3>
              <button
                onClick={handleAiRepair}
                disabled={repairing || missingFields.length === 0}
                className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
              >
                {repairing ? <><span className="animate-spin">⚙️</span> 修复中...</> : <>🤖 AI 修复 ({missingFields.length} 字段)</>}
              </button>
            </div>

            {missingFields.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 mb-4">
                缺失字段：{missingFields.join(', ')}
              </div>
            )}

            {repairResult && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm">
                <div className="font-semibold text-emerald-800 mb-2">修复结果</div>
                {Object.keys(repairResult.updated || {}).length > 0 ? (
                  <ul className="space-y-1">
                    {Object.entries(repairResult.updated).map(([field, value]) => (
                      <li key={field} className="text-emerald-700">
                        ✅ {field}: <span className="font-mono">{String(value)}</span>
                        {repairResult.confidence?.[field] && <span className="ml-2 text-xs text-slate-500">(置信度: {repairResult.confidence[field]})</span>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-600">未找到可修复字段</p>
                )}
                {repairResult.notes && <p className="mt-2 text-xs text-slate-500">{repairResult.notes}</p>}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">修复日志</h3>
            </div>
            {repairLog.length === 0 ? (
              <p className="p-4 text-sm text-slate-300">暂无修复记录</p>
            ) : (
              <div className="divide-y divide-slate-50">
                {repairLog.map((log, i) => (
                  <div key={i} className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{new Date(log.created_at).toLocaleString('zh-CN')}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{Object.keys(log.fields_updated || {}).length} 字段</span>
                    </div>
                    {log.fields_updated && (
                      <div className="mt-1 text-xs text-slate-500">
                        {Object.entries(log.fields_updated).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ResearchTab({ profile, loading, enriching, onLoad, onEnrich, hasSS }: {
  profile: AnyObj | null; loading: boolean; enriching: boolean;
  onLoad: () => void; onEnrich: () => void; hasSS: boolean;
}) {
  const loaded = !!profile;

  if (!loaded && !loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3">
        <BarChart3 className="size-8 text-slate-300 mx-auto" />
        <p className="text-sm text-slate-500">点击加载该教授的研究分析数据</p>
        <button onClick={onLoad} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          加载研究分析
        </button>
      </div>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center h-48"><p className="text-slate-400 text-sm">加载研究分析中...</p></div>;
  }

  const metrics = profile?.citationMetrics ?? {};
  const yearDist = profile?.yearDistribution ?? {};
  const topPapers = profile?.papers ?? [];
  const prof = profile?.professor ?? {};

  const TrendIcon = metrics.citationTrend === 'rising' ? TrendingUp : metrics.citationTrend === 'declining' ? TrendingDown : Minus;
  const trendColor = metrics.citationTrend === 'rising' ? 'text-emerald-600' : metrics.citationTrend === 'declining' ? 'text-red-500' : 'text-slate-400';
  const trendLabels: Record<string, string> = { rising: '上升', declining: '下降', stable: '平稳', unknown: '未知' };
  const trendLabel = trendLabels[metrics.citationTrend ?? 'unknown'] ?? '未知';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">研究影响力分析</h3>
        <button
          onClick={onEnrich}
          disabled={enriching || !hasSS}
          className="px-3 py-1.5 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1.5"
        >
          {enriching ? '分析中...' : '🔬 AI 深度分析'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="总引用" value={metrics.totalCitations?.toLocaleString() ?? '—'} />
        <MetricCard label="篇均引用" value={metrics.avgCitationsPerPaper?.toLocaleString() ?? '—'} />
        <MetricCard label="近2年论文" value={metrics.recentPaperCount ?? '—'} />
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <div className="text-[10px] text-slate-400 mb-1">引用趋势</div>
          <div className={`flex items-center gap-1.5 text-lg font-bold ${trendColor}`}>
            <TrendIcon className="size-4" />
            {trendLabel}
          </div>
        </div>
      </div>

      {prof.researchSummary && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h4 className="text-xs font-semibold text-slate-500 mb-2">研究概述</h4>
          <p className="text-sm text-slate-700 leading-relaxed">{prof.researchSummary}</p>
        </div>
      )}

      {(prof.researchAreas?.length ?? 0) > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h4 className="text-xs font-semibold text-slate-500 mb-2">研究关键词</h4>
          <div className="flex flex-wrap gap-1.5">
            {prof.researchAreas.map((kw: string, i: number) => (
              <span key={i} className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700">{kw}</span>
            ))}
          </div>
        </div>
      )}

      {Object.keys(yearDist).length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h4 className="text-xs font-semibold text-slate-500 mb-3">发表年份分布</h4>
          <div className="flex items-end gap-1 h-24">
            {Object.entries(yearDist)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([year, count]) => {
                const max = Math.max(...Object.values(yearDist) as number[]);
                const h = max > 0 ? ((count as number) / max) * 100 : 0;
                return (
                  <div key={year} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-blue-200 rounded-t" style={{ height: `${h}%`, minHeight: count ? 4 : 0 }} />
                    <span className="text-[8px] text-slate-400 -rotate-45">{year}</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {topPapers.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h4 className="text-xs font-semibold text-slate-500">高引论文 Top {topPapers.length}</h4>
          </div>
          <div className="divide-y divide-slate-50">
            {topPapers.map((p: AnyObj, i: number) => (
              <div key={i} className="px-4 py-2.5 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-700 truncate">{p.title}</p>
                  <p className="text-[10px] text-slate-400">{p.journal ?? ''}{p.year ? ` · ${p.year}` : ''}</p>
                </div>
                <span className="text-xs font-medium text-slate-500 flex-shrink-0">{p.citations} 引用</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {metrics.topPaperTitle && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-[10px] text-amber-600 font-medium mb-0.5">最高引用论文</p>
          <p className="text-xs text-amber-800">{metrics.topPaperTitle}</p>
          <p className="text-[10px] text-amber-600 mt-0.5">{metrics.topPaperCitations?.toLocaleString()} 引用</p>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3">
      <div className="text-[10px] text-slate-400 mb-1">{label}</div>
      <div className="text-lg font-bold text-slate-800">{value}</div>
    </div>
  );
}

function Field({ label, name, value, onChange, type = 'text', required, missing, placeholder }: {
  label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string; required?: boolean; missing?: boolean; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">
        {label}{missing && <MissingBadge />}
      </label>
      <input type={type} name={name} value={value ?? ''} onChange={onChange} required={required} placeholder={placeholder}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400" />
    </div>
  );
}

function MissingBadge() {
  return <span className="ml-2 px-1.5 py-0.5 text-[10px] font-medium rounded bg-red-100 text-red-700">缺失</span>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>;

function OutreachRow({ email }: { email: AnyObj }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="px-4 py-3">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between text-left">
        <div className="flex-1 min-w-0">
          <span className="text-sm text-slate-700">{email.subject_line || '无标题'}</span>
          <p className="text-xs text-slate-400 mt-0.5">{email.email_masked || '***'} · {email.created_at ? new Date(email.created_at).toLocaleDateString('zh-CN') : ''}</p>
        </div>
        {open ? <ChevronUp className="size-4 text-slate-400" /> : <ChevronDown className="size-4 text-slate-400" />}
      </button>
      {open && (
        <pre className="mt-2 text-xs text-slate-600 whitespace-pre-wrap bg-slate-50 rounded-lg p-3 max-h-48 overflow-y-auto">
          {email.email_body || '无内容'}
        </pre>
      )}
    </div>
  );
}
