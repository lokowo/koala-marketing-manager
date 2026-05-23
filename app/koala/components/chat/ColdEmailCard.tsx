'use client';

import { useState, useRef, useCallback } from 'react';
import { Copy, Mail, Save, RefreshCw, Pencil, Check, Eye, Lock } from 'lucide-react';
import { ProfessorPreviewCard, type ProfessorPreviewData } from './ProfessorPreviewCard';
import { SharePosterTrigger } from '../SharePoster';

interface Highlight {
  text: string;
  type: 'student' | 'professor';
}

interface MatchScores {
  researchAlignment: number;
  backgroundFit: number;
  researchReadiness: number;
  opportunity: number;
  overall: number;
}

const WATERMARK_SEPARATOR = '\n\n---\nCrafted with Koala PhD';
const WATERMARK_TEXT = '---\nCrafted with Koala PhD | AI-powered PhD advisor\nProfessor portal: koalaphd.com/professor/claim';

function splitWatermark(body: string): { content: string; hasWatermark: boolean } {
  const idx = body.indexOf(WATERMARK_SEPARATOR);
  if (idx === -1) return { content: body, hasWatermark: false };
  return { content: body.slice(0, idx).trimEnd(), hasWatermark: true };
}

interface ColdEmailCardProps {
  subject: string;
  body: string;
  highlights: Highlight[];
  matchScores: MatchScores;
  creditsUsed: number;
  creditsRemaining: number;
  onRegenerate: () => void;
  coldEmailId?: string;
  professorId?: string;
  userPlan?: string;
}

const SCORE_LABELS: { key: keyof MatchScores; label: string }[] = [
  { key: 'researchAlignment', label: 'Research Alignment' },
  { key: 'backgroundFit', label: 'Background Fit' },
  { key: 'researchReadiness', label: 'Research Readiness' },
  { key: 'opportunity', label: 'Opportunity' },
  { key: 'overall', label: 'Overall' },
];

