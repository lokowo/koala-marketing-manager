'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '../components/AuthContext';
import { Copy, Mail, ChevronDown, ChevronUp, Check, MessageSquare } from 'lucide-react';
import { MobilePageHeader } from '../components/MobilePageHeader';

interface MatchScore {
  dimension: string;
  score: number;
  reason: string;
}

interface ColdEmail {
  id: string;
  professor_id: string;
  professor_name: string;
  professor_university: string;
  subject: string;
  body: string;
  highlights: { text: string; type: 'student' | 'professor' }[];
  match_scores: MatchScore[];
  status: string;
  sent_at: string | null;
  reply_received_at: string | null;
  notes: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  draft:     { label: '草稿',   bg: 'bg-gray-100 dark:bg-gray-500/10',   text: 'text-gray-600 dark:text-gray-400' },
  sent:      { label: '已发送', bg: 'bg-blue-50 dark:bg-blue-500/10',    text: 'text-blue-600 dark:text-blue-400' },
  replied:   { label: '收到回复', bg: 'bg-green-50 dark:bg-green-500/10', text: 'text-green-600 dark:text-green-400' },
  no_reply:  { label: '未回复', bg: 'bg-amber-50 dark:bg-amber-500/10',  text: 'text-amber-600 dark:text-amber-400' },
  interview: { label: '获得面试', bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400' },
};

const STATUS_OPTIONS = [
  { value: 'sent', label: '已发送' },
  { value: 'replied', label: '收到回复' },
  { value: 'no_reply', label: '未回复' },
  { value: 'interview', label: '获得面试' },
];

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return `${diffDays}天前`;
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

function getScoreValue(scores: MatchScore[], dimension: string): number {
  return scores?.find(s => s.dimension === dimension)?.score ?? 0;
}

function scoreColorClass(score: number): string {
  if (score >= 80) return 'text-green-600 dark:text-green-400';
  if (score >= 60) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-500 dark:text-red-400';
}

function EmailRow({ email, onStatusChange }: { email: ColdEmail; onStatusChange: (id: string, status: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(`Subject: ${email.subject}\n\n${email.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMailto = () => {
    const params = new URLSearchParams({ subject: email.subject, body: email.body });
    window.open(`mailto:?${params.toString()}`);
  };

  const scores = email.match_scores ?? [];
  const overall = scores.length > 0
    ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)
    : 0;

  return (
    <div className="border-b border-gray-100 dark:border-white/5 last:border-b-0">
      {/* Row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {email.professor_name}
            </span>
            <StatusBadge status={email.status} />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {email.professor_university}
          </p>
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums whitespace-nowrap shrink-0">
          {formatDate(email.created_at)}
        </span>
        {expanded
          ? <ChevronUp size={16} className="text-gray-400 dark:text-gray-500 shrink-0" />
          : <ChevronDown size={16} className="text-gray-400 dark:text-gray-500 shrink-0" />
        }
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 animate-in fade-in duration-150">
          {/* Match scores */}
          {scores.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {[
                { dim: 'research_alignment', label: 'Research' },
                { dim: 'background_fit', label: 'Background' },
                { dim: 'research_readiness', label: 'Readiness' },
                { dim: 'opportunity', label: 'Opportunity' },
              ].map(({ dim, label }) => {
                const score = getScoreValue(scores, dim);
                return (
                  <div key={dim} className="flex-1 min-w-[72px] rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] px-2 py-1.5 text-center">
                    <p className={`text-base font-medium tabular-nums ${scoreColorClass(score)}`}>{score}%</p>
                    <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5">{label}</p>
                  </div>
                );
              })}
              <div className="flex-1 min-w-[72px] rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] px-2 py-1.5 text-center">
                <p className={`text-base font-medium tabular-nums ${scoreColorClass(overall)}`}>{overall}%</p>
                <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5">Overall</p>
              </div>
            </div>
          )}

          {/* Subject */}
          <div>
            <span className="text-[10px] uppercase tracking-wider font-medium text-gray-400 dark:text-gray-500">Subject</span>
            <p className="text-sm text-gray-900 dark:text-gray-100 mt-0.5">{email.subject}</p>
          </div>

          {/* Body */}
          <div>
            <span className="text-[10px] uppercase tracking-wider font-medium text-gray-400 dark:text-gray-500">Body</span>
            <div className="mt-1 text-sm leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-white/[0.03] rounded-lg p-3 border border-gray-100 dark:border-white/5 max-h-60 overflow-y-auto">
              {email.body}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
            >
              {copied ? <><Check size={13} /> 已复制</> : <><Copy size={13} /> 复制</>}
            </button>
            <button
              onClick={handleMailto}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
            >
              <Mail size={13} /> 邮件打开
            </button>

            {/* Status dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
              >
                标记状态 <ChevronDown size={12} />
              </button>
              {showDropdown && (
                <div className="absolute bottom-full left-0 mb-1 w-32 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1a2e] shadow-lg z-10 py-1">
                  {STATUS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        onStatusChange(email.id, opt.value);
                        setShowDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-white/10 transition-colors ${email.status === opt.value ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MyEmailsPage() {
  const { user, authLoading, showLogin } = useAuth();
  const [emails, setEmails] = useState<ColdEmail[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEmails = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch('/api/user/cold-emails');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEmails(data.emails ?? []);
    } catch {
      setEmails([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchEmails();
    else setLoading(false);
  }, [user, fetchEmails]);

  const handleStatusChange = async (id: string, status: string) => {
    // Optimistic update
    setEmails(prev => prev.map(e => e.id === id ? { ...e, status } : e));
    try {
      const res = await fetch('/api/user/cold-emails', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error();
    } catch {
      fetchEmails();
    }
  };

  // Stats
  const total = emails.length;
  const sent = emails.filter(e => e.status !== 'draft').length;
  const replied = emails.filter(e => e.status === 'replied' || e.status === 'interview').length;
  const replyRate = sent > 0 ? Math.round((replied / sent) * 100) : null;

  // Not logged in
  if (!authLoading && !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
        <div className="text-5xl mb-4">✉️</div>
        <h1 className="text-lg font-medium mb-2 text-gray-900 dark:text-gray-100">登录后查看套磁信</h1>
        <p className="text-sm mb-6 text-gray-500 dark:text-gray-400">
          登录后可以管理你的所有套磁信
        </p>
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
      <MobilePageHeader title="我的套磁信" />
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-light text-gray-900 dark:text-gray-100 tracking-tight hidden lg:block">我的套磁信</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">管理你生成的所有申请信</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-2 px-4 mb-4">
        {[
          { label: '总生成', value: total },
          { label: '已发送', value: sent },
          { label: '收到回复', value: replied },
          { label: '回复率', value: replyRate !== null ? `${replyRate}%` : '—' },
        ].map(stat => (
          <div key={stat.label} className="rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 p-3 text-center">
            <p className="text-lg font-medium tabular-nums text-gray-900 dark:text-gray-100">{stat.value}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Email list */}
      <div className="mx-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 dark:border-t-blue-400 rounded-full animate-spin" />
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="text-4xl mb-3">📮</div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">还没有套磁信</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">去和 Ola 聊聊，生成你的第一封套磁信吧</p>
            <Link
              href="/koala/chat"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium rounded-full no-underline bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10] min-h-[44px]"
            >
              <MessageSquare size={16} />
              和 Ola 聊天
            </Link>
          </div>
        ) : (
          emails.map(email => (
            <EmailRow key={email.id} email={email} onStatusChange={handleStatusChange} />
          ))
        )}
      </div>
    </div>
  );
}
