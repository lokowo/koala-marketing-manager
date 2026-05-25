'use client';

import { useState, useEffect, useCallback } from 'react';
import { Heart, Send, Inbox, Sparkles, Trash2, ExternalLink, Pen } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../components/AuthContext';
import { OlaEmpty } from '../components/ola/OlaEmpty';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfessorInfo {
  id: string;
  name: string;
  university: string;
  faculty: string | null;
  position_title: string | null;
  research_areas: string[];
  h_index: number | null;
  opportunity_score: number | null;
  accepting_students: string | null;
  grant_status: string | null;
}

interface SavedEntry {
  id: string;
  professor_id: string;
  notes: string | null;
  created_at: string;
  professors: ProfessorInfo | null;
}

interface OutreachEmail {
  id: string;
  subject_line: string;
  tone: string | null;
  purpose: string | null;
  status: 'draft' | 'copied' | 'sent' | 'replied' | 'no_reply' | null;
  credits_used: number | null;
  was_free: boolean | null;
  sent_at: string | null;
  created_at: string;
  professors: { id: string; name: string; university: string } | null;
}

type TabId = 'saved' | 'sent' | 'mutual' | 'olive';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const UNI_COLORS: Record<string, string> = {
  'University of Melbourne': '#002147',
  'University of Sydney': '#E64626',
  'UNSW': '#FFD100',
  'University of New South Wales': '#FFD100',
  'Australian National University': '#BE830E',
  'ANU': '#BE830E',
  'University of Queensland': '#51247A',
  'UQ': '#51247A',
  'Monash University': '#006DAE',
  'Monash': '#006DAE',
};

