'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '../components/AuthContext';
import {
  LayoutGrid, List, ExternalLink, Mail, Bell,
  FileText, ChevronDown, X, Check, Clock, Loader2, Sparkles,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────
interface Professor {
  id: string;
  name: string;
  university: string;
  slug: string | null;
  position_title: string | null;
  research_areas: string[];
  h_index: number | null;
  accepting_students: string | null;
}

interface Application {
  id: string;
  professor_id: string;
  university: string | null;
  stage: Stage;
  outcome: 'offer' | 'rejected' | 'withdrawn' | null;
  notes: string | null;
  next_action: string | null;
  next_action_date: string | null;
  cold_email_id: string | null;
  created_at: string;
  updated_at: string;
  professors: Professor | null;
  deadline?: string | null;
}

const STAGES = ['saved', 'drafted', 'sent', 'replied', 'preparing', 'submitted', 'interview', 'decided'] as const;
type Stage = typeof STAGES[number];

const STAGE_META: Record<Stage, { label: string; emoji: string }> = {
  saved:     { label: '收藏',         emoji: '⭐' },
  drafted:   { label: '已生成套磁信', emoji: '✍️' },
  sent:      { label: '已发送',       emoji: '📤' },
  replied:   { label: '教授回复',     emoji: '💬' },
  preparing: { label: '准备材料',     emoji: '📋' },
  submitted: { label: '已提交申请',   emoji: '📨' },
  interview: { label: '面试',         emoji: '🎤' },
  decided:   { label: '结果',         emoji: '🏁' },
};

const OUTCOME_BADGE: Record<string, { label: string; cls: string }> = {
  offer:     { label: 'Offer',     cls: 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-500/20' },
  rejected:  { label: 'Rejected',  cls: 'bg-gray-100 dark:bg-gray-500/10 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-500/20' },
  withdrawn: { label: 'Withdrawn', cls: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20' },
};

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-rose-500',
  'bg-amber-500', 'bg-cyan-500', 'bg-pink-500', 'bg-indigo-500',
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}天前`;
  if (days < 30) return `${Math.floor(days / 7)}周前`;
  return new Date(dateStr).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

function deadlineLabel(d: string): { text: string; urgent: boolean } {
  const diff = new Date(d).getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (days < 0) return { text: '已截止', urgent: true };
  if (days <= 7) return { text: `${days}天后截止`, urgent: true };
  if (days <= 30) return { text: `${days}天后截止`, urgent: false };
  return { text: new Date(d).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' }), urgent: false };
}

// ─── Card Detail Modal ─────────────────────────────
function CardModal({
  app,
  onClose,
  onUpdate,
  hasProposal,
  onGenerateProposal,
  isGenerating,
}: {
  app: Application;
  onClose: () => void;
  onUpdate: (id: string, patch: Record<string, unknown>) => void;
  hasProposal?: boolean;
  onGenerateProposal?: () => void;
  isGenerating?: boolean;
}) {
  const prof = app.professors;
  const [notes, setNotes] = useState(app.notes ?? '');
  const [nextAction, setNextAction] = useState(app.next_action ?? '');
  const [nextActionDate, setNextActionDate] = useState(app.next_action_date ?? '');
  const [outcome, setOutcome] = useState(app.outcome ?? '');
  const [saving, setSaving] = useState(false);
  const [reminderSaving, setReminderSaving] = useState(false);
  const [reminderDone, setReminderDone] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const patch: Record<string, unknown> = { notes };
    if (nextAction) patch.next_action = nextAction;
    if (nextActionDate) patch.next_action_date = nextActionDate;
    if (outcome) patch.outcome = outcome;
    else patch.outcome = null;
    onUpdate(app.id, patch);
    setSaving(false);
    onClose();
  };

  const handleReminder = async () => {
    if (!nextActionDate) return;
    setReminderSaving(true);
    try {
      await fetch('/api/outreach/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailId: app.cold_email_id ?? app.id,
          status: 'sent',
        }),
      });
      setReminderDone(true);
      setTimeout(() => setReminderDone(false), 2000);
    } catch { /* */ }
    setReminderSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0F1419] border border-gray-200 dark:border-white/10 shadow-xl max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-gray-100 dark:border-white/5">
          {prof && (
            <div className={`size-10 rounded-full ${avatarColor(prof.name)} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
              {prof.name[0]}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{prof?.name ?? '未知教授'}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {prof?.position_title ?? ''}{prof?.position_title && prof?.university ? ' · ' : ''}{prof?.university ?? app.university ?? ''}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Quick links */}
          <div className="flex gap-2 flex-wrap">
            {prof && (
              <Link
                href={`/koala/professors/${prof.id}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium no-underline border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
              >
                <ExternalLink size={12} /> 教授详情
              </Link>
            )}
            {app.cold_email_id && (
              <Link
                href="/koala/my-emails"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium no-underline border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
              >
                <Mail size={12} /> 查看套磁信
              </Link>
            )}
            {hasProposal && (
              <Link
                href="/koala/my-documents"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium no-underline border border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/5"
              >
                <FileText size={12} /> 查看研究计划
              </Link>
            )}
          </div>

          {/* Generate research proposal for preparing stage */}
          {app.stage === 'preparing' && !hasProposal && (
            <button
              onClick={onGenerateProposal}
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors border border-amber-200 dark:border-amber-500/20 disabled:opacity-50"
            >
              {isGenerating ? (
                <><Loader2 size={13} className="animate-spin" /> 正在生成研究计划...</>
              ) : (
                <><Sparkles size={13} /> 为此申请生成研究计划</>
              )}
            </button>
          )}

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">备注</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="添加备注..."
              className="w-full px-3 py-2 rounded-lg text-xs border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400 dark:focus:border-blue-500/50 resize-none placeholder:text-gray-400"
            />
          </div>

          {/* Next action */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">下一步</label>
              <input
                value={nextAction}
                onChange={e => setNextAction(e.target.value)}
                placeholder="发follow-up..."
                className="w-full h-9 px-3 rounded-lg text-xs border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400 dark:focus:border-blue-500/50 placeholder:text-gray-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">日期</label>
              <input
                type="date"
                value={nextActionDate}
                onChange={e => setNextActionDate(e.target.value)}
                className="w-full h-9 px-3 rounded-lg text-xs border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400 dark:focus:border-blue-500/50"
              />
            </div>
          </div>

          {/* Set reminder */}
          {nextActionDate && (
            <button
              onClick={handleReminder}
              disabled={reminderSaving || reminderDone}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50"
            >
              {reminderDone ? <><Check size={12} /> 已设提醒</> : <><Bell size={12} /> 设跟进提醒</>}
            </button>
          )}

          {/* Outcome (only for decided stage) */}
          {app.stage === 'decided' && (
            <div>
              <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1.5">结果</label>
              <div className="flex gap-2">
                {(['offer', 'rejected', 'withdrawn'] as const).map(o => (
                  <button
                    key={o}
                    onClick={() => setOutcome(outcome === o ? '' : o)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      outcome === o
                        ? OUTCOME_BADGE[o].cls
                        : 'border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    {OUTCOME_BADGE[o].label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Deadline */}
          {app.deadline && (
            <div className="flex items-center gap-2 text-xs">
              <Clock size={13} className="text-gray-400" />
              <span className="text-gray-500 dark:text-gray-400">
                {app.university} 截止日: {new Date(app.deadline).toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-5 pt-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-lg text-xs font-medium bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10] disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Kanban Card ────────────────────────────────────
function KanbanCard({
  app,
  onDragStart,
  onClick,
  hasProposal,
  onGenerateProposal,
  isGenerating,
}: {
  app: Application;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onClick: () => void;
  hasProposal?: boolean;
  onGenerateProposal?: () => void;
  isGenerating?: boolean;
}) {
  const prof = app.professors;
  const name = prof?.name ?? '未知';
  const dl = app.deadline ? deadlineLabel(app.deadline) : null;

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, app.id)}
      onClick={onClick}
      className="p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] hover:shadow-md dark:hover:border-white/20 cursor-grab active:cursor-grabbing active:shadow-lg transition-shadow mb-2 group"
    >
      <div className="flex items-center gap-2.5 mb-1.5">
        <div className={`size-8 rounded-full ${avatarColor(name)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
          {name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{name}</p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
            {prof?.university ?? app.university ?? ''}
          </p>
        </div>
      </div>

      {prof?.position_title && (
        <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate mb-1">{prof.position_title}</p>
      )}

      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[10px] text-gray-400 dark:text-gray-500">{timeAgo(app.updated_at)}</span>
        <div className="flex items-center gap-1">
          {app.cold_email_id && <Mail size={10} className="text-gray-300 dark:text-gray-600" />}
          {app.next_action && <Bell size={10} className="text-amber-400" />}
        </div>
      </div>

      {/* Outcome badge for decided column */}
      {app.stage === 'decided' && app.outcome && (
        <div className="mt-1.5">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${OUTCOME_BADGE[app.outcome].cls}`}>
            {OUTCOME_BADGE[app.outcome].label}
          </span>
        </div>
      )}

      {/* Deadline */}
      {dl && (
        <div className={`mt-1.5 flex items-center gap-1 text-[10px] ${dl.urgent ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`}>
          <Clock size={10} />
          {dl.text}
        </div>
      )}

      {/* Research proposal for preparing stage */}
      {app.stage === 'preparing' && (
        <div className="mt-2">
          {hasProposal ? (
            <Link
              href="/koala/my-documents"
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium no-underline bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400"
              onClick={e => e.stopPropagation()}
            >
              <Check size={10} /> 已有研究计划
            </Link>
          ) : (
            <button
              onClick={e => { e.stopPropagation(); onGenerateProposal?.(); }}
              disabled={isGenerating}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors disabled:opacity-50"
            >
              {isGenerating ? (
                <><Loader2 size={10} className="animate-spin" /> 生成中...</>
              ) : (
                <><Sparkles size={10} /> 生成研究计划</>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── List Row ───────────────────────────────────────
function ListRow({
  app,
  onClick,
  hasProposal,
}: {
  app: Application;
  onClick: () => void;
  hasProposal?: boolean;
}) {
  const prof = app.professors;
  const name = prof?.name ?? '未知';
  const stageMeta = STAGE_META[app.stage];
  const dl = app.deadline ? deadlineLabel(app.deadline) : null;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors border-b border-gray-100 dark:border-white/5 last:border-b-0"
    >
      <div className={`size-9 rounded-full ${avatarColor(name)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
        {name[0]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{name}</span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 shrink-0">
            {stageMeta.emoji} {stageMeta.label}
          </span>
          {app.stage === 'preparing' && hasProposal && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 shrink-0">
              <FileText size={10} /> 有研究计划
            </span>
          )}
          {app.stage === 'decided' && app.outcome && (
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border shrink-0 ${OUTCOME_BADGE[app.outcome].cls}`}>
              {OUTCOME_BADGE[app.outcome].label}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {prof?.position_title ?? ''}{prof?.position_title ? ' · ' : ''}{prof?.university ?? app.university ?? ''}
        </p>
      </div>
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">{timeAgo(app.updated_at)}</span>
        {dl && (
          <span className={`text-[10px] ${dl.urgent ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`}>
            {dl.text}
          </span>
        )}
      </div>
    </button>
  );
}

// ─── Main Page ──────────────────────────────────────
export default function MyApplicationsPage() {
  const { user, authLoading, showLogin } = useAuth();
  const [apps, setApps] = useState<Application[]>([]);
  const [deadlines, setDeadlines] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'board' | 'list'>('board');
  const [modalApp, setModalApp] = useState<Application | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Research proposal tracking
  const [proposalProfIds, setProposalProfIds] = useState<Set<string>>(new Set());
  const [generatingProposal, setGeneratingProposal] = useState<string | null>(null);

  // Mobile default to list
  useEffect(() => {
    if (window.innerWidth < 768) setView('list');
  }, []);

  const fetchApps = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch('/api/user/applications');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setApps(data.applications ?? []);
    } catch {
      setApps([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchDeadlines = useCallback(async () => {
    try {
      const res = await fetch('/api/user/applications/deadlines');
      if (res.ok) {
        const data = await res.json();
        const map: Record<string, string> = {};
        for (const d of data.deadlines ?? []) {
          if (d.university && d.deadline_date) map[d.university.toLowerCase()] = d.deadline_date;
        }
        setDeadlines(map);
      }
    } catch { /* non-critical */ }
  }, []);

  const fetchProposalProfIds = useCallback(async () => {
    try {
      const res = await fetch('/api/user/research-proposal/list');
      if (!res.ok) return;
      const data = await res.json();
      const ids = new Set<string>();
      for (const doc of data.documents ?? []) {
        if (doc.professor_id) ids.add(doc.professor_id);
      }
      setProposalProfIds(ids);
    } catch { /* non-critical */ }
  }, []);

  const handleGenerateProposal = async (app: Application) => {
    if (!app.professor_id) return;
    setGeneratingProposal(app.id);
    try {
      const res = await fetch('/api/user/research-proposal/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          professor_id: app.professor_id,
          application_id: app.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? '生成失败');
        return;
      }
      setProposalProfIds(prev => new Set([...prev, app.professor_id]));
    } catch {
      alert('网络错误，请重试');
    } finally {
      setGeneratingProposal(null);
    }
  };

  useEffect(() => {
    if (user) {
      fetchApps();
      fetchDeadlines();
      fetchProposalProfIds();
    } else {
      setLoading(false);
    }
  }, [user, fetchApps, fetchDeadlines, fetchProposalProfIds]);

  // Enrich apps with deadlines
  const enrichedApps = apps.map(a => ({
    ...a,
    deadline: a.university ? deadlines[a.university.toLowerCase()] ?? null : null,
  }));

  // ─── Stats ───────────────────────────────
  const total = enrichedApps.length;
  const stageCounts = STAGES.reduce((acc, s) => {
    acc[s] = enrichedApps.filter(a => a.stage === s).length;
    return acc;
  }, {} as Record<Stage, number>);

  const sentOnward = enrichedApps.filter(a => {
    const idx = STAGES.indexOf(a.stage);
    return idx >= STAGES.indexOf('sent');
  }).length;
  const repliedOnward = enrichedApps.filter(a => {
    const idx = STAGES.indexOf(a.stage);
    return idx >= STAGES.indexOf('replied');
  }).length;
  const replyRate = sentOnward > 0 ? Math.round((repliedOnward / sentOnward) * 100) : null;

  // ─── Drag handlers ───────────────────────
  const handleDragStart = (_e: React.DragEvent, id: string) => {
    setDragId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetStage: Stage) => {
    e.preventDefault();
    if (!dragId) return;
    const app = enrichedApps.find(a => a.id === dragId);
    if (!app || app.stage === targetStage) { setDragId(null); return; }

    // Optimistic update
    setApps(prev => prev.map(a => a.id === dragId ? { ...a, stage: targetStage, updated_at: new Date().toISOString() } : a));
    setDragId(null);

    try {
      const res = await fetch(`/api/user/applications/${dragId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: targetStage }),
      });
      if (!res.ok) throw new Error();
    } catch {
      fetchApps();
    }
  };

  // ─── Card update ─────────────────────────
  const handleCardUpdate = async (id: string, patch: Record<string, unknown>) => {
    setApps(prev => prev.map(a => a.id === id ? { ...a, ...patch, updated_at: new Date().toISOString() } : a));
    try {
      const res = await fetch(`/api/user/applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error();
    } catch {
      fetchApps();
    }
  };

  // ─── Not logged in ───────────────────────
  if (!authLoading && !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
        <div className="text-5xl mb-4">📋</div>
        <h1 className="text-lg font-medium mb-2 text-gray-900 dark:text-gray-100">登录后查看申请追踪</h1>
        <p className="text-sm mb-6 text-gray-500 dark:text-gray-400">追踪你的每一封套磁信和申请进度</p>
        <button
          onClick={() => showLogin()}
          className="w-full max-w-xs py-3 rounded-full text-sm font-semibold bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]"
        >
          登录 / 注册
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-light text-gray-900 dark:text-gray-100 tracking-tight">我的申请</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">追踪从收藏到结果的完整流程</p>
        </div>
        {/* View toggle */}
        <div className="flex rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden">
          <button
            onClick={() => setView('board')}
            className={`p-2 transition-colors ${view === 'board' ? 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'}`}
            title="看板"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setView('list')}
            className={`p-2 transition-colors ${view === 'list' ? 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'}`}
            title="列表"
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <div className="min-w-[72px] rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 p-2.5 text-center shrink-0">
            <p className="text-lg font-medium tabular-nums text-gray-900 dark:text-gray-100">{total}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">总申请</p>
          </div>
          {STAGES.map(s => (
            <div key={s} className="min-w-[56px] rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 p-2.5 text-center shrink-0">
              <p className="text-base font-medium tabular-nums text-gray-900 dark:text-gray-100">{stageCounts[s]}</p>
              <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5 whitespace-nowrap">{STAGE_META[s].emoji}</p>
            </div>
          ))}
          <div className="min-w-[72px] rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 p-2.5 text-center shrink-0">
            <p className="text-lg font-medium tabular-nums text-gray-900 dark:text-gray-100">{replyRate !== null ? `${replyRate}%` : '—'}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">回复率</p>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 dark:border-t-blue-400 rounded-full animate-spin" />
        </div>
      ) : total === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center mx-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02]">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">还没有申请记录</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">收藏教授或生成套磁信后，申请会自动出现在这里</p>
          <Link
            href="/koala/professors"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium rounded-full no-underline bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10] min-h-[44px]"
          >
            <FileText size={16} />
            浏览教授库
          </Link>
        </div>
      ) : view === 'board' ? (
        /* ─── Board View ─── */
        <div
          ref={scrollRef}
          className="overflow-x-auto px-4"
          style={{ scrollbarWidth: 'thin' }}
        >
          <div className="flex gap-3" style={{ minWidth: `${STAGES.length * 220}px` }}>
            {STAGES.map(stage => {
              const cards = enrichedApps.filter(a => a.stage === stage);
              const meta = STAGE_META[stage];
              return (
                <div
                  key={stage}
                  className="flex-1 min-w-[200px] max-w-[260px]"
                  onDragOver={handleDragOver}
                  onDrop={e => handleDrop(e, stage)}
                >
                  {/* Column header */}
                  <div className="flex items-center gap-1.5 px-1 mb-2">
                    <span className="text-sm">{meta.emoji}</span>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{meta.label}</span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">{cards.length}</span>
                  </div>
                  {/* Column body */}
                  <div className="rounded-xl bg-gray-50/80 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 p-2 min-h-[120px]">
                    {cards.length === 0 ? (
                      <div className="flex items-center justify-center h-20 text-[10px] text-gray-300 dark:text-gray-600">
                        拖到此处
                      </div>
                    ) : (
                      cards.map(app => (
                        <KanbanCard
                          key={app.id}
                          app={app}
                          onDragStart={handleDragStart}
                          onClick={() => setModalApp(app)}
                          hasProposal={proposalProfIds.has(app.professor_id)}
                          onGenerateProposal={() => handleGenerateProposal(app)}
                          isGenerating={generatingProposal === app.id}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ─── List View ─── */
        <div className="mx-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] overflow-hidden">
          {enrichedApps.map(app => (
            <ListRow
              key={app.id}
              app={app}
              onClick={() => setModalApp(app)}
              hasProposal={proposalProfIds.has(app.professor_id)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {modalApp && (
        <CardModal
          app={{ ...modalApp, deadline: modalApp.university ? deadlines[modalApp.university.toLowerCase()] ?? null : null }}
          onClose={() => setModalApp(null)}
          onUpdate={handleCardUpdate}
          hasProposal={proposalProfIds.has(modalApp.professor_id)}
          onGenerateProposal={() => handleGenerateProposal(modalApp)}
          isGenerating={generatingProposal === modalApp.id}
        />
      )}
    </div>
  );
}
