'use client';

import { useState } from 'react';
import { Save, Check, Loader2, FileText, Download } from 'lucide-react';

interface LetterContent {
  letter: string;
  cover_note: string;
}

interface RecommendationLetterCardProps {
  id: string;
  content: LetterContent;
  recommenderName: string;
  recommenderTitle?: string;
  status: 'draft' | 'final';
  onStatusChange?: (id: string, status: 'draft' | 'final') => void;
}

export default function RecommendationLetterCard({
  id,
  content: initial,
  recommenderName,
  recommenderTitle,
  status: initialStatus,
  onStatusChange,
}: RecommendationLetterCardProps) {
  const [content, setContent] = useState<LetterContent>({ ...initial });
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editingSection, setEditingSection] = useState<'letter' | 'cover_note' | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/user/research-proposal/${id}`, {
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

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const res = await fetch('/api/user/recommendation-letter/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          letter: content.letter,
          recommenderName,
          recommenderTitle,
        }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Recommendation_Letter_${recommenderName.replace(/\s+/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent
    } finally {
      setDownloadingPdf(false);
    }
  };

  const sections: { key: 'letter' | 'cover_note'; label: string; hint: string }[] = [
    { key: 'letter', label: '推荐信正文', hint: '给招生委员会的正式推荐信' },
    { key: 'cover_note', label: '给推荐人的说明', hint: '附给推荐人参考的要点说明' },
  ];

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              推荐信 — {recommenderName}
            </h3>
            {recommenderTitle && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{recommenderTitle}</p>
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

      {/* Sections */}
      <div className="divide-y divide-gray-100 dark:divide-white/5">
        {sections.map(({ key, label, hint }) => {
          const editing = editingSection === key;
          return (
            <div key={key} className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {label}
                </h4>
                <span className="text-[10px] text-gray-400 dark:text-gray-500">{hint}</span>
              </div>
              {editing ? (
                <textarea
                  value={content[key]}
                  onChange={e => setContent(prev => ({ ...prev, [key]: e.target.value }))}
                  onBlur={() => setEditingSection(null)}
                  autoFocus
                  rows={key === 'letter' ? 14 : 6}
                  className="w-full text-sm leading-relaxed text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-lg p-3 outline-none resize-y"
                />
              ) : (
                <div
                  onClick={() => setEditingSection(key)}
                  className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap cursor-text rounded-lg p-3 bg-gray-50 dark:bg-white/[0.03] border border-transparent hover:border-gray-200 dark:hover:border-white/10 transition-colors"
                >
                  {content[key] || '（空）'}
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
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10] hover:opacity-90 transition-opacity disabled:opacity-50 min-h-[44px]"
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
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors disabled:opacity-50 min-h-[44px]"
        >
          {downloadingPdf ? (
            <><Loader2 size={13} className="animate-spin" /> 生成中...</>
          ) : (
            <><Download size={13} /> 下载 PDF</>
          )}
        </button>
        <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 ml-auto">
          <FileText size={12} />
          点击段落编辑
        </div>
      </div>
    </div>
  );
}
