'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, ExternalLink, ChevronDown, ChevronUp,
  FileText, BookOpen, Mail, MessageSquare, Settings, User,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
}

interface UserProfile {
  id: string;
  display_name: string | null;
  university: string | null;
  major: string | null;
  degree_level: string | null;
  gpa: number | null;
  gpa_scale: string | null;
  target_field: string | null;
  target_universities: string[] | null;
  english_level: string | null;
  has_research_experience: boolean | null;
  research_description: string | null;
  has_publications: boolean | null;
  publication_details: string | null;
  resume_url: string | null;
  transcript_url: string | null;
  file_name: string | null;
  profile_completeness: number;
  plan_type: 'free' | 'starter' | 'pro' | 'elite';
  credits_remaining: number;
  admin_status: string | null;
  created_at: string;
}

interface SavedProfessor {
  id: string;
  created_at: string;
  professor_id: string;
  professors: {
    id: string; name: string; university: string;
    position_title: string | null;
    research_areas: string[];
    h_index: number | null;
  } | null;
}

interface OutreachEmail {
  id: string;
  subject_line: string;
  email_body: string;
  followup_body: string | null;
  status: string;
  purpose: string;
  created_at: string;
  professor_id: string;
  professors: { id: string; name: string; university: string } | null;
}

interface ChatMessage {
  id: string; mode: string; role: string; content: string; created_at: string;
}

interface ChatGroup {
  count: number; lastAt: string; messages: ChatMessage[];
}

interface AdminNote {
  id: string; note: string; admin_id: string; created_at: string;
}

interface UserDetail {
  authUser: AuthUser | null;
  profile: UserProfile | null;
  savedProfessors: SavedProfessor[];
  outreachEmails: OutreachEmail[];
  chatSummary: Record<string, ChatGroup>;
  adminNotes: AdminNote[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PLAN_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  free:    { label: '免费版',  color: '#64748b', bg: '#f1f5f9' },
  starter: { label: 'Starter', color: '#16a34a', bg: '#dcfce7' },
  pro:     { label: 'Pro',     color: '#b45309', bg: '#fef3c7' },
  elite:   { label: 'Elite',   color: '#7c3aed', bg: '#ede9fe' },
};

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  active:     { label: '活跃',   color: '#16a34a', bg: '#dcfce7' },
  follow_up:  { label: '待跟进', color: '#d97706', bg: '#fef3c7' },
  converted:  { label: '已转化', color: '#2563eb', bg: '#dbeafe' },
  churned:    { label: '已流失', color: '#dc2626', bg: '#fee2e2' },
};

const OUTREACH_STATUS: Record<string, { label: string; color: string }> = {
  draft:    { label: '草稿',   color: '#94a3b8' },
  copied:   { label: '已复制', color: '#d97706' },
  sent:     { label: '已发送', color: '#2563eb' },
  replied:  { label: '已回复 🎉', color: '#16a34a' },
  no_reply: { label: '未回复', color: '#dc2626' },
};

const MODE_LABELS: Record<string, string> = {
  path:     '🧭 申请规划',
  research: '🔬 科研助手',
  chat:     '💬 自由聊天',
  write:    '✉️ 写申请信',
};

const TABS = [
  { key: 'overview',  label: '概况',   icon: User },
  { key: 'profile',   label: '背景资料', icon: FileText },
  { key: 'saved',     label: '收藏',   icon: BookOpen },
  { key: 'outreach',  label: '申请信', icon: Mail },
  { key: 'chat',      label: '对话',   icon: MessageSquare },
  { key: 'admin',     label: '管理',   icon: Settings },
] as const;