function scoreColor(pct: number) {
  if (pct >= 80) return { text: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-500/10', border: 'border-green-200 dark:border-green-500/20' };
  if (pct >= 60) return { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-200 dark:border-amber-500/20' };
  return { text: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10', border: 'border-red-200 dark:border-red-500/20' };
}

function highlightBody(body: string, highlights: Highlight[]): React.ReactNode[] {
  if (!highlights.length) return [body];

  type Segment = { text: string; type?: 'student' | 'professor' };
  let segments: Segment[] = [{ text: body }];

  for (const hl of highlights) {
    const next: Segment[] = [];
    for (const seg of segments) {
      if (seg.type) {
        next.push(seg);
        continue;
      }
      const idx = seg.text.indexOf(hl.text);
      if (idx === -1) {
        next.push(seg);
        continue;
      }
      if (idx > 0) next.push({ text: seg.text.slice(0, idx) });
      next.push({ text: hl.text, type: hl.type });
      const after = seg.text.slice(idx + hl.text.length);
      if (after) next.push({ text: after });
    }
    segments = next;
  }

  return segments.map((seg, i) => {
    if (!seg.type) return <span key={i}>{seg.text}</span>;
    const cls = seg.type === 'student'
      ? 'bg-[#E6F1FB] dark:bg-blue-500/15 rounded px-0.5'
      : 'bg-[#E1F5EE] dark:bg-green-500/15 rounded px-0.5';
    return <mark key={i} className={cls}>{seg.text}</mark>;
  });
}

export function ColdEmailCard({
  subject: initialSubject,
  body: initialBody,
  highlights,
  matchScores,
  creditsUsed,
  creditsRemaining,
  onRegenerate,
  coldEmailId,
  professorId,
  userPlan,
}: ColdEmailCardProps) {
  const { content: cleanBody, hasWatermark } = splitWatermark(initialBody);
  const [subject, setSubject] = useState(initialSubject);
  const [editingSubject, setEditingSubject] = useState(false);
  const [subjectDraft, setSubjectDraft] = useState(initialSubject);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [previewData, setPreviewData] = useState<ProfessorPreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const isElite = userPlan === 'elite';

  const handleProfessorPreview = async () => {
    if (!isElite) return;
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const payload = coldEmailId
        ? { coldEmailId }
        : { subject, body: bodyRef.current?.innerText ?? cleanBody, professorId };

      const res = await fetch('/api/chat/professor-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setPreviewError(data.error || '预览生成失败');
        return;
      }
      setPreviewData(data);
    } catch {
      setPreviewError('网络错误，请稍后再试');
    } finally {
      setPreviewLoading(false);
    }
  };

  const getFullText = useCallback(() => {
    const bodyText = bodyRef.current?.innerText ?? cleanBody;
    const watermark = hasWatermark ? `\n\n${WATERMARK_TEXT}` : '';
    return `${bodyText}${watermark}`;
  }, [cleanBody, hasWatermark]);

  const getPlainText = useCallback(() => {
    return `Subject: ${subject}\n\n${getFullText()}`;
  }, [subject, getFullText]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(getPlainText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMailto = () => {
    const params = new URLSearchParams({ subject, body: getFullText() });
    window.open(`mailto:?${params.toString()}`);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/user/cold-emails/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body: getFullText() }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // handled silently
    } finally {
      setSaving(false);
    }
  };

  const confirmSubject = () => {
    setSubject(subjectDraft);
    setEditingSubject(false);
  };

  return (
    <div className="mt-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] shadow-sm overflow-hidden">
      {/* 1. Match score dashboard */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-white/10">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {SCORE_LABELS.map(({ key, label }) => {
            const pct = matchScores[key];
            const c = scoreColor(pct);
            return (
              <div
                key={key}
                className={`flex-1 min-w-[88px] rounded-lg border px-2.5 py-2 text-center ${c.bg} ${c.border}`}
              >
                <p className={`text-lg font-medium tabular-nums ${c.text}`}>{pct}%</p>
                <p className="text-[10px] leading-tight text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Subject */}
      <div className="px-4 py-2.5 border-b border-gray-100 dark:border-white/5 flex items-center gap-2">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0">Subject:</span>
        {editingSubject ? (
          <div className="flex-1 flex items-center gap-1.5">
            <input
              autoFocus
              value={subjectDraft}
              onChange={e => setSubjectDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') confirmSubject();
                if (e.key === 'Escape') { setSubjectDraft(subject); setEditingSubject(false); }
              }}
              className="flex-1 min-w-0 h-7 px-2 text-sm bg-white dark:bg-white/10 border border-blue-400 dark:border-blue-500/50 rounded text-gray-900 dark:text-gray-100 outline-none"
            />
            <button onClick={confirmSubject} className="p-0.5 text-blue-600 dark:text-blue-400">
              <Check size={14} />
            </button>
          </div>
        ) : (
          <div
            className="flex-1 flex items-center gap-1.5 group cursor-pointer min-w-0"
            onClick={() => { setSubjectDraft(subject); setEditingSubject(true); }}
          >
            <span className="text-sm text-gray-900 dark:text-gray-100 truncate">{subject}</span>
            <Pencil size={12} className="text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </div>
        )}
      </div>

      {/* 3. Body with highlights */}
      <div
        ref={bodyRef}
        contentEditable
        suppressContentEditableWarning
        className="px-4 py-3 text-sm leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20 min-h-[120px]"
      >
        {highlightBody(cleanBody, highlights)}
      </div>

      {/* Watermark */}
      {hasWatermark && (
        <div className="px-4 pb-3 select-none pointer-events-none">
          <div className="border-t border-gray-200 dark:border-white/10 pt-2 mt-1">
            <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
              Crafted with Koala PhD | AI-powered PhD advisor
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
              Professor portal: koalaphd.com/professor/claim
            </p>
          </div>
        </div>
      )}

      {/* 4. Action buttons */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
          >
            {copied ? <><Check size={13} /> 已复制</> : <><Copy size={13} /> 复制全文</>}
          </button>
          <button
            onClick={handleMailto}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
          >
            <Mail size={13} /> 邮件打开
          </button>
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            {saved ? <><Check size={13} /> 已保存</> : saving ? '保存中...' : <><Save size={13} /> 保存草稿</>}
          </button>
          <button
            onClick={onRegenerate}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            <RefreshCw size={13} /> 重新生成
          </button>
        </div>
      </div>

      {/* Share prompt */}
      <div className="px-4 py-2 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
        <p className="text-[10px] text-gray-400 dark:text-gray-500">觉得好用？分享给同学 →</p>
        <SharePosterTrigger label="分享海报" emailCount={1} />
      </div>

      {/* 5. Legend + 6. Credits */}
      <div className="px-4 py-2 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3 text-[10px] text-gray-400 dark:text-gray-500">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#E6F1FB] dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/30" />
            你的背景
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#E1F5EE] dark:bg-green-500/15 border border-green-200 dark:border-green-500/30" />
            教授研究
          </span>
        </div>
        <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">
          {creditsUsed} credits used
          {creditsRemaining > 0 && <span className="ml-1">({creditsRemaining} remaining)</span>}
        </span>
      </div>

      {/* Professor Preview */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-white/10">
        {previewData ? (
          <ProfessorPreviewCard data={previewData} onOptimize={onRegenerate} />
        ) : isElite ? (
          <>
            {previewError && (
              <p className="text-xs text-red-500 mb-2">{previewError}</p>
            )}
            <button
              onClick={handleProfessorPreview}
              disabled={previewLoading}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {previewLoading ? (
                <><span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /> AI 分析中...</>
              ) : (
                <><Eye size={13} /> 教授会怎么看？</>
              )}
            </button>
          </>
        ) : (
          <div className="flex items-center justify-between rounded-lg px-3 py-2.5 bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <Lock size={12} />
              <span>教授视角预览</span>
            </div>
            <a
              href="/koala/pricing"
              className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#1A1A2E] dark:bg-blue-500 text-white no-underline"
            >
              升级 Elite
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
