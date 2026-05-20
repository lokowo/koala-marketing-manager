'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Grant } from '../../../lib/types';

const RELEVANCE_STYLE: Record<string, { bg: string; text: string }> = {
  High: { bg: '#DCFCE7', text: '#166534' },
  Medium: { bg: '#FEF3C7', text: '#92400E' },
  Low: { bg: '#F1F5F9', text: '#475569' },
};

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  Verified: { bg: '#DCFCE7', text: '#166534' },
  Pending: { bg: '#FEF3C7', text: '#92400E' },
  Rejected: { bg: '#FEE2E2', text: '#991B1B' },
};

type FormData = Omit<Grant, 'id' | 'createdAt' | 'updatedAt'>;

const EMPTY_FORM: FormData = {
  grantName: '', fundingBody: '', year: '', amount: '',
  leadProfessor: '', university: '', industryPartner: '',
  projectTitle: '', projectAbstract: '', keywords: [],
  phdRelevance: 'Medium', industryScholarshipPotential: 'Medium',
  referenceUrl: '', verificationStatus: 'Pending',
};

export default function GrantsPage() {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRelevance, setFilterRelevance] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Grant | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchGrants = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('verificationStatus', filterStatus);
      if (filterRelevance) params.set('phdRelevance', filterRelevance);
      const res = await fetch(`/api/grants?${params}`);
      if (res.ok) {
        const { data } = await res.json();
        setGrants(data || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [filterStatus, filterRelevance]);

  useEffect(() => { fetchGrants(); }, [fetchGrants]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEdit(grant: Grant) {
    setEditing(grant);
    setForm({
      grantName: grant.grantName, fundingBody: grant.fundingBody,
      year: grant.year, amount: grant.amount,
      leadProfessor: grant.leadProfessor, university: grant.university,
      industryPartner: grant.industryPartner, projectTitle: grant.projectTitle,
      projectAbstract: grant.projectAbstract, keywords: grant.keywords || [],
      phdRelevance: grant.phdRelevance, industryScholarshipPotential: grant.industryScholarshipPotential,
      referenceUrl: grant.referenceUrl, verificationStatus: grant.verificationStatus,
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.grantName.trim() || !form.fundingBody.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        const res = await fetch(`/api/grants/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (res.ok) {
          const { data } = await res.json();
          setGrants(prev => prev.map(g => g.id === editing.id ? data : g));
        }
      } else {
        const res = await fetch('/api/grants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (res.ok) {
          const { data } = await res.json();
          setGrants(prev => [...prev, data]);
        }
      }
      setShowModal(false);
    } catch { /* ignore */ }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('确认删除此 Grant？')) return;
    try {
      const res = await fetch(`/api/grants/${id}`, { method: 'DELETE' });
      if (res.ok) setGrants(prev => prev.filter(g => g.id !== id));
    } catch { /* ignore */ }
  }

  const filtered = grants.filter(g => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return g.grantName.toLowerCase().includes(q) ||
      g.fundingBody.toLowerCase().includes(q) ||
      g.leadProfessor.toLowerCase().includes(q) ||
      g.university.toLowerCase().includes(q) ||
      g.projectTitle.toLowerCase().includes(q);
  });

  const stats = {
    total: grants.length,
    verified: grants.filter(g => g.verificationStatus === 'Verified').length,
    high: grants.filter(g => g.phdRelevance === 'High').length,
  };

  function setField(name: keyof FormData, value: string | string[]) {
    setForm(prev => ({ ...prev, [name]: value }));
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 animate-pulse">
              <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
              <div className="h-6 w-1/3 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          ))}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 animate-pulse">
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light tracking-tight text-gray-900 dark:text-gray-100">Grants 管理</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">研究基金与资助项目</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-[#1A1A2E] dark:bg-blue-600 text-white text-sm rounded-lg hover:bg-[#2A2A3E] dark:hover:bg-blue-700 transition-colors"
        >
          + 新增 Grant
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow p-4">
          <div className="text-[10px] text-gray-400 dark:text-gray-500 mb-1">总数</div>
          <div className="text-2xl font-medium text-gray-800 dark:text-gray-100">{stats.total}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow p-4">
          <div className="text-[10px] text-gray-400 dark:text-gray-500 mb-1">已验证</div>
          <div className="text-2xl font-medium text-emerald-600 dark:text-emerald-400">{stats.verified}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow p-4">
          <div className="text-[10px] text-gray-400 dark:text-gray-500 mb-1">PhD 高相关</div>
          <div className="text-2xl font-medium text-blue-600 dark:text-blue-400">{stats.high}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="搜索 Grant 名称、机构、教授..."
          className="flex-1 min-w-[200px] px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 dark:focus:ring-blue-900 dark:focus:border-blue-400"
        />
        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setLoading(true); }}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 dark:focus:ring-blue-900 dark:focus:border-blue-400"
        >
          <option value="">全部状态</option>
          <option value="Verified">Verified</option>
          <option value="Pending">Pending</option>
          <option value="Rejected">Rejected</option>
        </select>
        <select
          value={filterRelevance}
          onChange={e => { setFilterRelevance(e.target.value); setLoading(true); }}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 dark:focus:ring-blue-900 dark:focus:border-blue-400"
        >
          <option value="">全部相关度</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="flex justify-center mb-3">
              <svg className="w-10 h-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <p className="text-sm text-gray-400 dark:text-gray-500">{search ? '无匹配结果' : '暂无 Grant 数据'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400">
                  <th className="text-left px-4 py-2.5 font-medium">Grant 名称</th>
                  <th className="text-left px-4 py-2.5 font-medium">资助机构</th>
                  <th className="text-left px-4 py-2.5 font-medium">首席研究员</th>
                  <th className="text-left px-4 py-2.5 font-medium">大学</th>
                  <th className="text-center px-4 py-2.5 font-medium">年份</th>
                  <th className="text-right px-4 py-2.5 font-medium">金额</th>
                  <th className="text-center px-4 py-2.5 font-medium">PhD 相关</th>
                  <th className="text-center px-4 py-2.5 font-medium">状态</th>
                  <th className="text-right px-4 py-2.5 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.map(grant => {
                  const rs = RELEVANCE_STYLE[grant.phdRelevance] || RELEVANCE_STYLE.Medium;
                  const ss = STATUS_STYLE[grant.verificationStatus] || STATUS_STYLE.Pending;
                  const expanded = expandedId === grant.id;
                  return (
                    <Fragment key={grant.id}>
                      <tr
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                        onClick={() => setExpandedId(expanded ? null : grant.id)}
                      >
                        <td className="px-4 py-2.5 text-gray-900 dark:text-gray-100 font-medium max-w-[200px] truncate">{grant.grantName}</td>
                        <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{grant.fundingBody}</td>
                        <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{grant.leadProfessor}</td>
                        <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{grant.university}</td>
                        <td className="px-4 py-2.5 text-center text-gray-500 dark:text-gray-400">{grant.year}</td>
                        <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-200 font-medium">{grant.amount}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="text-[10px] px-2 py-0.5 rounded font-medium" style={{ backgroundColor: rs.bg, color: rs.text }}>
                            {grant.phdRelevance}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="text-[10px] px-2 py-0.5 rounded font-medium" style={{ backgroundColor: ss.bg, color: ss.text }}>
                            {grant.verificationStatus}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={e => { e.stopPropagation(); openEdit(grant); }}
                              className="p-1 rounded text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); handleDelete(grant.id); }}
                              className="p-1 rounded text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expanded && (
                        <tr>
                          <td colSpan={9} className="bg-gray-50 dark:bg-gray-800/50 px-4 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                              <div>
                                <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">项目标题</div>
                                <div className="text-gray-600 dark:text-gray-400">{grant.projectTitle || '—'}</div>
                              </div>
                              <div>
                                <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">行业合作</div>
                                <div className="text-gray-600 dark:text-gray-400">{grant.industryPartner || '—'}</div>
                              </div>
                              <div className="md:col-span-2">
                                <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">项目摘要</div>
                                <div className="text-gray-600 dark:text-gray-400">{grant.projectAbstract || '—'}</div>
                              </div>
                              {grant.keywords && grant.keywords.length > 0 && (
                                <div className="md:col-span-2">
                                  <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">关键词</div>
                                  <div className="flex flex-wrap gap-1">
                                    {grant.keywords.map((kw, i) => (
                                      <span key={i} className="text-[10px] px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">{kw}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {grant.referenceUrl && (
                                <div>
                                  <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">参考链接</div>
                                  <a href={grant.referenceUrl} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline break-all">{grant.referenceUrl}</a>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowModal(false)} />
          <div className="relative bg-white dark:bg-gray-800 border border-transparent dark:border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {editing ? '编辑 Grant' : '新增 Grant'}
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Grant 名称 *</label>
                  <input type="text" value={form.grantName} onChange={e => setField('grantName', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 dark:focus:ring-blue-900 dark:focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">资助机构 *</label>
                  <input type="text" value={form.fundingBody} onChange={e => setField('fundingBody', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 dark:focus:ring-blue-900 dark:focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">年份 *</label>
                  <input type="text" value={form.year} onChange={e => setField('year', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 dark:focus:ring-blue-900 dark:focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">金额</label>
                  <input type="text" value={form.amount} onChange={e => setField('amount', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 dark:focus:ring-blue-900 dark:focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">首席研究员 *</label>
                  <input type="text" value={form.leadProfessor} onChange={e => setField('leadProfessor', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 dark:focus:ring-blue-900 dark:focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">大学 *</label>
                  <input type="text" value={form.university} onChange={e => setField('university', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 dark:focus:ring-blue-900 dark:focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">行业合作方</label>
                  <input type="text" value={form.industryPartner} onChange={e => setField('industryPartner', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 dark:focus:ring-blue-900 dark:focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">参考链接</label>
                  <input type="url" value={form.referenceUrl} onChange={e => setField('referenceUrl', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 dark:focus:ring-blue-900 dark:focus:border-blue-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">项目标题</label>
                <input type="text" value={form.projectTitle} onChange={e => setField('projectTitle', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 dark:focus:ring-blue-900 dark:focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">项目摘要</label>
                <textarea value={form.projectAbstract} onChange={e => setField('projectAbstract', e.target.value)} rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 dark:focus:ring-blue-900 dark:focus:border-blue-400 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">关键词（逗号分隔）</label>
                <input type="text" value={form.keywords.join(', ')} onChange={e => setField('keywords', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 dark:focus:ring-blue-900 dark:focus:border-blue-400" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">PhD 相关度</label>
                  <select value={form.phdRelevance} onChange={e => setField('phdRelevance', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 dark:focus:ring-blue-900 dark:focus:border-blue-400">
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">奖学金潜力</label>
                  <select value={form.industryScholarshipPotential} onChange={e => setField('industryScholarshipPotential', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 dark:focus:ring-blue-900 dark:focus:border-blue-400">
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">验证状态</label>
                  <select value={form.verificationStatus} onChange={e => setField('verificationStatus', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 dark:focus:ring-blue-900 dark:focus:border-blue-400">
                    <option value="Verified">Verified</option>
                    <option value="Pending">Pending</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-6">
              <button onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                取消
              </button>
              <button onClick={handleSave} disabled={saving || !form.grantName.trim() || !form.fundingBody.trim()}
                className="px-4 py-2 text-sm bg-[#1A1A2E] dark:bg-blue-600 text-white rounded-lg hover:bg-[#2A2A3E] dark:hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Fragment({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
