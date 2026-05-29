'use client';

import { useState, useEffect } from 'react';
import {
  Save, Check, Loader2, Download, Sparkles, ChevronDown, ChevronUp, Plus, Trash2, X, MessageSquare,
} from 'lucide-react';
import Link from 'next/link';

interface CVPersonal {
  name?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
}

interface CVEducation {
  degree: string;
  university: string;
  gpa?: string;
  dates?: string;
  thesis?: string;
}

interface CVResearch {
  title: string;
  lab?: string;
  supervisor?: string;
  period?: string;
  description?: string;
}

interface CVPublication {
  title: string;
  journal?: string;
  year?: number;
  authors?: string;
  doi?: string;
}

interface CVAward {
  title: string;
  organization?: string;
  issuer?: string;
  year?: number;
}

interface CVReference {
  name: string;
  title?: string;
  university?: string;
  institution?: string;
  email?: string;
  relationship?: string;
}

interface CVContent {
  personal: CVPersonal;
  education?: CVEducation[];
  research?: CVResearch[];
  publications?: CVPublication[];
  skills?: { technical?: string[]; languages?: string[]; tools?: string[] };
  awards?: CVAward[];
  references?: CVReference[];
}

interface AcademicCVCardProps {
  id: string;
  content: CVContent;
  status: 'draft' | 'final';
  onStatusChange?: (id: string, status: 'draft' | 'final') => void;
}

type SectionKey = 'education' | 'research' | 'publications' | 'skills' | 'awards' | 'references';

const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: 'education', label: '教育背景' },
  { key: 'research', label: '研究经历' },
  { key: 'publications', label: '论文发表' },
  { key: 'skills', label: '技能' },
  { key: 'awards', label: '奖项荣誉' },
  { key: 'references', label: '推荐人' },
];

