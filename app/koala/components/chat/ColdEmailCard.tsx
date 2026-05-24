'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Copy, Mail, Save, RefreshCw, Pencil, Check, Eye, Lock, Send, Loader2, Paperclip, FileText, ChevronRight, ChevronLeft, AlertCircle, Download, X } from 'lucide-react';
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
  professorName?: string;
  professorEmail?: string;
  userPlan?: string;
  sentAt?: string | null;
  sentVia?: string | null;
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

type SendStep = 'compose' | 'attachments' | 'confirm';

interface AttachmentInfo {
  type: 'research_proposal' | 'cv';
  available: boolean;
  enabled: boolean;
  title: string;
  filename: string;
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
  professorName,
  professorEmail,
  userPlan,
  sentAt: initialSentAt,
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

  // 3-step send flow
  const [sendStep, setSendStep] = useState<SendStep | null>(null);
  const [gmailStatus, setGmailStatus] = useState<{ connected: boolean; gmail_address: string | null; token_expired?: boolean }>({ connected: false, gmail_address: null });
  const [sending, setSending] = useState(false);
  const [emailSent, setEmailSent] = useState(!!initialSentAt);
  const [sendError, setSendError] = useState<string | null>(null);

  // Attachments
  const [attachments, setAttachments] = useState<AttachmentInfo[]>([
    { type: 'research_proposal', available: false, enabled: false, title: '研究计划', filename: 'Research_Proposal.pdf' },
    { type: 'cv', available: false, enabled: false, title: '学术 CV', filename: 'Academic_CV.pdf' },
  ]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);

  const isElite = userPlan === 'elite';

  useEffect(() => {
    fetch('/api/user/gmail/status').then(r => r.json()).then(d => {
      setGmailStatus({ connected: d.connected ?? false, gmail_address: d.gmail_address ?? null, token_expired: d.token_expired });
    }).catch(() => {});
  }, []);