function uniColor(name: string): string {
  for (const [key, color] of Object.entries(UNI_COLORS)) {
    if (name?.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return '#2a3a4a';
}

function uniInitials(name: string): string {
  if (!name) return '?';
  const words = name.replace(/university of /i, '').replace(/the /i, '').split(' ');
  return words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

const STATUS_LABELS: Record<string, { label: string; twBg: string; twText: string }> = {
  draft:    { label: '草稿',   twBg: 'bg-white/5 dark:bg-white/5',           twText: 'text-gray-500 dark:text-[#8a9a9e]' },
  copied:   { label: '已复制', twBg: 'bg-amber-50 dark:bg-[#D4A843]/10',     twText: 'text-amber-700 dark:text-[#D4A843]' },
  sent:     { label: '已发送', twBg: 'bg-green-500/10',                      twText: 'text-green-600 dark:text-[#5aa064]' },
  replied:  { label: '已回复', twBg: 'bg-blue-400/10',                       twText: 'text-blue-600 dark:text-[#5aa0c8]' },
  no_reply: { label: '未回复', twBg: 'bg-red-500/10',                        twText: 'text-red-600 dark:text-[#b4503c]' },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SavedProfessorCard({ entry, onDelete }: { entry: SavedEntry; onDelete: (professorId: string) => void }) {
  const prof = entry.professors;
  const [deleting, setDeleting] = useState(false);

  if (!prof) return null;

  const bg = uniColor(prof.university);
  const profId = prof.id;

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      await fetch(`/api/user/saved-professors?professor_id=${profId}`, { method: 'DELETE' });
      onDelete(profId);
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div className="rounded-2xl overflow-hidden bg-white dark:bg-[#0F1419] border border-gray-200 dark:border-white/10">
      {/* University color bar */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <div
          className="size-10 rounded-xl flex-shrink-0 flex items-center justify-center text-sm font-bold text-white"
          style={{ background: bg }}
        >
          {uniInitials(prof.university)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold leading-snug truncate text-gray-900 dark:text-[#e8e4dc]">
            {prof.name}
          </div>
          <div className="text-[11px] truncate mt-0.5 text-gray-500 dark:text-[#8a9a9e]">
            {prof.position_title ? `${prof.position_title} · ` : ''}{prof.university}
          </div>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex-shrink-0 size-7 rounded-lg flex items-center justify-center transition-opacity bg-red-500/10"
          style={{ opacity: deleting ? 0.4 : 1 }}
          title="取消收藏"
        >
          <Trash2 className="size-3.5 text-red-600 dark:text-[#b4503c]" />
        </button>
      </div>

      {/* Research tags */}
      {prof.research_areas?.length > 0 && (
        <div className="flex flex-wrap gap-1 px-4 pb-2">
          {prof.research_areas.slice(0, 4).map(tag => (
            <span
              key={tag}
              className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-[#D4A843]/10 text-amber-700 dark:text-[#D4A843]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-3 px-4 pb-3 text-[11px] text-gray-500 dark:text-[#6a7a7e]">
        {prof.h_index != null && <span>H指数 {prof.h_index}</span>}
        {prof.accepting_students === 'yes' && (
          <span className="px-1.5 py-0.5 rounded-md bg-green-500/10 text-green-600 dark:text-[#5aa064]">
            招生中
          </span>
        )}
        <span className="ml-auto">收藏于 {formatDate(entry.created_at)}</span>
      </div>

      {/* CTAs */}
      <div className="flex gap-2 px-4 pb-4">
        <Link
          href={`/koala/professors/${prof.id}`}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium no-underline bg-white/5 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-[#c8d0d4]"
        >
          <ExternalLink className="size-3" /> 查看档案
        </Link>
        <Link
          href={`/koala/chat?action=outreach&prof=${prof.id}&name=${encodeURIComponent(prof.name)}`}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold no-underline bg-amber-50 dark:bg-[#D4A843]/10 text-amber-700 dark:text-[#D4A843] border border-amber-200 dark:border-[#D4A843]/25"
        >
          <Pen className="size-3" /> 写申请信
        </Link>
      </div>
    </div>
  );
}

function OutreachEmailCard({ email }: { email: OutreachEmail }) {
  const prof = email.professors;
  const statusCfg = STATUS_LABELS[email.status ?? 'draft'] ?? STATUS_LABELS.draft;

  return (
    <div className="rounded-2xl px-4 py-3.5 bg-white dark:bg-[#0F1419] border border-gray-200 dark:border-white/10">
      <div className="flex items-start gap-3">
        {prof && (
          <div
            className="size-9 rounded-xl flex-shrink-0 flex items-center justify-center text-xs font-bold text-white mt-0.5"
            style={{ background: uniColor(prof.university) }}
          >
            {uniInitials(prof.university)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900 dark:text-[#e8e4dc]">
              {prof?.name ?? '未知教授'}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusCfg.twBg} ${statusCfg.twText}`}>
              {statusCfg.label}
            </span>
          </div>
          <div className="text-[11px] mt-0.5 truncate text-gray-500 dark:text-[#8a9a9e]">
            {prof?.university}
          </div>
          <div className="text-xs mt-1.5 leading-snug line-clamp-2 text-gray-700 dark:text-[#c8c0b0]">
            {email.subject_line || '（无主题）'}
          </div>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-500 dark:text-[#6a7a7e]">
            {email.purpose && <span>{email.purpose}</span>}
            {email.tone && <span>· {email.tone}</span>}
            <span className="ml-auto">{formatDate(email.created_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}


function LoginPrompt({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-6">
      <span className="text-5xl mb-4">🐨</span>
      <p className="text-sm font-semibold mb-1 text-gray-900 dark:text-[#e8e4dc]">登录后查看你的匹配</p>
      <p className="text-xs mb-4 text-gray-500 dark:text-[#6a7a7e]">
        登录后解锁完整功能：智能匹配导师、生成学术CV、一键发送套磁信
      </p>
      <button
        onClick={onLogin}
        className="px-6 py-2.5 rounded-2xl text-sm font-semibold bg-amber-50 dark:bg-[#D4A843]/10 text-amber-700 dark:text-[#D4A843] border border-amber-200 dark:border-[#D4A843]/30"
      >
        登录 / 注册
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MatchesPage() {
  const { user, showLogin } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('saved');
  const [saved, setSaved] = useState<SavedEntry[]>([]);
  const [emails, setEmails] = useState<OutreachEmail[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [savedLoaded, setSavedLoaded] = useState(false);
  const [emailsLoaded, setEmailsLoaded] = useState(false);

  const loadSaved = useCallback(async () => {
    if (savedLoaded || loadingSaved) return;
    setLoadingSaved(true);
    try {
      const res = await fetch('/api/user/saved-professors');
      if (res.ok) {
        const { saved: data } = await res.json();
        setSaved(data ?? []);
      }
    } catch {}
    setLoadingSaved(false);
    setSavedLoaded(true);
  }, [savedLoaded, loadingSaved]);

  const loadEmails = useCallback(async () => {
    if (emailsLoaded || loadingEmails) return;
    setLoadingEmails(true);
    try {
      const res = await fetch('/api/user/outreach-history');
      if (res.ok) {
        const { emails: data } = await res.json();
        setEmails(data ?? []);
      }
    } catch {}
    setLoadingEmails(false);
    setEmailsLoaded(true);
  }, [emailsLoaded, loadingEmails]);

  useEffect(() => {
    if (!user) return;
    if (activeTab === 'saved') loadSaved();
    if (activeTab === 'sent') loadEmails();
  }, [user, activeTab, loadSaved, loadEmails]);

  function handleDelete(professorId: string) {
    setSaved(prev => prev.filter(e => e.professor_id !== professorId));
  }

  const TABS: { id: TabId; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'saved', label: '已收藏', icon: Heart, count: savedLoaded ? saved.length : undefined },
    { id: 'sent', label: '已发送', icon: Send, count: emailsLoaded ? emails.length : undefined },
    { id: 'mutual', label: '互相感兴趣', icon: Sparkles },
    { id: 'olive', label: '橄榄枝', icon: Inbox },
  ];

  return (
    <div className="min-h-screen pb-24 bg-gray-50 dark:bg-[#080c10]">
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <h1 className="text-lg font-bold text-gray-900 dark:text-[#e8e4dc]">我的匹配</h1>
        <p className="text-[11px] mt-0.5 text-gray-500 dark:text-[#6a7a7e]">收藏和申请记录</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1.5 px-4 mb-5 overflow-x-auto scrollbar-none">
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'flex items-center gap-1.5 px-3 py-2 rounded-full text-xs whitespace-nowrap flex-shrink-0 transition-colors border',
                active
                  ? 'bg-amber-50 dark:bg-[#D4A843]/10 text-amber-700 dark:text-[#D4A843] border-amber-200 dark:border-[#D4A843]/30'
                  : 'bg-white dark:bg-white/5 text-gray-500 dark:text-[#6a7a7e] border-gray-200 dark:border-white/10',
              ].join(' ')}
            >
              <Icon className="size-3.5" />
              {tab.label}
              {tab.count != null && tab.count > 0 && (
                <span
                  className={[
                    'ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold leading-none',
                    active
                      ? 'bg-amber-100 dark:bg-[#D4A843]/25 text-amber-700 dark:text-[#D4A843]'
                      : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-[#8a9a9e]',
                  ].join(' ')}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="px-4">

        {/* ── 已收藏 ── */}
        {activeTab === 'saved' && (
          <>
            {!user ? (
              <LoginPrompt onLogin={showLogin} />
            ) : loadingSaved ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="rounded-2xl h-36 animate-pulse bg-gray-100 dark:bg-[#0F1419]" />
                ))}
              </div>
            ) : saved.length === 0 ? (
              <OlaEmpty
                message={"还没有收藏的教授\n在「发现」页右滑或点击收藏按钮，教授会出现在这里"}
                actionLabel="去发现"
                actionHref="/koala/discover"
              />
            ) : (
              <div className="space-y-3">
                {saved.map(entry => (
                  <SavedProfessorCard key={entry.id} entry={entry} onDelete={handleDelete} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── 已发送 ── */}
        {activeTab === 'sent' && (
          <>
            {!user ? (
              <LoginPrompt onLogin={showLogin} />
            ) : loadingEmails ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="rounded-2xl h-24 animate-pulse bg-gray-100 dark:bg-[#0F1419]" />
                ))}
              </div>
            ) : emails.length === 0 ? (
              <OlaEmpty
                message={"还没有生成申请信\n在「写申请信」模式生成后，记录会出现在这里"}
                actionLabel="去写申请信"
                actionHref="/koala/chat"
              />
            ) : (
              <div className="space-y-3">
                {emails.map(email => (
                  <OutreachEmailCard key={email.id} email={email} />
                ))}
                <p className="text-center text-[11px] pt-2 pb-4 text-gray-400 dark:text-[#4a5a5e]">
                  显示最近 {emails.length} 条记录
                </p>
              </div>
            )}
          </>
        )}

        {/* ── 互相感兴趣 ── */}
        {activeTab === 'mutual' && (
          <OlaEmpty message={"功能开发中\n当教授也对你感兴趣时会出现在这里，敬请期待"} />
        )}

        {/* ── 橄榄枝 ── */}
        {activeTab === 'olive' && (
          <OlaEmpty message={"功能开发中\n教授发给你的橄榄枝会出现在这里，敬请期待"} />
        )}

      </div>
    </div>
  );
}
