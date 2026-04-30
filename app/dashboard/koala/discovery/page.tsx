'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { DiscoveryCandidate, CandidateStatus } from '../../../lib/types';
import { universities, researchFields, sourceTypes, resultsPerRunOptions } from '../../../lib/discoveryMockData';
import { useLanguage } from '../../../components/LanguageContext';

interface SearchRun {
  id: string;
  time: Date;
  params: { university: string; researchField: string; sourceType: string; resultsPerRun: number };
  count: number;
  realCount: number;
}

const SOURCE_COLORS: Record<string, string> = {
  'Semantic Scholar': '#3b82f6',
  'OpenAlex': '#8b5cf6',
  'Mock': '#6b7280',
};

export default function DiscoveryPage() {
  const { t } = useLanguage();
  const [filters, setFilters] = useState({
    university: 'All',
    researchField: 'All',
    sourceType: 'Professors',
    resultsPerRun: 10,
  });

  const [candidates, setCandidates] = useState<DiscoveryCandidate[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchRun[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: name === 'resultsPerRun' ? parseInt(value) : value }));
  };

  const handleRunDiscovery = async () => {
    setRunning(true);
    setError(null);
    const runId = `run-${Date.now()}`;

    try {
      // Run mock discovery + real search in parallel
      const [mockRes, realRes] = await Promise.allSettled([
        fetch('/api/discovery/candidates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...filters }),
        }).then(r => r.ok ? r.json() : Promise.reject(new Error(`mock: ${r.status}`))),

        filters.researchField !== 'All'
          ? fetch(`/api/discovery/real-search?query=${encodeURIComponent(filters.researchField)}&university=${encodeURIComponent(filters.university)}`)
            .then(r => r.ok ? r.json() : { candidates: [] })
          : Promise.resolve({ candidates: [] }),
      ]);

      const mockCandidates: DiscoveryCandidate[] = mockRes.status === 'fulfilled' ? (mockRes.value.data ?? []) : [];
      const realCandidates = realRes.status === 'fulfilled' ? (realRes.value.candidates ?? []) : [];

      // Tag mock data with source
      const taggedMock = mockCandidates.map((c: DiscoveryCandidate) => ({ ...c, dataSource: 'Mock' }));

      // Merge, dedup by id
      const newItems = [...taggedMock, ...realCandidates];
      setCandidates(prev => {
        const existingIds = new Set(prev.map((c: DiscoveryCandidate) => c.id));
        const added = newItems.filter(c => !existingIds.has(c.id));
        return [...prev, ...added];
      });
      setActiveRunId(runId);

      const run: SearchRun = {
        id: runId,
        time: new Date(),
        params: { ...filters },
        count: taggedMock.length,
        realCount: realCandidates.length,
      };
      setSearchHistory(prev => [run, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Discovery failed');
    } finally {
      setRunning(false);
    }
  };

  const patchStatus = async (id: string, status: CandidateStatus) => {
    const res = await fetch(`/api/discovery/candidates/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const { data } = await res.json();
    setCandidates(prev => prev.map(c => c.id === id ? { ...data, dataSource: (c as DiscoveryCandidate & { dataSource?: string }).dataSource } : c));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      case 'Saved': return 'bg-blue-100 text-blue-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  // Filter candidates to active run or show all
  const displayCandidates = candidates;

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">{t.discovery.filterTitle}</h3>
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.discovery.universityLabel}</label>
            <select name="university" value={filters.university} onChange={handleFilterChange} className="w-full p-2 border rounded">
              <option value="All">{t.discovery.allUniversities}</option>
              {universities.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.discovery.researchFieldLabel}</label>
            <select name="researchField" value={filters.researchField} onChange={handleFilterChange} className="w-full p-2 border rounded">
              <option value="All">{t.discovery.allFields}</option>
              {researchFields.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.discovery.sourceTypeLabel}</label>
            <select name="sourceType" value={filters.sourceType} onChange={handleFilterChange} className="w-full p-2 border rounded">
              {sourceTypes.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.discovery.resultsPerRunLabel}</label>
            <select name="resultsPerRun" value={filters.resultsPerRun} onChange={handleFilterChange} className="w-full p-2 border rounded">
              {resultsPerRunOptions.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRunDiscovery}
            disabled={running}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {running ? '搜索中…' : t.discovery.runButton}
          </button>
          {candidates.length > 0 && (
            <button
              onClick={() => setCandidates([])}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              清空结果
            </button>
          )}
          {searchHistory.length > 0 && (
            <button
              onClick={() => setShowHistory(h => !h)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showHistory ? '隐藏' : '查看'}搜索历史 ({searchHistory.length})
            </button>
          )}
        </div>
        {error && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
        )}

        {/* Data sources info */}
        <div className="mt-4 p-3 bg-slate-50 rounded-lg text-xs text-slate-500 flex flex-wrap gap-4">
          <span className="font-medium text-slate-600">数据来源：</span>
          {[
            { name: 'Mock', label: '内部模拟数据', color: SOURCE_COLORS['Mock'] },
            { name: 'Semantic Scholar', label: 'Semantic Scholar（真实）', color: SOURCE_COLORS['Semantic Scholar'] },
            { name: 'OpenAlex', label: 'OpenAlex（真实）', color: SOURCE_COLORS['OpenAlex'] },
          ].map(s => (
            <span key={s.name} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      </div>

      {/* Search history */}
      {showHistory && searchHistory.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">搜索历史</h4>
          <div className="space-y-2">
            {searchHistory.map(run => (
              <div key={run.id} className="flex items-center justify-between text-xs text-gray-600 py-1.5 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-gray-400">{run.time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                  <span>{run.params.university} · {run.params.researchField} · {run.params.sourceType}</span>
                </div>
                <span className="text-gray-500">
                  {run.count} 模拟 + {run.realCount} 真实
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {displayCandidates.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{t.discovery.resultsTitle} ({displayCandidates.length})</h3>
            {activeRunId && (
              <span className="text-sm text-gray-500">
                已累计 {displayCandidates.length} 条（跨 {searchHistory.length} 次搜索）
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4">
            {displayCandidates.map(candidate => {
              const cExt = candidate as DiscoveryCandidate & { dataSource?: string };
              const srcColor = SOURCE_COLORS[cExt.dataSource ?? 'Mock'] ?? '#6b7280';
              return (
                <div key={candidate.id} className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-sm font-semibold px-2 py-1 bg-gray-100 rounded">{candidate.type}</span>
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${getStatusColor(candidate.status)}`}>
                          {candidate.status}
                        </span>
                        {cExt.dataSource && (
                          <span className="text-xs px-2 py-1 rounded text-white" style={{ background: srcColor }}>
                            via {cExt.dataSource}
                          </span>
                        )}
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900">{candidate.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{candidate.university}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600">{candidate.confidenceScore}%</p>
                      <p className="text-xs text-gray-500">置信度</p>
                    </div>
                  </div>
                  <p className="text-gray-700 mb-4">{candidate.summary}</p>
                  <div className="mb-4">
                    <a href={candidate.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm">
                      {t.common.viewSource}
                    </a>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => patchStatus(candidate.id, 'Approved')}
                      disabled={candidate.status !== 'Pending'}
                      className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-40"
                    >
                      ✅ 审核通过并发布
                    </button>
                    <button
                      onClick={() => patchStatus(candidate.id, 'Rejected')}
                      disabled={candidate.status !== 'Pending'}
                      className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-40"
                    >
                      ❌ 不收录
                    </button>
                    <button
                      onClick={() => patchStatus(candidate.id, 'Saved')}
                      disabled={candidate.status === 'Rejected' || candidate.status === 'Saved'}
                      className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-40"
                    >
                      💾 保存为草稿
                    </button>
                    <Link
                      href={`/dashboard/koala/discovery/${candidate.id}/edit`}
                      className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                    >
                      {t.discovery.edit}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {candidates.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 text-lg">{t.common.clickRunDiscovery}</p>
          <p className="text-gray-400 text-sm mt-2">支持 Semantic Scholar + OpenAlex 实时检索澳洲教授数据</p>
        </div>
      )}

      {/* Australian university staff directories */}
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">🏛️ 澳洲大学教职人员目录（手动查看）</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            { name: 'UNSW', url: 'https://research.unsw.edu.au/research-staff' },
            { name: 'Uni of Sydney', url: 'https://www.sydney.edu.au/research/find-a-researcher.html' },
            { name: 'Uni of Melbourne', url: 'https://findanexpert.unimelb.edu.au' },
            { name: 'Monash', url: 'https://research.monash.edu/en/persons' },
            { name: 'ANU', url: 'https://researchers.anu.edu.au' },
            { name: 'UQ', url: 'https://researchers.uq.edu.au' },
            { name: 'Macquarie', url: 'https://researchers.mq.edu.au' },
            { name: 'QUT', url: 'https://research.qut.edu.au/find-a-researcher' },
          ].map(u => (
            <a
              key={u.name}
              href={u.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 py-1"
            >
              <span className="text-gray-400">↗</span>
              {u.name} 教职目录
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