  // Check available attachments when entering step 2
  const loadAttachmentStatus = useCallback(async () => {
    setAttachmentsLoading(true);
    try {
      const [proposalRes, cvRes] = await Promise.all([
        fetch(`/api/user/research-proposal/list`).then(r => r.json()).catch(() => ({ documents: [] })),
        fetch('/api/user/generate-cv').then(r => r.json()).catch(() => ({ cv: null })),
      ]);
      const hasProposal = (proposalRes.documents ?? []).some(
        (d: { professor_id?: string }) => d.professor_id === professorId
      );
      const hasCv = !!cvRes.cv;
      setAttachments(prev => prev.map(a => {
        if (a.type === 'research_proposal') return { ...a, available: hasProposal, enabled: hasProposal };
        if (a.type === 'cv') return { ...a, available: hasCv, enabled: hasCv };
        return a;
      }));
    } catch { /* silent */ }
    setAttachmentsLoading(false);
  }, [professorId]);

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
    } catch { /* silent */ }
    setSaving(false);
  };

  const confirmSubject = () => {
    setSubject(subjectDraft);
    setEditingSubject(false);
  };

  // Fetch PDF as base64 for attachment
  const fetchPdfBase64 = async (type: 'research_proposal' | 'cv'): Promise<string | null> => {
    try {
      if (type === 'research_proposal') {
        const listRes = await fetch('/api/user/research-proposal/list').then(r => r.json());
        const doc = (listRes.documents ?? []).find((d: { professor_id?: string }) => d.professor_id === professorId);
        if (!doc) return null;
        const pdfRes = await fetch('/api/user/research-proposal/pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            proposal: doc.content,
            studentName: doc.title?.split(' — ')[1] ?? '',
            professorName: professorName ?? '',
            professorUniversity: '',
          }),
        });
        if (!pdfRes.ok) return null;
        const buf = await pdfRes.arrayBuffer();
        return Buffer.from(buf).toString('base64');
      } else {
        const cvRes = await fetch('/api/user/generate-cv').then(r => r.json());
        if (!cvRes.cv) return null;
        const pdfRes = await fetch('/api/user/generate-cv-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cv: cvRes.cv }),
        });
        if (!pdfRes.ok) return null;
        const buf = await pdfRes.arrayBuffer();
        return Buffer.from(buf).toString('base64');
      }
    } catch {
      return null;
    }
  };

  const handleGmailSend = async () => {
    if (!professorEmail) return;
    setSending(true);
    setSendError(null);
    try {
      const bodyText = bodyRef.current?.innerText ?? cleanBody;
      const htmlBody = bodyText.replace(/\n/g, '<br/>');

      // Build attachments
      const enabledAttachments = attachments.filter(a => a.enabled && a.available);
      const pdfAttachments: { filename: string; mimeType: string; base64Data: string }[] = [];

      for (const att of enabledAttachments) {
        const base64 = await fetchPdfBase64(att.type);
        if (base64) {
          pdfAttachments.push({
            filename: att.filename,
            mimeType: 'application/pdf',
            base64Data: base64,
          });
        }
      }

      const res = await fetch('/api/user/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cold_email_id: coldEmailId,
          to_email: professorEmail,
          subject,
          body_html: htmlBody,
          attachments: pdfAttachments.length > 0 ? pdfAttachments : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'GMAIL_NOT_CONNECTED' || data.code === 'GMAIL_TOKEN_EXPIRED') {
          setGmailStatus({ connected: false, gmail_address: null });
        }
        setSendError(data.error || '发送失败');
      } else {
        setEmailSent(true);
        setSendStep(null);
      }
    } catch {
      setSendError('网络错误，请稍后重试');
    } finally {
      setSending(false);
    }
  };

  const handleCopyAll = async () => {
    await navigator.clipboard.writeText(getPlainText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    // Download enabled PDFs
    const enabledAttachments = attachments.filter(a => a.enabled && a.available);
    for (const att of enabledAttachments) {
      const base64 = await fetchPdfBase64(att.type);
      if (base64) {
        const blob = new Blob([Buffer.from(base64, 'base64')], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = att.filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    }
  };

  const startSendFlow = () => {
    setSendStep('compose');
    setSendError(null);
  };

  const goToAttachments = () => {
    setSendStep('attachments');
    loadAttachmentStatus();
  };

  // ─── Render ───────────────────────────────────

  // Already-sent state
  if (emailSent) {
    return (
      <div className="mt-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] shadow-sm overflow-hidden">
        {/* Scores */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-white/10">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {SCORE_LABELS.map(({ key, label }) => {
              const pct = matchScores[key];
              const c = scoreColor(pct);
              return (
                <div key={key} className={`flex-1 min-w-[88px] rounded-lg border px-2.5 py-2 text-center ${c.bg} ${c.border}`}>
                  <p className={`text-lg font-medium tabular-nums ${c.text}`}>{pct}%</p>
                  <p className="text-[10px] leading-tight text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
                </div>
              );
            })}
          </div>
        </div>
        {/* Sent status */}
        <div className="px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-green-50 dark:bg-green-500/10 flex items-center justify-center">
            <Check size={16} className="text-[#5a8060] dark:text-green-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-[#5a8060] dark:text-green-400">已发送</p>
            {gmailStatus.gmail_address && professorEmail && (
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                {gmailStatus.gmail_address} → {professorEmail}
              </p>
            )}
          </div>
        </div>
        {/* Copy fallback */}
        <div className="px-4 py-2 border-t border-gray-100 dark:border-white/5 flex gap-2">
          <button onClick={handleCopy} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-colors">
            {copied ? <><Check size={12} /> 已复制</> : <><Copy size={12} /> 复制全文</>}
          </button>
          <button onClick={onRegenerate} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-colors">
            <RefreshCw size={12} /> 重新生成
          </button>
        </div>
      </div>
    );
  }

  // 3-step send flow overlay
  if (sendStep) {
    return (
      <div className="mt-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] shadow-sm overflow-hidden">
        {/* Step indicator */}
        <div className="px-4 py-2.5 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {(['compose', 'attachments', 'confirm'] as const).map((step, i) => (
              <div key={step} className="flex items-center gap-1">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium ${
                  sendStep === step
                    ? 'bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]'
                    : 'bg-gray-100 dark:bg-white/10 text-gray-400 dark:text-gray-500'
                }`}>
                  {i + 1}
                </div>
                <span className={`text-[10px] ${sendStep === step ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
                  {step === 'compose' ? '邮件内容' : step === 'attachments' ? '附件' : '确认发送'}
                </span>
                {i < 2 && <ChevronRight size={10} className="text-gray-300 dark:text-gray-600 mx-0.5" />}
              </div>
            ))}
          </div>
          <button onClick={() => setSendStep(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X size={14} />
          </button>
        </div>

        {/* Step 1: Compose */}
        {sendStep === 'compose' && (
          <>
            {/* Recipient */}
            <div className="px-4 py-2.5 border-b border-gray-100 dark:border-white/5 flex items-center gap-2">
              <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">To:</span>
              <span className="text-xs text-gray-900 dark:text-gray-100 font-medium">{professorName ?? 'Professor'}</span>
              {professorEmail ? (
                <span className="text-[11px] text-gray-500 dark:text-gray-400">&lt;{professorEmail}&gt;</span>
              ) : (
                <span className="text-[11px] text-amber-600 dark:text-amber-400">邮箱未知</span>
              )}
            </div>
            {/* Subject */}
            <div className="px-4 py-2.5 border-b border-gray-100 dark:border-white/5 flex items-center gap-2">
              <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">Subject:</span>
              {editingSubject ? (
                <div className="flex-1 flex items-center gap-1.5">
                  <input autoFocus value={subjectDraft} onChange={e => setSubjectDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') confirmSubject(); if (e.key === 'Escape') { setSubjectDraft(subject); setEditingSubject(false); } }}
                    className="flex-1 min-w-0 h-7 px-2 text-sm bg-white dark:bg-white/10 border border-blue-400 dark:border-blue-500/50 rounded text-gray-900 dark:text-gray-100 outline-none" />
                  <button onClick={confirmSubject} className="p-0.5 text-blue-600 dark:text-blue-400"><Check size={14} /></button>
                </div>
              ) : (
                <div className="flex-1 flex items-center gap-1.5 group cursor-pointer min-w-0" onClick={() => { setSubjectDraft(subject); setEditingSubject(true); }}>
                  <span className="text-sm text-gray-900 dark:text-gray-100 truncate">{subject}</span>
                  <Pencil size={12} className="text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
              )}
            </div>
            {/* Body */}
            <div ref={bodyRef} contentEditable suppressContentEditableWarning
              className="px-4 py-3 text-sm leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20 min-h-[120px] max-h-[300px] overflow-y-auto">
              {highlightBody(cleanBody, highlights)}
            </div>
            {hasWatermark && (
              <div className="px-4 pb-2 select-none pointer-events-none">
                <div className="border-t border-gray-200 dark:border-white/10 pt-2 mt-1">
                  <p className="text-xs text-gray-400 dark:text-gray-500">Crafted with Koala PhD | AI-powered PhD advisor</p>
                </div>
              </div>
            )}
            {/* Legend */}
            <div className="px-4 py-2 border-t border-gray-100 dark:border-white/5 flex items-center gap-3 text-[10px] text-gray-400 dark:text-gray-500">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#E6F1FB] dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/30" />
                你的背景
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#E1F5EE] dark:bg-green-500/15 border border-green-200 dark:border-green-500/30" />
                教授研究
              </span>
              <span className="ml-auto text-[10px]">发送时高亮标注自动去除</span>
            </div>
            {/* Actions */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] flex gap-2">
              <button onClick={goToAttachments}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium rounded-lg bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10] hover:opacity-90 transition-opacity">
                下一步：选择附件 <ChevronRight size={13} />
              </button>
              <button onClick={() => setSendStep(null)}
                className="px-3 py-2.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400">
                取消
              </button>
            </div>
          </>
        )}

        {/* Step 2: Attachments */}
        {sendStep === 'attachments' && (
          <>
            <div className="px-4 py-4 space-y-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">选择要随邮件发送的 PDF 附件（可选）</p>
              {attachmentsLoading ? (
                <div className="flex items-center justify-center py-6 text-gray-400">
                  <Loader2 size={16} className="animate-spin mr-2" /> 检查可用文档...
                </div>
              ) : (
                attachments.map(att => (
                  <div key={att.type} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-white/10">
                    <FileText size={18} className={att.available ? 'text-[#1A1A2E] dark:text-[#D4A843]' : 'text-gray-300 dark:text-gray-600'} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{att.title}</p>
                      {att.available ? (
                        <p className="text-[11px] text-[#5a8060] dark:text-green-400">{att.filename}</p>
                      ) : (
                        <p className="text-[11px] text-gray-400 dark:text-gray-500">尚未生成</p>
                      )}
                    </div>
                    {att.available ? (
                      <button
                        onClick={() => setAttachments(prev => prev.map(a => a.type === att.type ? { ...a, enabled: !a.enabled } : a))}
                        className={`w-10 h-5 rounded-full transition-colors relative ${
                          att.enabled ? 'bg-[#5a8060] dark:bg-green-500' : 'bg-gray-200 dark:bg-white/10'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${att.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    ) : (
                      <a
                        href={att.type === 'research_proposal' ? '/koala/my-documents' : '/koala/my-documents'}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 no-underline hover:bg-gray-200 dark:hover:bg-white/15 transition-colors"
                      >
                        去生成
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
            {/* Actions */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] flex gap-2">
              <button onClick={() => setSendStep('compose')}
                className="px-3 py-2.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <ChevronLeft size={13} /> 上一步
              </button>
              <button onClick={() => setSendStep('confirm')}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium rounded-lg bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10] hover:opacity-90 transition-opacity">
                下一步：确认发送 <ChevronRight size={13} />
              </button>
            </div>
          </>
        )}

        {/* Step 3: Confirm */}
        {sendStep === 'confirm' && (
          <>
            <div className="px-4 py-4 space-y-3">
              {/* Summary */}
              <div className="space-y-2 text-xs">
                <div className="flex gap-2">
                  <span className="text-gray-400 dark:text-gray-500 w-12 shrink-0">发件人</span>
                  <span className="text-gray-900 dark:text-gray-100">{gmailStatus.connected ? gmailStatus.gmail_address : '未连接 Gmail'}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-400 dark:text-gray-500 w-12 shrink-0">收件人</span>
                  <span className="text-gray-900 dark:text-gray-100">{professorName} {professorEmail ? `<${professorEmail}>` : '(邮箱未知)'}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-400 dark:text-gray-500 w-12 shrink-0">主题</span>
                  <span className="text-gray-900 dark:text-gray-100 truncate">{subject}</span>
                </div>
                {attachments.some(a => a.enabled && a.available) && (
                  <div className="flex gap-2">
                    <span className="text-gray-400 dark:text-gray-500 w-12 shrink-0">附件</span>
                    <div className="flex flex-wrap gap-1.5">
                      {attachments.filter(a => a.enabled && a.available).map(a => (
                        <span key={a.type} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300">
                          <Paperclip size={10} /> {a.title}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Gmail status */}
              {!gmailStatus.connected ? (
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20">
                  <p className="text-xs text-gray-700 dark:text-gray-300 mb-2">
                    连接你的 Gmail 后，可直接从你的邮箱发送。教授看到的是你的真实邮箱地址，回复率更高。
                  </p>
                  <a href="/api/auth/gmail/connect"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-[#4285f4] text-white no-underline hover:bg-[#3367d6] transition-colors">
                    <Mail size={13} /> 连接 Gmail
                  </a>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">
                    没有 Gmail？点下方"复制全部"粘贴到任何邮箱发送
                  </p>
                </div>
              ) : gmailStatus.token_expired ? (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20">
                  <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5 mb-2">
                    <AlertCircle size={13} /> Gmail 连接已失效，可能已在 Google 设置中撤销授权
                  </p>
                  <a href="/api/auth/gmail/connect"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-[#4285f4] text-white no-underline hover:bg-[#3367d6] transition-colors">
                    重新连接 Gmail
                  </a>
                </div>
              ) : null}

              {sendError && (
                <p className="text-xs text-[#b06040] flex items-center gap-1"><AlertCircle size={12} /> {sendError}</p>
              )}
            </div>

            {/* Actions */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] space-y-2">
              <div className="flex gap-2">
                <button onClick={() => setSendStep('attachments')}
                  className="px-3 py-2.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <ChevronLeft size={13} /> 上一步
                </button>
                {gmailStatus.connected && !gmailStatus.token_expired && professorEmail ? (
                  <button onClick={handleGmailSend} disabled={sending}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium rounded-lg bg-[#5a8060] text-white hover:bg-[#4a7050] transition-colors disabled:opacity-50">
                    {sending ? <><Loader2 size={13} className="animate-spin" /> 发送中…</> : <><Send size={13} /> 确认发送</>}
                  </button>
                ) : null}
                <button onClick={handleCopyAll} disabled={sending}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors">
                  {copied ? <><Check size={13} /> 已复制</> : <><Download size={13} /> 复制全部</>}
                </button>
              </div>
              {!gmailStatus.connected && (
                <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center">
                  邮件文本复制到剪贴板{attachments.some(a => a.enabled && a.available) ? ' + PDF 文件自动下载' : ''}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // ─── Default view (not in send flow) ──────────

  return (
    <div className="mt-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] shadow-sm overflow-hidden">
      {/* 1. Match score dashboard */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-white/10">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {SCORE_LABELS.map(({ key, label }) => {
            const pct = matchScores[key];
            const c = scoreColor(pct);
            return (
              <div key={key} className={`flex-1 min-w-[88px] rounded-lg border px-2.5 py-2 text-center ${c.bg} ${c.border}`}>
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
            <input autoFocus value={subjectDraft} onChange={e => setSubjectDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') confirmSubject(); if (e.key === 'Escape') { setSubjectDraft(subject); setEditingSubject(false); } }}
              className="flex-1 min-w-0 h-7 px-2 text-sm bg-white dark:bg-white/10 border border-blue-400 dark:border-blue-500/50 rounded text-gray-900 dark:text-gray-100 outline-none" />
            <button onClick={confirmSubject} className="p-0.5 text-blue-600 dark:text-blue-400"><Check size={14} /></button>
          </div>
        ) : (
          <div className="flex-1 flex items-center gap-1.5 group cursor-pointer min-w-0" onClick={() => { setSubjectDraft(subject); setEditingSubject(true); }}>
            <span className="text-sm text-gray-900 dark:text-gray-100 truncate">{subject}</span>
            <Pencil size={12} className="text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </div>
        )}
      </div>

      {/* 3. Body with highlights */}
      <div ref={bodyRef} contentEditable suppressContentEditableWarning
        className="px-4 py-3 text-sm leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20 min-h-[120px]">
        {highlightBody(cleanBody, highlights)}
      </div>

      {/* Watermark */}
      {hasWatermark && (
        <div className="px-4 pb-3 select-none pointer-events-none">
          <div className="border-t border-gray-200 dark:border-white/10 pt-2 mt-1">
            <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">Crafted with Koala PhD | AI-powered PhD advisor</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">Professor portal: koalaphd.com/professor/claim</p>
          </div>
        </div>
      )}

      {/* 4. Action buttons */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
        <div className="flex gap-2 flex-wrap">
          {/* Primary: Start send flow */}
          <button onClick={startSendFlow}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium rounded-lg bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10] hover:opacity-90 transition-opacity">
            <Send size={13} /> 准备发送
          </button>
          <button onClick={handleCopy}
            className="flex-1 min-w-[80px] flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors">
            {copied ? <><Check size={13} /> 已复制</> : <><Copy size={13} /> 复制全文</>}
          </button>
          <button onClick={handleSave} disabled={saving || saved}
            className="flex-1 min-w-[80px] flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors disabled:opacity-50">
            {saved ? <><Check size={13} /> 已保存</> : saving ? '保存中...' : <><Save size={13} /> 保存草稿</>}
          </button>
          <button onClick={onRegenerate}
            className="flex-1 min-w-[80px] flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium rounded-lg bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors">
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
            {previewError && <p className="text-xs text-red-500 mb-2">{previewError}</p>}
            <button onClick={handleProfessorPreview} disabled={previewLoading}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors disabled:opacity-50 min-h-[44px]">
              {previewLoading ? <><span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /> AI 分析中...</> : <><Eye size={13} /> 教授会怎么看？</>}
            </button>
          </>
        ) : (
          <div className="flex items-center justify-between rounded-lg px-3 py-2.5 bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <Lock size={12} /><span>教授视角预览</span>
            </div>
            <a href="/koala/pricing" className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#1A1A2E] dark:bg-blue-500 text-white no-underline">升级 Elite</a>
          </div>
        )}
      </div>
    </div>
  );
}
