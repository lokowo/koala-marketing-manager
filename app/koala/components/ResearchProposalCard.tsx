'use client';

import { useState } from 'react';
import {
  Save, Check, Loader2, FileText, ChevronDown, ChevronUp,
  Download, Sparkles, RefreshCw, X,
} from 'lucide-react';
import { SharePosterTrigger } from './SharePoster';

interface ProposalContent {
  title: string;
  background: string;
  research_questions: string;
  methodology: string;
  significance: string;
  timeline: string;
}

interface ResearchProposalCardProps {
  id: string;
  proposal: ProposalContent;
  professorId?: string;
  professorName?: string;
  professorUniversity?: string;
  status: 'draft' | 'final';
  createdAt?: string;
  onStatusChange?: (id: string, status: 'draft' | 'final') => void;
  onRegenerate?: (professorId: string) => void;
}

type SectionKey = keyof Omit<ProposalContent, 'title'>;

const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: 'background', label: '背景与文献空白' },
  { key: 'research_questions', label: '研究问题与目标' },
  { key: 'methodology', label: '研究方法' },
  { key: 'significance', label: '意义与贡献' },
  { key: 'timeline', label: '时间线' },
];

export default function ResearchProposalCard({
  id,
  proposal,
  professorId,
  professorName,
  professorUniversity,
  status: initialStatus,
  onStatusChange,
  onRegenerate,
}: ResearchProposalCardProps) {
  const [content, setContent] = useState<ProposalContent>({ ...proposal });
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // AI enhance state
  const [enhancingKey, setEnhancingKey] = useState<string | null>(null);
  const [enhancedPreview, setEnhancedPreview] = useState<{ key: SectionKey; text: string } | null>(null);

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
      const res = await fetch(`/api/user/research-proposal/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, title: content.title, status }),
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

  const handleSectionChange = (key: keyof ProposalContent, value: string) => {
    setContent(prev => ({ ...prev, [key]: value }));
  };

  const handleEnhance = async (key: SectionKey) => {
    setEnhancingKey(key);
    setEnhancedPreview(null);
    try {
      const res = await fetch('/api/user/research-proposal/enhance-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: id, section: key }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || '润色失败');
        return;
      }
      const data = await res.json();
      setEnhancedPreview({ key, text: data.enhanced });
    } catch {
      alert('网络错误，请重试');
    } finally {
      setEnhancingKey(null);
    }
  };

  const acceptEnhanced = () => {
    if (!enhancedPreview) return;
    setContent(prev => ({ ...prev, [enhancedPreview.key]: enhancedPreview.text }));
    setEnhancedPreview(null);
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const res = await fetch('/api/user/research-proposal/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposal: content,
          professorName,
          professorUniversity,
        }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Research_Proposal_${(professorName ?? 'draft').replace(/\s+/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {editingSection === 'title' ? (
              <input
                type="text"
                value={content.title}
                onChange={e => handleSectionChange('title', e.target.value)}
                onBlur={() => setEditingSection(null)}
                autoFocus
                className="w-full text-sm font-medium text-gray-900 dark:text-gray-100 bg-transparent border-b border-gray-300 dark:border-white/20 outline-none pb-0.5"
              />
            ) : (
              <h3
                onClick={() => setEditingSection('title')}
                className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-text hover:bg-gray-50 dark:hover:bg-white/[0.04] rounded px-1 -mx-1 transition-colors"
              >
                {content.title}
              </h3>
            )}
            {professorName && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {professorName}{professorUniversity ? ` · ${professorUniversity}` : ''}
              </p>
            )}
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
      </div>

      {/* Enhanced preview banner */}
      {enhancedPreview && (
        <div className="mx-4 mt-3 rounded-lg border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <Sparkles size={12} /> AI 润色结果 — {SECTIONS.find(s => s.key === enhancedPreview.key)?.label}
            </span>
            <button onClick={() => setEnhancedPreview(null)} className="text-amber-400 hover:text-amber-600 dark:hover:text-amber-300">
              <X size={14} />
            </button>
          </div>
          <div className="text-xs leading-relaxed text-amber-900 dark:text-amber-200 max-h-48 overflow-y-auto whitespace-pre-wrap mb-3">
            {enhancedPreview.text.substring(0, 600)}{enhancedPreview.text.length > 600 ? '...' : ''}
          </div>
          <div className="flex gap-2">
            <button
              onClick={acceptEnhanced}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]"
            >
              <Check size={12} /> 接受
            </button>
            <button
              onClick={() => setEnhancedPreview(null)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400"
            >
              放弃
            </button>
          </div>
        </div>
      )}

      {/* Sections */}
      <div className="divide-y divide-gray-100 dark:divide-white/5">
        {SECTIONS.map(({ key, label }) => {
          const collapsed = collapsedSections.has(key);
          const editing = editingSection === key;
          const isEnhancing = enhancingKey === key;

          return (
            <div key={key} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => toggleCollapse(key)}
                  className="flex items-center gap-1 text-left"
                >
                  <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {label}
                  </h4>
                  {collapsed
                    ? <ChevronDown size={14} className="text-gray-400 dark:text-gray-500" />
                    : <ChevronUp size={14} className="text-gray-400 dark:text-gray-500" />
                  }
                </button>
                {!collapsed && (
                  <button
                    onClick={() => handleEnhance(key)}
                    disabled={isEnhancing || !!enhancingKey}
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                  >
                    {isEnhancing ? (
                      <><Loader2 size={10} className="animate-spin" /> 润色中</>
                    ) : (
                      <><Sparkles size={10} /> AI 润色</>
                    )}
                  </button>
                )}
              </div>

              {!collapsed && (
                <div className="mt-2">
                  {editing ? (
                    <textarea
                      value={content[key]}
                      onChange={e => handleSectionChange(key, e.target.value)}
                      onBlur={() => setEditingSection(null)}
                      autoFocus
                      rows={8}
                      className="w-full text-sm leading-relaxed text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-lg p-3 outline-none resize-y"
                    />
                  ) : (
                    <div
                      onClick={() => setEditingSection(key)}
                      className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap cursor-text rounded-lg p-3 bg-gray-50 dark:bg-white/[0.03] border border-transparent hover:border-gray-200 dark:hover:border-white/10 transition-colors"
                    >
                      {content[key]}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

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
        {professorId && onRegenerate && (
          <button
            onClick={() => onRegenerate(professorId)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
          >
            <RefreshCw size={13} /> 重新生成
          </button>
        )}
        <SharePosterTrigger label="分享" proposalCount={1} />
        <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 ml-auto">
          <FileText size={12} />
          点击段落编辑
        </div>
      </div>
    </div>
  );
}