type TabKey = typeof TABS[number]['key'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('zh-CN');
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <span className="w-32 flex-shrink-0 text-xs text-slate-400">{label}</span>
      <span className="flex-1 text-sm text-slate-800">{value || <span className="text-slate-300">—</span>}</span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('overview');

  // Admin operation state
  const [planEdit, setPlanEdit] = useState('');
  const [creditsEdit, setCreditsEdit] = useState('');
  const [statusEdit, setStatusEdit] = useState('');
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    async function load() {
      const meRes = await fetch('/api/admin/me');
      if (!meRes.ok) { router.replace('/dashboard/koala'); return; }
      const me = await meRes.json();
      if (!me.role) { router.replace('/dashboard/koala'); return; }

      const res = await fetch(`/api/admin/users/${id}`);
      if (!res.ok) { setLoading(false); return; }
      const d: UserDetail = await res.json();
      setData(d);
      setPlanEdit(d.profile?.plan_type ?? 'free');
      setCreditsEdit(String(d.profile?.credits_remaining ?? 0));
      setStatusEdit(d.profile?.admin_status ?? '');
      setLoading(false);
    }
    load();
  }, [id, router]);

  async function saveProfile() {
    setSaving(true);
    setSaveMsg('');
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_profile',
        plan_type: planEdit,
        credits_remaining: parseInt(creditsEdit) || 0,
        admin_status: statusEdit || null,
      }),
    });
    const d = await res.json();
    setSaveMsg(d.success ? '✅ 已保存' : `❌ ${d.error ?? '保存失败'}`);
    if (d.success && data?.profile) {
      setData(prev => prev ? {
        ...prev,
        profile: {
          ...prev.profile!,
          plan_type: planEdit as UserProfile['plan_type'],
          credits_remaining: parseInt(creditsEdit) || 0,
          admin_status: statusEdit || null,
        },
      } : prev);
    }
    setSaving(false);
  }

  async function addNote() {
    if (!noteText.trim()) return;
    setSaving(true);
    setSaveMsg('');
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_note', note: noteText }),
    });
    const d = await res.json();
    if (d.success) {
      setSaveMsg('✅ 备注已添加');
      setNoteText('');
      // Re-fetch notes
      fetch(`/api/admin/users/${id}`)
        .then(r => r.json())
        .then((fresh: UserDetail) => setData(prev => prev ? { ...prev, adminNotes: fresh.adminNotes } : prev));
    } else {
      setSaveMsg(d.hint ?? `❌ ${d.error ?? '添加失败'}`);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400 text-sm">加载中…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <p className="text-red-500 text-sm">用户不存在或加载失败</p>
        <Link href="/dashboard/koala/users" className="text-sm text-emerald-600 mt-2 inline-block">← 返回列表</Link>
      </div>
    );
  }

  const { authUser, profile, savedProfessors, outreachEmails, chatSummary, adminNotes } = data;
  const plan = PLAN_LABELS[profile?.plan_type ?? 'free'];
  const statusBadge = profile?.admin_status ? STATUS_LABELS[profile.admin_status] : null;
  const totalChats = Object.values(chatSummary).reduce((s, g) => s + g.count, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard/koala/users"
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="size-4 text-slate-600" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-slate-900 truncate">{authUser?.email ?? id}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: plan.bg, color: plan.color }}>
              {plan.label}
            </span>
            {statusBadge && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: statusBadge.bg, color: statusBadge.color }}>
                {statusBadge.label}
              </span>
            )}
            {authUser?.email_confirmed_at ? (
              <span className="text-xs text-emerald-600">✓ 邮箱已验证</span>
            ) : (
              <span className="text-xs text-amber-500">⚠ 邮箱未验证</span>
            )}
          </div>
        </div>
      </div>

      {/* Quick stats strip */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: '积分余额', value: profile?.credits_remaining ?? 0 },
          { label: '收藏教授', value: savedProfessors.length },
          { label: '申请信', value: outreachEmails.length },
          { label: '对话消息', value: totalChats },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-3 text-center">
            <div className="text-2xl font-bold text-slate-800">{s.value}</div>
            <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-slate-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0"
              style={active
                ? { background: '#fff', color: '#0f172a', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                : { color: '#64748b' }}
            >
              <Icon className="size-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab: 概况 ── */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Auth info */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">账户信息</h2>
            <InfoRow label="邮箱" value={authUser?.email} />
            <InfoRow label="注册时间" value={fmt(authUser?.created_at ?? null)} />
            <InfoRow label="最后登录" value={fmt(authUser?.last_sign_in_at ?? null)} />
            <InfoRow label="邮箱验证" value={authUser?.email_confirmed_at ? `✓ ${fmtDate(authUser.email_confirmed_at)}` : '❌ 未验证'} />
            <InfoRow label="套餐" value={plan.label} />
            <InfoRow label="积分余额" value={`${profile?.credits_remaining ?? 0} 积分`} />
          </div>

          {/* Profile completeness */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">资料完整度</h2>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative size-20 flex-shrink-0">
                <svg viewBox="0 0 36 36" className="size-20 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" stroke="#e2e8f0" strokeWidth="3" fill="none" />
                  <circle
                    cx="18" cy="18" r="15.9"
                    stroke={profile?.profile_completeness ?? 0 >= 80 ? '#16a34a' : profile?.profile_completeness ?? 0 >= 50 ? '#d97706' : '#ef4444'}
                    strokeWidth="3" fill="none"
                    strokeDasharray={`${profile?.profile_completeness ?? 0} 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-base font-bold text-slate-800">{profile?.profile_completeness ?? 0}%</span>
                </div>
              </div>
              <div className="flex-1 space-y-1.5">
                {[
                  { label: '姓名', v: profile?.display_name },
                  { label: '学校', v: profile?.university },
                  { label: '专业', v: profile?.major },
                  { label: 'GPA', v: profile?.gpa },
                  { label: '目标方向', v: profile?.target_field },
                  { label: '英语水平', v: profile?.english_level },
                ].map(f => (
                  <div key={f.label} className="flex items-center gap-2 text-xs">
                    <span className={`size-2 rounded-full flex-shrink-0 ${f.v ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                    <span className="text-slate-500 w-16">{f.label}</span>
                    <span className={f.v ? 'text-slate-700' : 'text-slate-300'}>
                      {f.v ? '已填写' : '未填写'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Uploaded files */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">上传的文件</h2>
            {profile?.resume_url ? (
              <a
                href={profile.resume_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors text-sm text-emerald-600 no-underline mb-2"
              >
                <FileText className="size-4 flex-shrink-0" />
                <span className="flex-1 truncate">简历 / CV</span>
                <ExternalLink className="size-3" />
              </a>
            ) : (
              <p className="text-sm text-slate-300 mb-2">未上传简历</p>
            )}
            {profile?.transcript_url ? (
              <a
                href={profile.transcript_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors text-sm text-emerald-600 no-underline"
              >
                <FileText className="size-4 flex-shrink-0" />
                <span className="flex-1 truncate">成绩单 / Transcript</span>
                <ExternalLink className="size-3" />
              </a>
            ) : (
              <p className="text-sm text-slate-300">未上传成绩单</p>
            )}
            {(profile as unknown as Record<string, string>)?.file_name && (
              <p className="text-xs text-slate-400 mt-2">文件名：{(profile as unknown as Record<string, string>).file_name}</p>
            )}
          </div>

          {/* Activity summary */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">活跃概况</h2>
            <div className="space-y-2">
              {Object.entries(chatSummary).map(([mode, g]) => (
                <div key={mode} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{MODE_LABELS[mode] ?? mode}</span>
                  <span className="text-slate-400 text-xs">{g.count} 条消息 · 最后活跃 {fmtDate(g.lastAt)}</span>
                </div>
              ))}
              {Object.keys(chatSummary).length === 0 && (
                <p className="text-sm text-slate-300">暂无对话记录</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: 背景资料 ── */}
      {tab === 'profile' && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">用户填写的背景信息</h2>
          <InfoRow label="姓名" value={profile?.display_name} />
          <InfoRow label="就读学校" value={profile?.university} />
          <InfoRow label="专业" value={profile?.major} />
          <InfoRow label="学历层次" value={profile?.degree_level} />
          <InfoRow label="GPA" value={profile?.gpa ? `${profile.gpa} / ${profile.gpa_scale ?? '?'}` : null} />
          <InfoRow label="目标研究方向" value={profile?.target_field} />
          <InfoRow label="目标学校" value={(profile?.target_universities ?? []).join(', ') || null} />
          <InfoRow label="英语水平" value={profile?.english_level} />
          <InfoRow
            label="科研经历"
            value={profile?.has_research_experience
              ? (profile.research_description || '有（未描述）')
              : '无'}
          />
          <InfoRow
            label="论文发表"
            value={profile?.has_publications
              ? (profile.publication_details || '有（未描述）')
              : '无'}
          />
          <InfoRow label="注册时间" value={fmtDate(profile?.created_at ?? null)} />
        </div>
      )}

      {/* ── Tab: 收藏的教授 ── */}
      {tab === 'saved' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">收藏的教授 ({savedProfessors.length})</h2>
          </div>
          {savedProfessors.length === 0 ? (
            <p className="p-4 text-sm text-slate-300">暂无收藏</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {savedProfessors.map(entry => {
                const p = entry.professors;
                if (!p) return null;
                return (
                  <div key={entry.id} className="px-4 py-3 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-800">{p.name}</span>
                        {p.h_index && (
                          <span className="text-xs text-slate-400">H={p.h_index}</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{p.university}{p.position_title ? ` · ${p.position_title}` : ''}</p>
                      {p.research_areas.length > 0 && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate">
                          {p.research_areas.slice(0, 3).join(' · ')}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-slate-400">{fmtDate(entry.created_at)}</p>
                      <Link
                        href={`/koala/professors/${p.id}`}
                        target="_blank"
                        className="text-xs text-emerald-600 flex items-center gap-1 mt-1 no-underline justify-end"
                      >
                        详情 <ExternalLink className="size-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: 申请信 ── */}
      {tab === 'outreach' && (
        <div className="space-y-3">
          {outreachEmails.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-sm text-slate-300">暂无申请信记录</p>
            </div>
          ) : (
            outreachEmails.map(email => <OutreachCard key={email.id} email={email} />)
          )}
        </div>
      )}

      {/* ── Tab: 对话记录 ── */}
      {tab === 'chat' && (
        <div className="space-y-4">
          {Object.entries(chatSummary).length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-sm text-slate-300">暂无对话记录</p>
            </div>
          ) : (
            Object.entries(chatSummary).map(([mode, group]) => (
              <ChatGroupCard key={mode} mode={mode} group={group} />
            ))
          )}
        </div>
      )}

      {/* ── Tab: 管理操作 ── */}
      {tab === 'admin' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Plan & credits */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">修改套餐 & 积分</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">套餐类型</label>
                <select
                  value={planEdit}
                  onChange={e => setPlanEdit(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="free">免费版 (free)</option>
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="elite">Elite</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">积分余额</label>
                <input
                  type="number" min="0" value={creditsEdit}
                  onChange={e => setCreditsEdit(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">用户状态</label>
                <select
                  value={statusEdit}
                  onChange={e => setStatusEdit(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">— 未标记 —</option>
                  <option value="active">活跃</option>
                  <option value="follow_up">待跟进</option>
                  <option value="converted">已转化</option>
                  <option value="churned">已流失</option>
                </select>
              </div>
              <button
                onClick={saveProfile}
                disabled={saving}
                className="w-full py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {saving ? '保存中…' : '保存修改'}
              </button>
              {saveMsg && <p className="text-xs text-center mt-1" style={{ color: saveMsg.startsWith('✅') ? '#16a34a' : '#dc2626' }}>{saveMsg}</p>}
            </div>
          </div>

          {/* Admin notes */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">管理员备注</h2>
            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
              {adminNotes.length === 0 ? (
                <p className="text-xs text-slate-300">暂无备注</p>
              ) : (
                adminNotes.map(n => (
                  <div key={n.id} className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700">
                    <p className="leading-relaxed">{n.note}</p>
                    <p className="text-xs text-slate-400 mt-1">{fmt(n.created_at)}</p>
                  </div>
                ))
              )}
            </div>
            <textarea
              rows={3}
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="添加备注…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 resize-none focus:outline-none focus:border-emerald-500 mb-2"
            />
            <button
              onClick={addNote}
              disabled={saving || !noteText.trim()}
              className="w-full py-2 rounded-lg text-sm font-medium bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-40 transition-colors"
            >
              添加备注
            </button>
            <p className="text-[11px] text-slate-400 mt-2">
              提示：备注功能需先运行 <code className="bg-slate-100 px-1 rounded">supabase/admin_notes.sql</code>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Outreach card ────────────────────────────────────────────────────────────

function OutreachCard({ email }: { email: OutreachEmail }) {
  const [open, setOpen] = useState(false);
  const st = OUTREACH_STATUS[email.status] ?? { label: email.status, color: '#94a3b8' };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-slate-800 truncate">
              {email.professors?.name ?? '未知教授'} — {email.professors?.university}
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: `${st.color}1a`, color: st.color }}>
              {st.label}
            </span>
            <span className="text-xs text-slate-400 flex-shrink-0">{email.purpose}</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 truncate">{email.subject_line}</p>
          <p className="text-xs text-slate-400 mt-0.5">{fmt(email.created_at)}</p>
        </div>
        {open ? <ChevronUp className="size-4 text-slate-400 flex-shrink-0 mt-0.5" /> : <ChevronDown className="size-4 text-slate-400 flex-shrink-0 mt-0.5" />}
      </button>

      {open && (
        <div className="border-t border-slate-100 px-4 py-3 space-y-3">
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1">邮件正文</p>
            <pre className="text-xs text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-lg p-3 leading-relaxed max-h-64 overflow-y-auto">
              {email.email_body}
            </pre>
          </div>
          {email.followup_body && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">跟进邮件</p>
              <pre className="text-xs text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-lg p-3 leading-relaxed max-h-40 overflow-y-auto">
                {email.followup_body}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Chat group card ──────────────────────────────────────────────────────────

function ChatGroupCard({ mode, group }: { mode: string; group: ChatGroup }) {
  const [open, setOpen] = useState(false);
  const userMsgs = group.messages.filter(m => m.role === 'user');
  const asstMsgs = group.messages.filter(m => m.role === 'assistant');

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-800">{MODE_LABELS[mode] ?? mode}</span>
            <span className="text-xs text-slate-400">{group.count} 条消息</span>
            <span className="text-xs text-slate-400">（用户 {userMsgs.length} · AI {asstMsgs.length}）</span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">最后活跃：{fmt(group.lastAt)}</p>
        </div>
        {open ? <ChevronUp className="size-4 text-slate-400" /> : <ChevronDown className="size-4 text-slate-400" />}
      </button>

      {open && (
        <div className="border-t border-slate-100 px-4 py-3 max-h-96 overflow-y-auto space-y-2">
          {[...group.messages].reverse().map(msg => (
            <div
              key={msg.id}
              className={`rounded-lg p-2.5 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-slate-100 text-slate-700 ml-4'
                  : 'bg-emerald-50 text-slate-700 mr-4'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="font-semibold" style={{ color: msg.role === 'user' ? '#475569' : '#16a34a' }}>
                  {msg.role === 'user' ? '用户' : 'AI'}
                </span>
                <span className="text-slate-400">{fmt(msg.created_at)}</span>
              </div>
              <p className="whitespace-pre-wrap line-clamp-6">{msg.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