export default function AcademicCVCard({
  id,
  content: initialContent,
  status: initialStatus,
  onStatusChange,
}: AcademicCVCardProps) {
  const [content, setContent] = useState<CVContent>(JSON.parse(JSON.stringify(initialContent)));
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // AI enhance state
  const [enhancingKey, setEnhancingKey] = useState<string | null>(null);
  const [enhancedPreview, setEnhancedPreview] = useState<{ key: string; text: string } | null>(null);

  // CV completeness
  const cvCompletionPct = (() => {
    let filled = 0;
    let total = 7;
    if (content.personal?.name && content.personal?.email) filled++;
    if ((content.education ?? []).length > 0) filled++;
    if ((content.research ?? []).length > 0) filled++;
    if ((content.publications ?? []).length > 0) filled++;
    const s = content.skills;
    if (s && ((s.technical?.length ?? 0) + (s.languages?.length ?? 0) + (s.tools?.length ?? 0) > 0)) filled++;
    if ((content.awards ?? []).length > 0) filled++;
    if ((content.references ?? []).length > 0) filled++;
    return Math.round((filled / total) * 100);
  })();

  const emptySections = SECTIONS.filter(({ key }) => {
    if (key === 'skills') {
      const s = content.skills;
      return !s || ((s.technical?.length ?? 0) + (s.languages?.length ?? 0) + (s.tools?.length ?? 0) === 0);
    }
    return !(content[key] as unknown[] | undefined)?.length;
  });

  const toggleCollapse = (key: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/user/cv/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, status }),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const handleStatusToggle = () => {
    const next = status === 'draft' ? 'final' : 'draft';
    setStatus(next);
    onStatusChange?.(id, next);
  };

  const handleEnhanceResearch = async (idx: number) => {
    const item = content.research?.[idx];
    if (!item) return;
    const key = `research-${idx}`;
    setEnhancingKey(key);
    setEnhancedPreview(null);
    try {
      const res = await fetch('/api/user/enhance-experience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_description: item.description || item.title,
          major: content.personal.name,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEnhancedPreview({ key, text: (data.enhanced as string[]).join('\n') });
    } catch {
      // silent
    } finally {
      setEnhancingKey(null);
    }
  };

  const acceptEnhanced = () => {
    if (!enhancedPreview) return;
    const [section, idxStr] = enhancedPreview.key.split('-');
    const idx = parseInt(idxStr);
    if (section === 'research' && content.research?.[idx]) {
      setContent(prev => {
        const next = JSON.parse(JSON.stringify(prev));
        next.research[idx].description = enhancedPreview.text;
        return next;
      });
    }
    setEnhancedPreview(null);
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const res = await fetch('/api/user/cv/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Academic_CV_${(content.personal.name || 'draft').replace(/\s+/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent
    } finally {
      setDownloadingPdf(false);
    }
  };

  const updateArrayItem = (key: SectionKey, idx: number, field: string, value: unknown) => {
    setContent(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next[key]) return next;
      (next[key] as Record<string, unknown>[])[idx][field] = value;
      return next;
    });
  };

  const removeArrayItem = (key: SectionKey, idx: number) => {
    setContent(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next[key]) return next;
      (next[key] as unknown[]).splice(idx, 1);
      return next;
    });
  };

  const addEducation = () => {
    setContent(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next.education) next.education = [];
      next.education.push({ degree: '', university: '', gpa: '', dates: '', thesis: '' });
      return next;
    });
  };

  const addResearch = () => {
    setContent(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next.research) next.research = [];
      next.research.push({ title: '', lab: '', supervisor: '', period: '', description: '' });
      return next;
    });
  };

  const addPublication = () => {
    setContent(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next.publications) next.publications = [];
      next.publications.push({ title: '', journal: '', year: undefined, authors: '', doi: '' });
      return next;
    });
  };

  const addAward = () => {
    setContent(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next.awards) next.awards = [];
      next.awards.push({ title: '', organization: '', year: undefined });
      return next;
    });
  };

  const addReference = () => {
    setContent(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next.references) next.references = [];
      next.references.push({ name: '', title: '', university: '', email: '', relationship: '' });
      return next;
    });
  };

  const inputCls = 'w-full h-9 px-2.5 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 outline-none focus:border-blue-500 dark:focus:border-blue-400';
  const labelCls = 'block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-0.5';

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Academic CV — {content.personal.name || 'Untitled'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {content.personal.email || ''}
            </p>
          </div>
          <button
            onClick={handleStatusToggle}
            className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              status === 'final'
                ? 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400'
                : 'bg-gray-100 dark:bg-gray-500/10 text-gray-600 dark:text-gray-400'
            }`}
          >
            {status === 'final' ? '定稿' : '草稿'}
          </button>
        </div>
        {/* Completeness bar */}
        <div className="mt-2.5 space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-gray-400 dark:text-gray-500">CV 完整度</span>
            <span className={`font-medium ${cvCompletionPct >= 80 ? 'text-green-600 dark:text-green-400' : cvCompletionPct >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-500 dark:text-red-400'}`}>{cvCompletionPct}%</span>
          </div>
          <div className="h-1 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${cvCompletionPct >= 80 ? 'bg-green-500 dark:bg-green-400' : cvCompletionPct >= 50 ? 'bg-amber-500 dark:bg-amber-400' : 'bg-red-400 dark:bg-red-500'}`}
              style={{ width: `${cvCompletionPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Enhanced preview banner */}
      {enhancedPreview && (
        <div className="mx-4 mt-3 rounded-lg border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <Sparkles size={12} /> AI 润色结果
            </span>
            <button onClick={() => setEnhancedPreview(null)} className="text-amber-400 hover:text-amber-600 dark:hover:text-amber-300">
              <X size={14} />
            </button>
          </div>
          <div className="text-xs leading-relaxed text-amber-900 dark:text-amber-200 max-h-48 overflow-y-auto whitespace-pre-wrap mb-3">
            {enhancedPreview.text}
          </div>
          <div className="flex gap-2">
            <button onClick={acceptEnhanced} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]">
              <Check size={12} /> 接受
            </button>
            <button onClick={() => setEnhancedPreview(null)} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400">
              放弃
            </button>
          </div>
        </div>
      )}

      {/* Sections */}
      <div className="divide-y divide-gray-100 dark:divide-white/5">
        {/* Personal info (always visible) */}
        <div className="px-4 py-3">
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">个人信息</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Name</label>
              <input value={content.personal.name || ''} onChange={e => setContent(prev => ({ ...prev, personal: { ...prev.personal, name: e.target.value } }))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input value={content.personal.email || ''} onChange={e => setContent(prev => ({ ...prev, personal: { ...prev.personal, email: e.target.value } }))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input value={content.personal.phone || ''} onChange={e => setContent(prev => ({ ...prev, personal: { ...prev.personal, phone: e.target.value } }))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>LinkedIn</label>
              <input value={content.personal.linkedin || ''} onChange={e => setContent(prev => ({ ...prev, personal: { ...prev.personal, linkedin: e.target.value } }))} className={inputCls} />
            </div>
          </div>
        </div>

        {SECTIONS.map(({ key, label }) => {
          const collapsed = collapsedSections.has(key);

          return (
            <div key={key} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <button onClick={() => toggleCollapse(key)} className="flex items-center gap-1 text-left">
                  <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</h4>
                  {collapsed ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronUp size={14} className="text-gray-400" />}
                </button>
                {!collapsed && key !== 'skills' && (
                  <button
                    onClick={() => {
                      if (key === 'education') addEducation();
                      else if (key === 'research') addResearch();
                      else if (key === 'publications') addPublication();
                      else if (key === 'awards') addAward();
                      else if (key === 'references') addReference();
                    }}
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
                  >
                    <Plus size={10} /> 添加
                  </button>
                )}
              </div>

              {!collapsed && (
                <div className="mt-3 space-y-3">
                  {/* Education */}
                  {key === 'education' && (content.education ?? []).map((edu, i) => (
                    <div key={i} className="relative rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 p-3">
                      <button onClick={() => removeArrayItem('education', i)} className="absolute top-2 right-2 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400"><Trash2 size={12} /></button>
                      <div className="grid grid-cols-2 gap-2">
                        <div><label className={labelCls}>Degree</label><input value={edu.degree} onChange={e => updateArrayItem('education', i, 'degree', e.target.value)} className={inputCls} /></div>
                        <div><label className={labelCls}>University</label><input value={edu.university} onChange={e => updateArrayItem('education', i, 'university', e.target.value)} className={inputCls} /></div>
                        <div><label className={labelCls}>GPA</label><input value={edu.gpa || ''} onChange={e => updateArrayItem('education', i, 'gpa', e.target.value)} className={inputCls} /></div>
                        <div><label className={labelCls}>Dates</label><input value={edu.dates || ''} onChange={e => updateArrayItem('education', i, 'dates', e.target.value)} className={inputCls} /></div>
                        <div className="col-span-2"><label className={labelCls}>Thesis</label><input value={edu.thesis || ''} onChange={e => updateArrayItem('education', i, 'thesis', e.target.value)} className={inputCls} /></div>
                      </div>
                    </div>
                  ))}

                  {/* Research */}
                  {key === 'research' && (content.research ?? []).map((res, i) => (
                    <div key={i} className="relative rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 p-3">
                      <div className="absolute top-2 right-2 flex items-center gap-1">
                        <button
                          onClick={() => handleEnhanceResearch(i)}
                          disabled={!!enhancingKey}
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                        >
                          {enhancingKey === `research-${i}` ? <><Loader2 size={10} className="animate-spin" /> 润色中</> : <><Sparkles size={10} /> AI 润色</>}
                        </button>
                        <button onClick={() => removeArrayItem('research', i)} className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400"><Trash2 size={12} /></button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="col-span-2"><label className={labelCls}>Title</label><input value={res.title} onChange={e => updateArrayItem('research', i, 'title', e.target.value)} className={inputCls} /></div>
                        <div><label className={labelCls}>Lab</label><input value={res.lab || ''} onChange={e => updateArrayItem('research', i, 'lab', e.target.value)} className={inputCls} /></div>
                        <div><label className={labelCls}>Supervisor</label><input value={res.supervisor || ''} onChange={e => updateArrayItem('research', i, 'supervisor', e.target.value)} className={inputCls} /></div>
                        <div className="col-span-2"><label className={labelCls}>Period</label><input value={res.period || ''} onChange={e => updateArrayItem('research', i, 'period', e.target.value)} className={inputCls} /></div>
                        <div className="col-span-2">
                          <label className={labelCls}>Description</label>
                          <textarea value={res.description || ''} onChange={e => updateArrayItem('research', i, 'description', e.target.value)} rows={3}
                            className="w-full px-2.5 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 outline-none focus:border-blue-500 dark:focus:border-blue-400 resize-y" />
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Publications */}
                  {key === 'publications' && (content.publications ?? []).map((pub, i) => (
                    <div key={i} className="relative rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 p-3">
                      <button onClick={() => removeArrayItem('publications', i)} className="absolute top-2 right-2 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400"><Trash2 size={12} /></button>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="col-span-2"><label className={labelCls}>Title</label><input value={pub.title} onChange={e => updateArrayItem('publications', i, 'title', e.target.value)} className={inputCls} /></div>
                        <div><label className={labelCls}>Journal</label><input value={pub.journal || ''} onChange={e => updateArrayItem('publications', i, 'journal', e.target.value)} className={inputCls} /></div>
                        <div><label className={labelCls}>Year</label><input type="number" value={pub.year ?? ''} onChange={e => updateArrayItem('publications', i, 'year', e.target.value ? parseInt(e.target.value) : undefined)} className={inputCls} /></div>
                        <div className="col-span-2"><label className={labelCls}>Authors</label><input value={pub.authors || ''} onChange={e => updateArrayItem('publications', i, 'authors', e.target.value)} className={inputCls} /></div>
                        <div className="col-span-2"><label className={labelCls}>DOI</label><input value={pub.doi || ''} onChange={e => updateArrayItem('publications', i, 'doi', e.target.value)} className={inputCls} /></div>
                      </div>
                    </div>
                  ))}

                  {/* Skills */}
                  {key === 'skills' && (
                    <div className="space-y-2">
                      <div>
                        <label className={labelCls}>Technical Skills</label>
                        <input
                          value={(content.skills?.technical ?? []).join(', ')}
                          onChange={e => setContent(prev => ({
                            ...prev,
                            skills: { ...prev.skills, technical: e.target.value.split(',').map(s => s.trim()).filter(Boolean) },
                          }))}
                          placeholder="e.g. Python, R, MATLAB"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Languages</label>
                        <input
                          value={(content.skills?.languages ?? []).join(', ')}
                          onChange={e => setContent(prev => ({
                            ...prev,
                            skills: { ...prev.skills, languages: e.target.value.split(',').map(s => s.trim()).filter(Boolean) },
                          }))}
                          placeholder="e.g. English (IELTS 7.5), Chinese (Native)"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Tools</label>
                        <input
                          value={(content.skills?.tools ?? []).join(', ')}
                          onChange={e => setContent(prev => ({
                            ...prev,
                            skills: { ...prev.skills, tools: e.target.value.split(',').map(s => s.trim()).filter(Boolean) },
                          }))}
                          placeholder="e.g. LaTeX, Git, TensorFlow"
                          className={inputCls}
                        />
                      </div>
                    </div>
                  )}

                  {/* Awards */}
                  {key === 'awards' && (content.awards ?? []).map((award, i) => (
                    <div key={i} className="relative rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 p-3">
                      <button onClick={() => removeArrayItem('awards', i)} className="absolute top-2 right-2 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400"><Trash2 size={12} /></button>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2"><label className={labelCls}>Title</label><input value={award.title} onChange={e => updateArrayItem('awards', i, 'title', e.target.value)} className={inputCls} /></div>
                        <div><label className={labelCls}>Year</label><input type="number" value={award.year ?? ''} onChange={e => updateArrayItem('awards', i, 'year', e.target.value ? parseInt(e.target.value) : undefined)} className={inputCls} /></div>
                        <div className="col-span-3"><label className={labelCls}>Organization</label><input value={award.organization ?? award.issuer ?? ''} onChange={e => updateArrayItem('awards', i, 'organization', e.target.value)} className={inputCls} /></div>
                      </div>
                    </div>
                  ))}

                  {/* References */}
                  {key === 'references' && (content.references ?? []).map((ref, i) => (
                    <div key={i} className="relative rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 p-3">
                      <button onClick={() => removeArrayItem('references', i)} className="absolute top-2 right-2 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400"><Trash2 size={12} /></button>
                      <div className="grid grid-cols-2 gap-2">
                        <div><label className={labelCls}>Name</label><input value={ref.name} onChange={e => updateArrayItem('references', i, 'name', e.target.value)} className={inputCls} /></div>
                        <div><label className={labelCls}>Title</label><input value={ref.title || ''} onChange={e => updateArrayItem('references', i, 'title', e.target.value)} className={inputCls} /></div>
                        <div><label className={labelCls}>University</label><input value={ref.university ?? ref.institution ?? ''} onChange={e => updateArrayItem('references', i, 'university', e.target.value)} className={inputCls} /></div>
                        <div><label className={labelCls}>Email</label><input value={ref.email || ''} onChange={e => updateArrayItem('references', i, 'email', e.target.value)} className={inputCls} /></div>
                        <div className="col-span-2"><label className={labelCls}>Relationship</label><input value={ref.relationship || ''} onChange={e => updateArrayItem('references', i, 'relationship', e.target.value)} className={inputCls} /></div>
                      </div>
                    </div>
                  ))}

                  {/* Empty state */}
                  {key !== 'skills' && !(content[key] as unknown[] | undefined)?.length && (
                    <div className="text-center py-4 space-y-2">
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        暂无内容，点击"添加"按钮手动新增
                      </p>
                      <Link
                        href={`/koala/chat?mode=rp&msg=${encodeURIComponent(`我想补全CV中的${label}部分，请帮我整理`)}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium rounded-full border border-gray-200 dark:border-white/10 text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors no-underline"
                      >
                        <MessageSquare size={11} /> 让 Ola 帮我补全
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty sections hint */}
      {emptySections.length > 0 && (
        <div className="px-4 py-2.5 border-t border-gray-100 dark:border-white/5">
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-1.5">想让 CV 更完整？补全空板块：</p>
          <div className="flex flex-wrap gap-1.5">
            {emptySections.map(({ key, label }) => (
              <Link
                key={key}
                href={`/koala/chat?mode=rp&msg=${encodeURIComponent(`我想补全CV中的${label}部分，请帮我整理`)}`}
                className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full border border-gray-200 dark:border-white/10 text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors no-underline"
              >
                + {label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.01] flex-wrap">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10] hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? (
            <><Loader2 size={13} className="animate-spin" /> 保存中...</>
          ) : saved ? (
            <><Check size={13} /> 已保存</>
          ) : (
            <><Save size={13} /> 保存</>
          )}
        </button>
        <button
          onClick={handleDownloadPdf}
          disabled={downloadingPdf}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          {downloadingPdf ? (
            <><Loader2 size={13} className="animate-spin" /> 生成中...</>
          ) : (
            <><Download size={13} /> 下载 PDF</>
          )}
        </button>
      </div>
    </div>
  );
}
