'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, type UserProfile } from '../components/AuthContext';
import { supabase } from '../../lib/supabase/client';
import { shareToWechat } from '../../lib/share';
import { useTheme } from '../../lib/theme';
import VoiceInputButton from '../../components/VoiceInputButton';
import { SharePosterTrigger } from '../components/SharePoster';
import { OlaAchievements } from '../components/ola/OlaAchievements';
import { MobilePageHeader } from '../components/MobilePageHeader';

// ─── timeAgo helper ────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return new Date(dateStr).toLocaleDateString('zh-CN');
}

const MODE_LABELS: Record<string, { emoji: string; label: string }> = {
  path: { emoji: '🧭', label: '选校规划' },
  research: { emoji: '🔬', label: '学术研究' },
  chat: { emoji: '💬', label: '自由聊天' },
  write: { emoji: '✍️', label: '文书撰写' },
};

const DEGREE_OPTIONS = ['高中', '大专', '本科', '硕士', '博士', '博士后', '其他'];

// ─── Interfaces ─────────────────────────────
interface EducationEntry {
  id: string;
  school: string;
  major: string | null;
  degree: string | null;
  gpa: number | null;
  gpa_scale: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
  created_at: string;
}

interface WorkEntry {
  id: string;
  company: string;
  position: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
  created_at: string;
}

interface DocumentEntry {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string | null;
  parse_status: 'pending' | 'parsing' | 'done' | 'failed';
  parsed_data: object | null;
  parse_error: string | null;
  created_at: string;
}

interface ConversationEntry {
  id: string;
  mode: string;
  created_at: string;
  messageCount: number;
}

interface RecommendedProf {
  id: string;
  name: string;
  university: string;
  position_title: string | null;
  research_areas: string[];
  h_index: number | null;
  opportunity_score: number | null;
  accepting_students: boolean | null;
}

interface SavedEntry {
  id: string;
  professor_id: string;
  created_at: string;
  professors: {
    id: string; name: string; university: string;
    position_title: string | null; h_index: number | null;
    research_areas: string[];
  } | null;
}

interface OutreachEntry {
  id: string;
  subject_line: string;
  status: string;
  purpose: string;
  created_at: string;
  professors: { id: string; name: string; university: string } | null;
}

// ─── Completeness calc ─────────────────────
function calcCompleteness(
  p: Partial<UserProfile>,
  eduCount: number,
  workCount: number,
  docCount: number,
): number {
  let score = 0;
  if (p.display_name) score += 10;
  if (eduCount > 0) score += 30;
  if (p.target_field) score += 15;
  if (p.target_universities && p.target_universities.length > 0) score += 10;
  if (p.english_level) score += 10;
  if (docCount > 0) score += 15;
  if (workCount > 0) score += 10;
  return Math.min(100, score);
}

// ─── Arc progress SVG ───────────────────────
function ArcProgress({ pct, size = 56 }: { pct: number; size?: number }) {
  const r = (size / 2) - 6;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={cx} cy={cy} r={r} stroke="rgba(212,168,67,0.1)" strokeWidth="5" fill="none" />
      <circle
        cx={cx} cy={cy} r={r}
        stroke={pct >= 80 ? '#5a8060' : pct >= 50 ? '#D4A843' : '#b06040'}
        strokeWidth="5" fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
    </svg>
  );
}

// ─── Plan badge ──────────────────────────────
const PLAN_CONFIG = {
  free:    { label: '免费版', className: 'bg-amber-50 dark:bg-[#D4A843]/10 text-amber-700 dark:text-[#D4A843]' },
  starter: { label: 'Starter', className: 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400' },
  pro:     { label: 'Pro ✦', className: 'bg-amber-100 dark:bg-[#f4e4b8] text-amber-700 dark:text-[#8a6030]' },
  elite:   { label: 'Elite ✦✦', className: 'bg-red-100 dark:bg-[#f8d8d0] text-red-700 dark:text-[#8a3020]' },
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  draft:    { label: '草稿', color: '#6a7a7e' },
  copied:   { label: '已复制', color: '#D4A843' },
  sent:     { label: '已发送', color: '#5a8060' },
  replied:  { label: '已回复 🎉', color: '#3a7050' },
  no_reply: { label: '未回复', color: '#b06040' },
};

// ─── Education edit form data ────────────────
type EduFormData = {
  school: string;
  major: string;
  degree: string;
  gpa: string;
  gpa_scale: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  description: string;
};

const emptyEdu: EduFormData = {
  school: '', major: '', degree: '', gpa: '', gpa_scale: '',
  start_date: '', end_date: '', is_current: false, description: '',
};

function eduToForm(e: EducationEntry): EduFormData {
  return {
    school: e.school,
    major: e.major ?? '',
    degree: e.degree ?? '',
    gpa: e.gpa ? String(e.gpa) : '',
    gpa_scale: e.gpa_scale ?? '',
    start_date: e.start_date ?? '',
    end_date: e.end_date ?? '',
    is_current: e.is_current,
    description: e.description ?? '',
  };
}

// ─── Work edit form data ─────────────────────
type WorkFormData = {
  company: string;
  position: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  description: string;
};

const emptyWork: WorkFormData = {
  company: '', position: '', start_date: '', end_date: '', is_current: false, description: '',
};

function workToForm(w: WorkEntry): WorkFormData {
  return {
    company: w.company,
    position: w.position ?? '',
    start_date: w.start_date ?? '',
    end_date: w.end_date ?? '',
    is_current: w.is_current,
    description: w.description ?? '',
  };
}

// ─── "Other info" edit data ──────────────────
type OtherEditData = {
  display_name: string;
  target_field: string;
  target_universities: string;
  english_level: string;
  has_research_experience: boolean;
  research_description: string;
  has_publications: boolean;
  publication_details: string;
};

function profileToOther(p: UserProfile): OtherEditData {
  return {
    display_name: p.display_name ?? '',
    target_field: p.target_field ?? '',
    target_universities: (p.target_universities ?? []).join(', '),
    english_level: p.english_level ?? '',
    has_research_experience: p.has_research_experience ?? false,
    research_description: p.research_description ?? '',
    has_publications: p.has_publications ?? false,
    publication_details: p.publication_details ?? '',
  };
}

// ─── File size formatter ─────────────────────
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Image compress ──────────────────────────
function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 300;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      const min = Math.min(img.width, img.height);
      const sx = (img.width - min) / 2;
      const sy = (img.height - min) / 2;
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('压缩失败')),
        'image/jpeg',
        0.8
      );
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = URL.createObjectURL(file);
  });
}

// ─── Credits interfaces ──────────────────────
interface CreditTransaction {
  id: string;
  amount: number;
  balance_after: number;
  type: string;
  description: string;
  created_at: string;
}

// Shared input class for form fields
const INPUT_CLS = 'w-full px-2.5 py-1.5 rounded-lg text-xs outline-none bg-white dark:bg-white/5 border border-gray-200 dark:border-[#D4A843]/[0.08] text-gray-900 dark:text-[#e8e4dc]';
const SELECT_CLS = INPUT_CLS;

// ─────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────

export default function MyProfilePage() {
  const { user, profile, authLoading, showLogin, signOut, refreshProfile } = useAuth();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  // Education, work, documents
  const [education, setEducation] = useState<EducationEntry[]>([]);
  const [work, setWork] = useState<WorkEntry[]>([]);
  const [documents, setDocuments] = useState<DocumentEntry[]>([]);

  // Education form
  const [eduEditing, setEduEditing] = useState<string | 'new' | null>(null);
  const [eduForm, setEduForm] = useState<EduFormData>(emptyEdu);
  const [eduSaving, setEduSaving] = useState(false);

  // Work form
  const [workEditing, setWorkEditing] = useState<string | 'new' | null>(null);
  const [workForm, setWorkForm] = useState<WorkFormData>(emptyWork);
  const [workSaving, setWorkSaving] = useState(false);

  // "Other info" editing
  const [otherEditing, setOtherEditing] = useState(false);
  const [otherData, setOtherData] = useState<OtherEditData | null>(null);
  const [otherSaving, setOtherSaving] = useState(false);

  // Documents upload
  const [docUploading, setDocUploading] = useState(false);
  const [docMsg, setDocMsg] = useState('');
  const docFileRef = useRef<HTMLInputElement>(null);

  // Saved profs, outreach, chat, recommended
  const [saved, setSaved] = useState<SavedEntry[]>([]);
  const [emails, setEmails] = useState<OutreachEntry[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [conversations, setConversations] = useState<ConversationEntry[]>([]);
  const [chatStats, setChatStats] = useState<Record<string, number>>({});
  const [recommended, setRecommended] = useState<RecommendedProf[]>([]);
  const [recLoading, setRecLoading] = useState(false);

  // Collapsible sections
  const [showOther, setShowOther] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwToast, setPwToast] = useState('');
  const [showRoleApply, setShowRoleApply] = useState(false);
  const [roleApplyRole, setRoleApplyRole] = useState<'admin' | 'sales'>('admin');
  const [roleApplyReason, setRoleApplyReason] = useState('');
  const [roleApplyPhone, setRoleApplyPhone] = useState('');
  const [roleApplyLoading, setRoleApplyLoading] = useState(false);
  const [roleApplyStatus, setRoleApplyStatus] = useState<string | null>(null);
  const [roleToast, setRoleToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Avatar
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState('');
  const avatarFileRef = useRef<HTMLInputElement>(null);

  // Credits
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [todayClaimed, setTodayClaimed] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [creditTxs, setCreditTxs] = useState<CreditTransaction[]>([]);
  const [creditAchievements, setCreditAchievements] = useState<string[]>([]);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [showCreditRules, setShowCreditRules] = useState(false);
  const [referralCopied, setReferralCopied] = useState(false);
  const [inviteText, setInviteText] = useState('');
  const [referralStats, setReferralStats] = useState({ invited: 0, maxInvites: 3, earned: 0 });
  const [inviteCopied, setInviteCopied] = useState(false);

  // Gmail
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailAddress, setGmailAddress] = useState<string | null>(null);
  const [gmailToast, setGmailToast] = useState<string | null>(null);
  const [gmailDisconnecting, setGmailDisconnecting] = useState(false);

  const loadCredits = useCallback(() => {
    fetch('/api/user/credits').then(r => r.json()).then(d => {
      setCreditBalance(d.balance ?? 0);
      setTodayClaimed(d.todayClaimed ?? false);
      setReferralCode(d.referralCode ?? '');
      setCreditTxs(d.recentTransactions ?? []);
      setCreditAchievements(d.achievements ?? []);
    }).catch(() => {});
  }, []);

  const loadRecommended = useCallback(() => {
    setRecLoading(true);
    fetch('/api/user/recommended-professors')
      .then(r => r.json())
      .then(d => setRecommended(d.professors ?? []))
      .catch(() => {})
      .finally(() => setRecLoading(false));
  }, []);

  const loadEducation = useCallback(() => {
    fetch('/api/user/education').then(r => r.json()).then(d => setEducation(d.education ?? [])).catch(() => {});
  }, []);

  const loadWork = useCallback(() => {
    fetch('/api/user/work').then(r => r.json()).then(d => setWork(d.work ?? [])).catch(() => {});
  }, []);

  const loadDocuments = useCallback(() => {
    fetch('/api/user/documents').then(r => r.json()).then(d => setDocuments(d.documents ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!roleToast) return;
    const t = setTimeout(() => setRoleToast(null), 3500);
    return () => clearTimeout(t);
  }, [roleToast]);

  useEffect(() => {
    if (!user) return;
    // Gmail toast from OAuth callback
    const params = new URLSearchParams(window.location.search);
    const gmailParam = params.get('gmail');
    if (gmailParam === 'connected') {
      setGmailToast('Gmail 连接成功');
      setTimeout(() => setGmailToast(null), 3000);
      window.history.replaceState({}, '', '/koala/my-profile');
    } else if (gmailParam === 'error') {
      setGmailToast('Gmail 连接失败，请重试');
      setTimeout(() => setGmailToast(null), 4000);
      window.history.replaceState({}, '', '/koala/my-profile');
    }
    // Load Gmail status
    fetch('/api/user/gmail/status').then(r => r.json()).then(d => {
      setGmailConnected(d.connected ?? false);
      setGmailAddress(d.gmail_address ?? null);
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setDataLoading(true);
    fetch('/api/admin/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.role) setUserRole(d.role); })
      .catch(() => {});
    Promise.all([
      fetch('/api/user/saved-professors').then(r => r.json()),
      fetch('/api/user/outreach-history').then(r => r.json()),
      fetch('/api/user/chat-summary').then(r => r.json()),
      fetch('/api/user/recommended-professors').then(r => r.json()),
      fetch('/api/user/education').then(r => r.json()),
      fetch('/api/user/work').then(r => r.json()),
      fetch('/api/user/documents').then(r => r.json()),
      fetch('/api/user/credits').then(r => r.json()),
      fetch('/api/user/referral/stats').then(r => r.json()).catch(() => ({ invited: 0, maxInvites: 3, earned: 0 })),
    ]).then(([s, e, cs, rec, edu, wk, docs, cr, rs]) => {
      setSaved(s.saved ?? []);
      setEmails(e.emails ?? []);
      setConversations(cs.conversations ?? []);
      setChatStats(cs.stats ?? {});
      setRecommended(rec.professors ?? []);
      setEducation(edu.education ?? []);
      setWork(wk.work ?? []);
      setDocuments(docs.documents ?? []);
      setCreditBalance(cr.balance ?? 0);
      setTodayClaimed(cr.todayClaimed ?? false);
      setReferralCode(cr.referralCode ?? '');
      setCreditTxs(cr.recentTransactions ?? []);
      setCreditAchievements(cr.achievements ?? []);
      if (rs && !rs.error) setReferralStats(rs);
    }).catch(() => {}).finally(() => setDataLoading(false));
  }, [user]);

  useEffect(() => {
    if (referralCode) {
      setInviteText(
        `🐨 我在用 Koala PhD 申请澳洲博士，AI 帮我匹配了超合适的导师！\n\n` +
        `注册就送 35 积分，用我的邀请码还能额外得 5 积分哦～\n` +
        `邀请码：${referralCode}\n\n` +
        `👉 https://koalaphd.com/koala/auth?ref=${referralCode}`
      );
    }
  }, [referralCode]);

  // ── Not logged in ────────────────────────
  if (!authLoading && !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
        <div className="text-5xl mb-4">🐨</div>
        <h1 className="text-lg font-bold mb-2 text-gray-900 dark:text-[#e8e4dc]">登录后查看个人中心</h1>
        <p className="text-sm mb-6 leading-relaxed text-gray-500 dark:text-[#6a7a7e]">
          保存你的背景信息，收藏心仪教授，<br />查看申请信历史
        </p>
        <button
          onClick={() => showLogin()}
          className="w-full max-w-xs py-3 rounded-full text-sm font-semibold mb-3 bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]"
        >
          登录 / 注册
        </button>
        <Link href="/koala/home" className="text-xs text-gray-500 dark:text-[#6a7a7e]">
          先逛逛 →
        </Link>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="animate-pulse text-sm text-gray-500 dark:text-[#6a7a7e]">加载中…</div>
      </div>
    );
  }

  const pct = profile ? calcCompleteness(profile, education.length, work.length, documents.length) : 0;
  const planKey = (profile?.plan_type ?? 'free') as keyof typeof PLAN_CONFIG;
  const plan = PLAN_CONFIG[planKey] ?? PLAN_CONFIG.free;
  const displayName = profile?.display_name || user?.email?.split('@')[0] || '用户';
  const initials = displayName.slice(0, 1).toUpperCase();

  // ── Avatar upload (auto-compress) ──────────
  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setAvatarUploading(true);
    setAvatarMsg('');
    try {
      const compressed = await compressImage(file);
      const formData = new FormData();
      formData.append('file', new File([compressed], 'avatar.jpg', { type: 'image/jpeg' }));

      const res = await fetch('/api/user/avatar', { method: 'POST', body: formData });
      const data = await res.json();

      if (data.url) {
        await fetch('/api/user/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatar_url: data.url }),
        });
        await refreshProfile();
        setAvatarMsg('头像已更新');
        setTimeout(() => setAvatarMsg(''), 3000);
      } else {
        setAvatarMsg(data.error || '上传失败');
      }
    } catch {
      setAvatarMsg('头像上传失败，请重试');
    }
    setAvatarUploading(false);
  }

  // ── Daily checkin ─────────────────────────
  async function handleCheckin() {
    setCheckinLoading(true);
    try {
      const res = await fetch('/api/user/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'daily_checkin' }),
      });
      const data = await res.json();
      if (data.success) {
        setCreditBalance(data.balance);
        setTodayClaimed(true);
        loadCredits();
        await refreshProfile();
      }
    } catch {}
    setCheckinLoading(false);
  }

  // ── Education CRUD ────────────────────────
  async function saveEducation() {
    if (!eduForm.school.trim()) return;
    setEduSaving(true);
    try {
      const res = eduEditing === 'new'
        ? await fetch('/api/user/education', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eduForm),
          })
        : await fetch('/api/user/education', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: eduEditing, ...eduForm }),
          });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setDocMsg(`教育经历保存失败：${d.error || '请重试'}`);
        setTimeout(() => setDocMsg(''), 4000);
      } else {
        loadEducation();
        setEduEditing(null);
      }
    } catch {
      setDocMsg('教育经历保存失败，请重试');
      setTimeout(() => setDocMsg(''), 4000);
    }
    setEduSaving(false);
  }

  async function deleteEducation(id: string) {
    await fetch('/api/user/education', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setEducation(prev => prev.filter(e => e.id !== id));
  }

  // ── Work CRUD ─────────────────────────────
  async function saveWork() {
    if (!workForm.company.trim()) return;
    setWorkSaving(true);
    try {
      const res = workEditing === 'new'
        ? await fetch('/api/user/work', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(workForm),
          })
        : await fetch('/api/user/work', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: workEditing, ...workForm }),
          });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setDocMsg(`工作经历保存失败：${d.error || '请重试'}`);
        setTimeout(() => setDocMsg(''), 4000);
      } else {
        loadWork();
        setWorkEditing(null);
      }
    } catch {
      setDocMsg('工作经历保存失败，请重试');
      setTimeout(() => setDocMsg(''), 4000);
    }
    setWorkSaving(false);
  }

  async function deleteWork(id: string) {
    await fetch('/api/user/work', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setWork(prev => prev.filter(w => w.id !== id));
  }

  // ── Document upload + parse ───────────────
  async function handleDocUpload(file: File) {
    setDocUploading(true);
    setDocMsg('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/user/documents', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Upload failed');
      await loadDocuments();
      setDocMsg(`上传成功：${file.name}`);
      setTimeout(() => setDocMsg(''), 4000);
    } catch (e) {
      setDocMsg(`上传失败：${(e as Error).message}`);
      setTimeout(() => setDocMsg(''), 5000);
    }
    setDocUploading(false);
    if (docFileRef.current) docFileRef.current.value = '';
  }

  async function parseDocument(docId: string) {
    setDocuments(prev => prev.map(d => d.id === docId ? { ...d, parse_status: 'parsing' as const } : d));
    try {
      const res = await fetch('/api/user/documents/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: docId }),
      });
      if (res.ok) {
        loadDocuments();
        loadEducation();
        loadWork();
        await refreshProfile();
      } else {
        loadDocuments();
      }
    } catch {
      loadDocuments();
    }
  }

  async function deleteDocument(docId: string) {
    await fetch('/api/user/documents', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: docId }),
    });
    setDocuments(prev => prev.filter(d => d.id !== docId));
  }

  // ── Save "other info" ─────────────────────
  async function saveOtherInfo() {
    if (!otherData) return;
    setOtherSaving(true);
    const payload = {
      display_name: otherData.display_name || null,
      target_field: otherData.target_field || null,
      target_universities: otherData.target_universities
        ? otherData.target_universities.split(',').map(s => s.trim()).filter(Boolean)
        : [],
      english_level: otherData.english_level || null,
      has_research_experience: otherData.has_research_experience,
      research_description: otherData.research_description || null,
      has_publications: otherData.has_publications,
      publication_details: otherData.publication_details || null,
    };
    await fetch('/api/user/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    await refreshProfile();
    setOtherEditing(false);
    setOtherSaving(false);
  }

  // ── Unsave professor ──────────────────────
  async function unsaveProfessor(professorId: string) {
    await fetch(`/api/user/saved-professors?professor_id=${professorId}`, { method: 'DELETE' });
    setSaved(prev => prev.filter(s => s.professor_id !== professorId));
  }

  // ── Sign out ──────────────────────────────
  async function handleSignOut() {
    await signOut();
    router.push('/koala/home');
  }

  const otherInfoRows = [
    { label: '目标方向', value: profile?.target_field },
    { label: '目标学校', value: (profile?.target_universities ?? []).join(', ') || null },
    { label: '英语水平', value: profile?.english_level },
    { label: '科研经历', value: profile?.has_research_experience ? (profile.research_description || '有') : null },
    { label: '论文发表', value: profile?.has_publications ? (profile.publication_details || '有') : null },
  ];

  // Shared card + divider classes
  const CARD_CLS = 'bg-white dark:bg-white/5 border border-gray-200 dark:border-[#D4A843]/10 shadow-sm dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]';
  const DIVIDER_CLS = 'border-gray-200 dark:border-[#D4A843]/[0.08]';

  // ── Education form inline component ───────
  function renderEduForm() {
    return (
      <div className={`px-4 py-3 space-y-2 border-t ${DIVIDER_CLS}`}>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] mb-0.5 text-gray-500 dark:text-[#6a7a7e]">学校 *</label>
            <input type="text" placeholder="例：浙江大学" value={eduForm.school}
              onChange={e => setEduForm(p => ({ ...p, school: e.target.value }))}
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="block text-[10px] mb-0.5 text-gray-500 dark:text-[#6a7a7e]">专业</label>
            <input type="text" placeholder="例：计算机科学" value={eduForm.major}
              onChange={e => setEduForm(p => ({ ...p, major: e.target.value }))}
              className={INPUT_CLS}
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-[10px] mb-0.5 text-gray-500 dark:text-[#6a7a7e]">学历</label>
            <select value={eduForm.degree}
              onChange={e => setEduForm(p => ({ ...p, degree: e.target.value }))}
              className={SELECT_CLS}
            >
              <option value="">请选择</option>
              {DEGREE_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] mb-0.5 text-gray-500 dark:text-[#6a7a7e]">GPA</label>
            <input type="text" placeholder="3.8" value={eduForm.gpa}
              onChange={e => setEduForm(p => ({ ...p, gpa: e.target.value }))}
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="block text-[10px] mb-0.5 text-gray-500 dark:text-[#6a7a7e]">满分</label>
            <select value={eduForm.gpa_scale}
              onChange={e => setEduForm(p => ({ ...p, gpa_scale: e.target.value }))}
              className={SELECT_CLS}
            >
              <option value="">—</option>
              {['4.0', '5.0', '7.0', '100'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] mb-0.5 text-gray-500 dark:text-[#6a7a7e]">开始</label>
            <input type="text" placeholder="2020-09" value={eduForm.start_date}
              onChange={e => setEduForm(p => ({ ...p, start_date: e.target.value }))}
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="block text-[10px] mb-0.5 text-gray-500 dark:text-[#6a7a7e]">
              结束
              <label className="ml-2 inline-flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={eduForm.is_current}
                  onChange={e => setEduForm(p => ({ ...p, is_current: e.target.checked, end_date: e.target.checked ? '' : p.end_date }))}
                  className="rounded"
                />
                <span className="text-[10px] text-gray-500 dark:text-[#a8b8ac]">至今</span>
              </label>
            </label>
            <input type="text" placeholder="2024-06" value={eduForm.end_date}
              disabled={eduForm.is_current}
              onChange={e => setEduForm(p => ({ ...p, end_date: e.target.value }))}
              className={`${INPUT_CLS} ${eduForm.is_current ? 'opacity-40' : ''}`}
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] mb-0.5 text-gray-500 dark:text-[#6a7a7e]">备注</label>
          <input type="text" placeholder="相关课程、荣誉等" value={eduForm.description}
            onChange={e => setEduForm(p => ({ ...p, description: e.target.value }))}
            className={INPUT_CLS}
          />
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={saveEducation} disabled={eduSaving || !eduForm.school.trim()}
            className="text-[11px] px-3 py-1 rounded-lg font-semibold bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10] disabled:opacity-50"
          >
            {eduSaving ? '保存中…' : '保存'}
          </button>
          <button onClick={() => setEduEditing(null)}
            className="text-[11px] px-3 py-1 rounded-lg bg-amber-50 dark:bg-[#D4A843]/10 text-amber-700 dark:text-[#D4A843]"
          >
            取消
          </button>
        </div>
      </div>
    );
  }

  // ── Work form inline component ────────────
  function renderWorkForm() {
    return (
      <div className={`px-4 py-3 space-y-2 border-t ${DIVIDER_CLS}`}>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] mb-0.5 text-gray-500 dark:text-[#6a7a7e]">公司/机构 *</label>
            <input type="text" placeholder="例：字节跳动" value={workForm.company}
              onChange={e => setWorkForm(p => ({ ...p, company: e.target.value }))}
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="block text-[10px] mb-0.5 text-gray-500 dark:text-[#6a7a7e]">职位</label>
            <input type="text" placeholder="例：研究实习生" value={workForm.position}
              onChange={e => setWorkForm(p => ({ ...p, position: e.target.value }))}
              className={INPUT_CLS}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] mb-0.5 text-gray-500 dark:text-[#6a7a7e]">开始</label>
            <input type="text" placeholder="2023-06" value={workForm.start_date}
              onChange={e => setWorkForm(p => ({ ...p, start_date: e.target.value }))}
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="block text-[10px] mb-0.5 text-gray-500 dark:text-[#6a7a7e]">
              结束
              <label className="ml-2 inline-flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={workForm.is_current}
                  onChange={e => setWorkForm(p => ({ ...p, is_current: e.target.checked, end_date: e.target.checked ? '' : p.end_date }))}
                  className="rounded"
                />
                <span className="text-[10px] text-gray-500 dark:text-[#a8b8ac]">至今</span>
              </label>
            </label>
            <input type="text" placeholder="2024-01" value={workForm.end_date}
              disabled={workForm.is_current}
              onChange={e => setWorkForm(p => ({ ...p, end_date: e.target.value }))}
              className={`${INPUT_CLS} ${workForm.is_current ? 'opacity-40' : ''}`}
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] mb-0.5 text-gray-500 dark:text-[#6a7a7e]">工作描述</label>
          <input type="text" placeholder="简述职责、成就…" value={workForm.description}
            onChange={e => setWorkForm(p => ({ ...p, description: e.target.value }))}
            className={INPUT_CLS}
          />
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={saveWork} disabled={workSaving || !workForm.company.trim()}
            className="text-[11px] px-3 py-1 rounded-lg font-semibold bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10] disabled:opacity-50"
          >
            {workSaving ? '保存中…' : '保存'}
          </button>
          <button onClick={() => setWorkEditing(null)}
            className="text-[11px] px-3 py-1 rounded-lg bg-amber-50 dark:bg-[#D4A843]/10 text-amber-700 dark:text-[#D4A843]"
          >
            取消
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-6 lg:pb-12 bg-gray-50 dark:bg-[#080c10]">
      <MobilePageHeader title="个人设置" backHref="/koala/home" />
      <div className="max-w-5xl mx-auto">

      {/* ── Profile Header ──────────────────── */}
      <div className="mx-4 lg:mx-0 pt-4 pb-3">
        <div className={`rounded-xl p-5 ${CARD_CLS}`}>
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="relative cursor-pointer group flex-shrink-0" onClick={() => !avatarUploading && avatarFileRef.current?.click()}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="rounded-full object-cover" style={{ width: 56, height: 56 }} />
              ) : (
                <div className="rounded-full flex items-center justify-center text-xl font-bold bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]" style={{ width: 56, height: 56 }}>
                  {initials}
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {avatarUploading ? (
                  <span className="text-white text-[10px] animate-pulse">上传中</span>
                ) : (
                  <span className="text-white text-[10px]">更换</span>
                )}
              </div>
              <input ref={avatarFileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
            {/* Info + actions */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <h1 className="text-sm font-semibold truncate text-gray-900 dark:text-[#e8e4dc]">
                    {displayName}
                  </h1>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${plan.className}`}>
                    {plan.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="relative" style={{ width: 36, height: 36 }}>
                    <ArcProgress pct={pct} size={36} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[9px] font-bold text-gray-900 dark:text-[#e8e4dc]">{pct}%</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setOtherEditing(true);
                      setOtherData(profile ? profileToOther(profile) : profileToOther({} as UserProfile));
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-[#D4A843]/10 text-amber-700 dark:text-[#D4A843]"
                  >
                    编辑
                  </button>
                </div>
              </div>
              <p className="text-xs truncate mt-0.5 text-gray-500 dark:text-[#6a7a7e]">{user?.email}</p>
              {userRole === 'super_admin' && (
                <Link href="/dashboard/koala/admin-overview" className="text-[10px] no-underline mt-0.5 inline-block text-[#1A1A2E] dark:text-[#D4A843]">
                  ⚙️ 超级管理后台 →
                </Link>
              )}
              {userRole === 'admin' && (
                <Link href="/dashboard/koala" className="text-[10px] no-underline mt-0.5 inline-block text-[#1A1A2E] dark:text-[#D4A843]">
                  🔧 管理后台 →
                </Link>
              )}
              {userRole === 'sales' && (
                <Link href="/dashboard/sales" className="text-[10px] no-underline mt-0.5 inline-block text-[#1A1A2E] dark:text-[#D4A843]">
                  📊 销售后台 →
                </Link>
              )}
              <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500 dark:text-[#6a7a7e]">
                <span>{education.length} 段教育</span>
                <span>·</span>
                <span>{work.length} 段工作</span>
                <span>·</span>
                <span>{documents.length} 份文件</span>
              </div>
            </div>
          </div>
          {/* Avatar toast */}
          {avatarMsg && (
            <p className={`text-[11px] mt-2 text-center ${avatarMsg.includes('已更新') ? 'text-[#5a8060]' : 'text-[#b06040]'}`}>
              {avatarMsg.includes('已更新') ? '✅' : '❌'} {avatarMsg}
            </p>
          )}
        </div>
      </div>

      {/* ── Credits card ────────────────────── */}
      <div className="mx-4 lg:mx-0 pb-3">
        <div className={`rounded-xl p-4 ${CARD_CLS}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-amber-600 dark:text-[#D4A843]">
                💎 {creditBalance ?? profile?.credits_remaining ?? 0}
              </span>
              <span className="text-xs text-gray-500 dark:text-[#6a7a7e]">积分</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCheckin}
                disabled={todayClaimed || checkinLoading}
                className={`text-[11px] px-3 py-1.5 rounded-lg font-medium ${
                  todayClaimed
                    ? 'bg-green-50 dark:bg-[rgba(90,128,96,0.12)] text-green-600 dark:text-[#5a8060]'
                    : 'bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]'
                }`}
              >
                {checkinLoading ? '…' : todayClaimed ? '✅ 已签到' : '每日签到 +2'}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => setShowCreditRules(!showCreditRules)}
              className="text-[10px] text-gray-500 dark:text-[#6a7a7e] bg-transparent"
            >
              📋 积分规则 {showCreditRules ? '▲' : '▼'}
            </button>
            <button
              onClick={() => setShowCreditModal(true)}
              className="text-[10px] text-[#1A1A2E] dark:text-[#D4A843] bg-transparent"
            >
              查看积分明细 →
            </button>
            <Link
              href="/koala/pricing"
              className="text-[10px] font-medium no-underline px-2 py-0.5 rounded-full bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]"
            >
              充值/订阅 →
            </Link>
          </div>
          {showCreditRules && (
            <div className="mt-2 p-3 rounded-lg text-[10px] leading-relaxed bg-black/10 dark:bg-black/20 text-gray-500 dark:text-[#6a7a7e]">
              <p className="font-semibold mb-1 text-gray-600 dark:text-[#a8b8ac]">消耗积分</p>
              <p>生成套磁信 5 · 教授匹配 2 · AI 对话 1 · 选校规划 3 · 文书润色 5 · 简历解析 免费</p>
              <p className="font-semibold mt-2 mb-1 text-gray-600 dark:text-[#a8b8ac]">获取积分</p>
              <p>每日签到 +2 · 完善资料80% +20 · 上传简历 +10 · 邀请好友 +15/人 · 收藏教授 +5 · 首封套磁信 +10</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Invite card ──────────────────────── */}
      {referralCode && (
        <div className={`mx-4 lg:mx-0 mb-3 rounded-xl p-4 ${CARD_CLS}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-gray-900 dark:text-[#e8e4dc]">📨 邀请好友，各得 15 积分</span>
            {referralStats.invited >= 3 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 dark:bg-[rgba(90,128,96,0.12)] text-green-600 dark:text-[#5a8060]">🎉 已满</span>
            )}
          </div>
          <p className="text-[10px] mb-3 text-gray-500 dark:text-[#6a7a7e]">每个邀请码最多邀请 3 位好友</p>

          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] text-gray-500 dark:text-[#a8b8ac]">你的邀请码：</span>
            <span className="text-sm font-bold tracking-wider text-amber-600 dark:text-[#D4A843] font-mono">{referralCode}</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(referralCode);
                setReferralCopied(true);
                setTimeout(() => setReferralCopied(false), 2000);
              }}
              disabled={referralStats.invited >= 3}
              className="text-[10px] px-2 py-0.5 rounded bg-amber-50 dark:bg-[#D4A843]/10 text-amber-700 dark:text-[#D4A843] disabled:opacity-40"
            >
              {referralCopied ? '✅ 已复制' : '复制码'}
            </button>
          </div>

          {/* Poster + copy buttons */}
          <div className="flex gap-2 mb-3">
            <SharePosterTrigger
              label="生成邀请海报"
              className="flex-1 flex items-center justify-center gap-1.5 text-[11px] py-2.5 rounded-lg font-medium bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(inviteText);
                setInviteCopied(true);
                setTimeout(() => setInviteCopied(false), 2500);
              }}
              disabled={referralStats.invited >= 3}
              className="flex-1 text-[11px] py-2.5 rounded-lg font-medium bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-[#a8b8ac] disabled:opacity-40"
            >
              {inviteCopied ? '✅ 已复制' : '复制邀请文案'}
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-[#6a7a7e]">
            <span>已邀请 {referralStats.invited}/{referralStats.maxInvites} 人 · 获得 {referralStats.earned} 积分</span>
            {referralStats.invited >= 3 && <span className="text-green-600 dark:text-[#5a8060]">🎉 邀请名额已用完</span>}
          </div>
        </div>
      )}

      {/* Share Poster Modal — handled inline by SharePosterTrigger */}

      {/* ── Two-col layout ──────────────────── */}
      <div className="lg:flex lg:gap-3 lg:items-start lg:px-0">
        {/* ── Left column ── */}
        <div className="lg:w-[380px] lg:flex-shrink-0">

          {/* ── Education history ─────────────── */}
          <div className={`mx-4 lg:mx-0 mb-3 rounded-xl overflow-hidden ${CARD_CLS}`}>
            <div className={`flex items-center justify-between px-4 py-2.5 border-b ${DIVIDER_CLS}`}>
              <span className="text-xs font-semibold text-gray-900 dark:text-[#e8e4dc]">
                🎓 教育经历 <span className="font-normal text-gray-500 dark:text-[#6a7a7e]">({education.length})</span>
              </span>
              <button
                onClick={() => { setEduEditing('new'); setEduForm(emptyEdu); }}
                className="text-[10px] px-2 py-0.5 rounded bg-amber-50 dark:bg-[#D4A843]/10 text-amber-700 dark:text-[#D4A843]"
              >
                + 添加
              </button>
            </div>

            {dataLoading ? (
              <div className="px-4 py-4 text-xs text-center text-gray-500 dark:text-[#6a7a7e]">加载中…</div>
            ) : education.length === 0 && eduEditing !== 'new' ? (
              <div className="px-4 py-4 text-center">
                <p className="text-xs text-gray-500 dark:text-[#6a7a7e]">还没有教育经历</p>
                <button onClick={() => { setEduEditing('new'); setEduForm(emptyEdu); }}
                  className="text-xs mt-1 font-medium text-[#1A1A2E] dark:text-[#D4A843] bg-transparent"
                >
                  添加第一段教育经历 →
                </button>
              </div>
            ) : (
              <div className={`divide-y ${DIVIDER_CLS}`}>
                {education.map(edu => (
                  eduEditing === edu.id ? (
                    <div key={edu.id}>{renderEduForm()}</div>
                  ) : (
                    <div key={edu.id} className="px-4 py-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-900 dark:text-[#e8e4dc]">{edu.school}</span>
                            {edu.degree && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-[#D4A843]/[0.08] text-gray-500 dark:text-[#a89878]">
                                {edu.degree}
                              </span>
                            )}
                          </div>
                          {edu.major && <p className="text-[11px] mt-0.5 text-gray-500 dark:text-[#6a7a7e]">{edu.major}</p>}
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400 dark:text-[#5a6a6e]">
                            {(edu.start_date || edu.end_date) && (
                              <span>{edu.start_date ?? '?'} – {edu.is_current ? '至今' : (edu.end_date ?? '?')}</span>
                            )}
                            {edu.gpa && <span>GPA {edu.gpa}{edu.gpa_scale ? `/${edu.gpa_scale}` : ''}</span>}
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => { setEduEditing(edu.id); setEduForm(eduToForm(edu)); }}
                            className="text-[10px] px-2 py-0.5 rounded bg-amber-50 dark:bg-[#D4A843]/10 text-amber-700 dark:text-[#D4A843]"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => deleteEducation(edu.id)}
                            className="text-[10px] px-2 py-0.5 rounded bg-red-50 dark:bg-[rgba(176,96,64,0.12)] text-red-500 dark:text-[#b06040]"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                ))}
              </div>
            )}

            {eduEditing === 'new' && renderEduForm()}
          </div>

          {/* ── Work history ─────────────────── */}
          <div className={`mx-4 lg:mx-0 mb-3 rounded-xl overflow-hidden ${CARD_CLS}`}>
            <div className={`flex items-center justify-between px-4 py-2.5 border-b ${DIVIDER_CLS}`}>
              <span className="text-xs font-semibold text-gray-900 dark:text-[#e8e4dc]">
                💼 工作/实习经历 <span className="font-normal text-gray-500 dark:text-[#6a7a7e]">({work.length})</span>
              </span>
              <button
                onClick={() => { setWorkEditing('new'); setWorkForm(emptyWork); }}
                className="text-[10px] px-2 py-0.5 rounded bg-amber-50 dark:bg-[#D4A843]/10 text-amber-700 dark:text-[#D4A843]"
              >
                + 添加
              </button>
            </div>

            {dataLoading ? (
              <div className="px-4 py-4 text-xs text-center text-gray-500 dark:text-[#6a7a7e]">加载中…</div>
            ) : work.length === 0 && workEditing !== 'new' ? (
              <div className="px-4 py-4 text-center">
                <p className="text-xs text-gray-500 dark:text-[#6a7a7e]">还没有工作/实习经历</p>
                <button onClick={() => { setWorkEditing('new'); setWorkForm(emptyWork); }}
                  className="text-xs mt-1 font-medium text-[#1A1A2E] dark:text-[#D4A843] bg-transparent"
                >
                  添加第一段经历 →
                </button>
              </div>
            ) : (
              <div className={`divide-y ${DIVIDER_CLS}`}>
                {work.map(w => (
                  workEditing === w.id ? (
                    <div key={w.id}>{renderWorkForm()}</div>
                  ) : (
                    <div key={w.id} className="px-4 py-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-900 dark:text-[#e8e4dc]">{w.company}</span>
                          </div>
                          {w.position && <p className="text-[11px] mt-0.5 text-gray-500 dark:text-[#6a7a7e]">{w.position}</p>}
                          {(w.start_date || w.end_date) && (
                            <p className="text-[10px] mt-0.5 text-gray-400 dark:text-[#5a6a6e]">
                              {w.start_date ?? '?'} – {w.is_current ? '至今' : (w.end_date ?? '?')}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => { setWorkEditing(w.id); setWorkForm(workToForm(w)); }}
                            className="text-[10px] px-2 py-0.5 rounded bg-amber-50 dark:bg-[#D4A843]/10 text-amber-700 dark:text-[#D4A843]"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => deleteWork(w.id)}
                            className="text-[10px] px-2 py-0.5 rounded bg-red-50 dark:bg-[rgba(176,96,64,0.12)] text-red-500 dark:text-[#b06040]"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                ))}
              </div>
            )}

            {workEditing === 'new' && renderWorkForm()}
          </div>

          {/* ── Documents / File management ──── */}
          <div className={`mx-4 lg:mx-0 mb-3 rounded-xl overflow-hidden ${CARD_CLS}`}>
            <div className={`flex items-center justify-between px-4 py-2.5 border-b ${DIVIDER_CLS}`}>
              <span className="text-xs font-semibold text-gray-900 dark:text-[#e8e4dc]">
                📄 文件管理 <span className="font-normal text-gray-500 dark:text-[#6a7a7e]">({documents.length})</span>
              </span>
              <button
                onClick={() => !docUploading && docFileRef.current?.click()}
                disabled={docUploading}
                className={`text-[10px] px-2 py-0.5 rounded flex items-center gap-1 text-amber-700 dark:text-[#D4A843] ${docUploading ? 'bg-amber-50 dark:bg-[#D4A843]/20' : 'bg-amber-50 dark:bg-[#D4A843]/10'}`}
              >
                {docUploading && <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />}
                {docUploading ? '上传中…' : '+ 上传文件'}
              </button>
              <input ref={docFileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.gif,.webp" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleDocUpload(f); }}
              />
            </div>

            {docMsg && (
              <div className={`px-4 py-2 text-xs text-center ${docMsg.includes('成功') ? 'text-[#5a8060] bg-green-50 dark:bg-[rgba(90,128,96,0.08)]' : 'text-[#b06040] bg-red-50 dark:bg-[rgba(176,96,64,0.08)]'}`}>
                {docMsg.includes('成功') ? '✅' : '❌'} {docMsg}
              </div>
            )}

            {dataLoading ? (
              <div className="px-4 py-4 text-xs text-center text-gray-500 dark:text-[#6a7a7e]">加载中…</div>
            ) : documents.length === 0 ? (
              <div className="px-4 py-4 text-center">
                <p className="text-xs text-gray-500 dark:text-[#6a7a7e]">上传简历、成绩单或学历证明</p>
                <p className="text-[10px] mt-1 text-gray-400 dark:text-[#5a6a6e]">支持 PDF、图片（PNG/JPG）、Word 文档</p>
                <button
                  onClick={() => !docUploading && docFileRef.current?.click()}
                  className="mt-2 text-xs font-medium text-[#1A1A2E] dark:text-[#D4A843] bg-transparent"
                >
                  📎 上传第一份文件 →
                </button>
              </div>
            ) : (
              <div className={`divide-y ${DIVIDER_CLS}`}>
                {documents.map(doc => {
                  const parseColor = doc.parse_status === 'done' ? '#5a8060'
                    : doc.parse_status === 'parsing' ? '#D4A843'
                    : doc.parse_status === 'failed' ? '#b06040'
                    : '#6a7a7e';
                  const parseLabel = doc.parse_status === 'done' ? '已解析'
                    : doc.parse_status === 'parsing' ? '解析中…'
                    : doc.parse_status === 'failed' ? '解析失败'
                    : '待解析';
                  const fileIcon = doc.file_type.startsWith('image/') ? '🖼️'
                    : doc.file_type.includes('pdf') ? '📑'
                    : '📄';
                  return (
                    <div key={doc.id} className="px-4 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-base flex-shrink-0">{fileIcon}</span>
                          <div className="flex-1 min-w-0">
                            {doc.file_url ? (
                              <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                                className="text-xs font-medium truncate block hover:underline text-[#1A1A2E] dark:text-[#D4A843]">{doc.file_name}</a>
                            ) : (
                              <p className="text-xs font-medium truncate text-gray-900 dark:text-[#e8e4dc]">{doc.file_name}</p>
                            )}
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400 dark:text-[#5a6a6e]">
                              <span>{formatFileSize(doc.file_size)}</span>
                              <span>·</span>
                              <span style={{ color: parseColor }}>{parseLabel}</span>
                              <span>·</span>
                              <span>{timeAgo(doc.created_at)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          {(doc.parse_status === 'pending' || doc.parse_status === 'failed') && (
                            <button
                              onClick={() => parseDocument(doc.id)}
                              className="text-[10px] px-2 py-0.5 rounded font-medium bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]"
                            >
                              AI解析
                            </button>
                          )}
                          {doc.file_url && (
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                              className="text-[10px] px-2 py-0.5 rounded bg-amber-50 dark:bg-[#D4A843]/[0.08] text-amber-700 dark:text-[#D4A843]"
                            >
                              查看
                            </a>
                          )}
                          <button
                            onClick={() => { if (confirm('确定删除此文件？')) deleteDocument(doc.id); }}
                            className="text-[10px] px-2 py-0.5 rounded bg-red-50 dark:bg-[rgba(176,96,64,0.12)] text-red-500 dark:text-[#b06040]"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                      {doc.parse_status === 'failed' && doc.parse_error && (
                        <p className="text-[10px] mt-1 text-[#b06040]">{doc.parse_error}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Other info — collapsible ──────── */}
          <div className={`mx-4 lg:mx-0 mb-3 rounded-xl overflow-hidden ${CARD_CLS}`}>
            {otherEditing && otherData ? (
              <>
                <div className={`flex items-center justify-between px-4 py-2.5 border-b ${DIVIDER_CLS}`}>
                  <span className="text-xs font-semibold text-gray-900 dark:text-[#e8e4dc]">📋 编辑其他信息</span>
                  <div className="flex gap-2">
                    <button onClick={saveOtherInfo} disabled={otherSaving}
                      className="text-[11px] px-3 py-1 rounded-lg font-semibold bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10] disabled:opacity-50"
                    >
                      {otherSaving ? '保存中…' : '保存'}
                    </button>
                    <button onClick={() => setOtherEditing(false)}
                      className="text-[11px] px-3 py-1 rounded-lg bg-amber-50 dark:bg-[#D4A843]/10 text-amber-700 dark:text-[#D4A843]"
                    >
                      取消
                    </button>
                  </div>
                </div>
                <div className="px-4 py-3 space-y-3">
                  {[
                    { key: 'display_name' as const, label: '姓名', placeholder: '你的名字' },
                    { key: 'target_field' as const, label: '目标研究方向', placeholder: '例：机器学习' },
                    { key: 'target_universities' as const, label: '目标学校（逗号分隔）', placeholder: '例：ANU, UNSW' },
                    { key: 'english_level' as const, label: '英语水平', placeholder: '例：雅思 7.0' },
                    { key: 'research_description' as const, label: '科研经历描述', placeholder: '简述你的科研项目…' },
                    { key: 'publication_details' as const, label: '论文详情', placeholder: '发表过的论文名称/期刊…' },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label className="block text-[11px] mb-1 text-gray-500 dark:text-[#6a7a7e]">{label}</label>
                      <div className="flex items-center gap-1.5">
                        <input type="text" placeholder={placeholder}
                          value={otherData[key] as string}
                          onChange={e => setOtherData(prev => prev ? { ...prev, [key]: e.target.value } : prev)}
                          className={`flex-1 px-3 py-2 rounded-lg text-xs outline-none ${INPUT_CLS}`}
                        />
                        {(key === 'research_description' || key === 'publication_details' || key === 'target_field') && (
                          <VoiceInputButton
                            onTranscript={(text) => setOtherData(prev => prev ? { ...prev, [key]: ((prev[key] as string) || '') + text } : prev)}
                            size="sm"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs cursor-pointer text-gray-500 dark:text-[#a8b8ac]">
                      <input type="checkbox" checked={otherData.has_research_experience}
                        onChange={e => setOtherData(prev => prev ? { ...prev, has_research_experience: e.target.checked } : prev)}
                        className="rounded"
                      />
                      有科研经历
                    </label>
                    <label className="flex items-center gap-2 text-xs cursor-pointer text-gray-500 dark:text-[#a8b8ac]">
                      <input type="checkbox" checked={otherData.has_publications}
                        onChange={e => setOtherData(prev => prev ? { ...prev, has_publications: e.target.checked } : prev)}
                        className="rounded"
                      />
                      有论文发表
                    </label>
                  </div>
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowOther(!showOther)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-transparent"
                >
                  <span className="text-xs font-semibold text-gray-900 dark:text-[#e8e4dc]">
                    📋 其他信息 <span className="font-normal text-gray-500 dark:text-[#6a7a7e]">{otherInfoRows.filter(r => r.value).length}/{otherInfoRows.length} 已填</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setOtherEditing(true);
                        setOtherData(profile ? profileToOther(profile) : profileToOther({} as UserProfile));
                      }}
                      className="text-[10px] px-2 py-0.5 rounded bg-amber-50 dark:bg-[#D4A843]/10 text-amber-700 dark:text-[#D4A843]"
                    >
                      编辑
                    </button>
                    <span className="text-[10px] text-gray-500 dark:text-[#6a7a7e]">{showOther ? '▲' : '▼'}</span>
                  </div>
                </button>
                {showOther && (
                  <div className={`border-t ${DIVIDER_CLS}`}>
                    {otherInfoRows.map(({ label, value }, i) => (
                      <div key={label}
                        className={`flex items-center px-4 h-9 ${i % 2 === 1 ? 'bg-gray-50 dark:bg-[#D4A843]/[0.03]' : ''}`}
                      >
                        <span className="text-[11px] w-20 flex-shrink-0 text-gray-500 dark:text-[#6a7a7e]">{label}</span>
                        <span className={`flex-1 text-xs truncate ${value ? 'text-gray-900 dark:text-[#e8e4dc]' : 'text-gray-300 dark:text-[#4a5a5e]'}`}>
                          {value || '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

        </div>{/* end left column */}

        {/* ── Right column ── */}
        <div className="flex-1 min-w-0">

          {/* Achievements */}
          {user && <OlaAchievements userId={user.id} />}

          {/* Saved professors */}
          <div className={`mx-4 lg:mx-0 mb-3 rounded-xl overflow-hidden ${CARD_CLS}`}>
            <div className={`flex items-center justify-between px-4 py-2.5 border-b ${DIVIDER_CLS}`}>
              <span className="text-xs font-semibold text-gray-900 dark:text-[#e8e4dc]">
                🔖 我的收藏 <span className="font-normal text-gray-500 dark:text-[#6a7a7e]">({saved.length})</span>
              </span>
              <Link href="/koala/professors" className="text-[11px] no-underline text-[#1A1A2E] dark:text-[#D4A843]">
                找更多 →
              </Link>
            </div>
            {dataLoading ? (
              <div className="px-4 py-4 text-xs text-center text-gray-500 dark:text-[#6a7a7e]">加载中…</div>
            ) : saved.length === 0 ? (
              <div className="px-4 py-4 text-center">
                <p className="text-xs text-gray-500 dark:text-[#6a7a7e]">还没有收藏教授</p>
                <Link href="/koala/professors" className="text-xs mt-1 inline-block no-underline font-medium text-[#1A1A2E] dark:text-[#D4A843]">
                  去浏览教授&学者库 →
                </Link>
              </div>
            ) : (
              <div className={`divide-y ${DIVIDER_CLS}`}>
                {saved.map(entry => {
                  const prof = entry.professors;
                  if (!prof) return null;
                  return (
                    <div key={entry.id} className="px-4 py-2.5 flex items-start gap-3">
                      <Link href={`/koala/professors/${prof.id}`} className="flex-1 no-underline min-w-0">
                        <p className="text-xs font-semibold text-gray-900 dark:text-[#e8e4dc]">{prof.name}</p>
                        <p className="text-[11px] text-gray-500 dark:text-[#6a7a7e]">
                          {prof.position_title ?? ''} · {prof.university}
                        </p>
                        {prof.research_areas.length > 0 && (
                          <p className="text-[10px] mt-0.5 truncate text-gray-400 dark:text-[#a89878]">
                            {prof.research_areas.slice(0, 2).join(' · ')}
                          </p>
                        )}
                      </Link>
                      <button onClick={() => unsaveProfessor(entry.professor_id)}
                        className="text-[10px] px-2 py-1 rounded-lg flex-shrink-0 bg-red-50 dark:bg-[rgba(176,96,64,0.12)] text-red-500 dark:text-[#b06040]"
                      >
                        取消
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Outreach history */}
          <div className={`mx-4 lg:mx-0 mb-3 rounded-xl overflow-hidden ${CARD_CLS}`}>
            <div className={`px-4 py-2.5 border-b ${DIVIDER_CLS}`}>
              <span className="text-xs font-semibold text-gray-900 dark:text-[#e8e4dc]">
                ✉️ 申请信记录 <span className="font-normal text-gray-500 dark:text-[#6a7a7e]">({emails.length})</span>
              </span>
            </div>
            {dataLoading ? (
              <div className="px-4 py-4 text-xs text-center text-gray-500 dark:text-[#6a7a7e]">加载中…</div>
            ) : emails.length === 0 ? (
              <div className="px-4 py-4 text-center">
                <p className="text-xs text-gray-500 dark:text-[#6a7a7e]">还没有生成过申请信</p>
                <Link href="/koala/chat" className="text-xs mt-1 inline-block no-underline font-medium text-[#1A1A2E] dark:text-[#D4A843]">
                  去生成第一封 →
                </Link>
              </div>
            ) : (
              <div className={`divide-y ${DIVIDER_CLS}`}>
                {emails.map(email => {
                  const st = STATUS_LABEL[email.status] ?? { label: email.status, color: '#6a7a7e' };
                  return (
                    <div key={email.id} className="px-4 py-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate text-gray-900 dark:text-[#e8e4dc]">
                            {email.professors?.name ?? '未知教授'}
                          </p>
                          <p className="text-[11px] truncate mt-0.5 text-gray-500 dark:text-[#6a7a7e]">
                            {email.subject_line}
                          </p>
                          <p className="text-[10px] mt-0.5 text-gray-400 dark:text-[#a89878]">
                            {new Date(email.created_at).toLocaleDateString('zh-CN')} · {email.purpose}
                          </p>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: `${st.color}18`, color: st.color }}
                        >
                          {st.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* AI Chat history */}
          <div className={`mx-4 lg:mx-0 mb-3 rounded-xl overflow-hidden ${CARD_CLS}`}>
            <div className={`flex items-center justify-between px-4 py-2.5 border-b ${DIVIDER_CLS}`}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-900 dark:text-[#e8e4dc]">🤖 对话</span>
                {Object.entries(chatStats).map(([mode, count]) => {
                  const ml = MODE_LABELS[mode];
                  return (
                    <span key={mode} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-[#D4A843]/10 text-amber-700 dark:text-[#D4A843]" title={ml?.label ?? mode}>
                      {ml?.emoji ?? '💬'}{count}
                    </span>
                  );
                })}
              </div>
              <Link href="/koala/chat" className="text-[11px] no-underline text-[#1A1A2E] dark:text-[#D4A843]">
                新对话 →
              </Link>
            </div>
            {dataLoading ? (
              <div className="px-4 py-4 text-xs text-center text-gray-500 dark:text-[#6a7a7e]">加载中…</div>
            ) : conversations.length === 0 ? (
              <div className="px-4 py-4 text-center">
                <p className="text-xs text-gray-500 dark:text-[#6a7a7e]">还没有对话记录</p>
                <Link href="/koala/chat" className="text-xs mt-1 inline-block no-underline font-medium text-[#1A1A2E] dark:text-[#D4A843]">
                  开始第一次对话 →
                </Link>
              </div>
            ) : (
              <div className={`divide-y ${DIVIDER_CLS}`}>
                {conversations.map(conv => {
                  const ml = MODE_LABELS[conv.mode];
                  return (
                    <Link key={conv.id} href={`/koala/chat?mode=${conv.mode}`} className="flex items-center gap-3 px-4 no-underline hover:bg-black/[0.02] dark:hover:bg-white/[0.02]" style={{ height: 40 }}>
                      <span className="text-sm">{ml?.emoji ?? '💬'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-gray-900 dark:text-[#e8e4dc]">{ml?.label ?? conv.mode}</p>
                      </div>
                      <span className="text-[10px] text-gray-500 dark:text-[#6a7a7e]">{conv.messageCount}条 · {timeAgo(conv.created_at)}</span>
                      <span className="text-[10px] text-gray-300 dark:text-[#4a5a5e]">→</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recommended professors */}
          <div className={`mx-4 lg:mx-0 mb-3 rounded-xl overflow-hidden ${CARD_CLS}`}>
            <div className={`flex items-center justify-between px-4 py-2.5 border-b ${DIVIDER_CLS}`}>
              <span className="text-xs font-semibold text-gray-900 dark:text-[#e8e4dc]">⭐ 为你推荐</span>
              <button onClick={loadRecommended} disabled={recLoading}
                className="text-[10px] px-2 py-0.5 rounded bg-amber-50 dark:bg-[#D4A843]/10 text-amber-700 dark:text-[#D4A843]"
              >
                {recLoading ? '…' : '🔄 换一批'}
              </button>
            </div>
            {dataLoading ? (
              <div className="px-4 py-4 text-xs text-center text-gray-500 dark:text-[#6a7a7e]">加载中…</div>
            ) : recommended.length === 0 ? (
              <div className="px-4 py-4 text-center">
                <p className="text-xs text-gray-500 dark:text-[#6a7a7e]">完善个人背景后获得个性化推荐</p>
              </div>
            ) : (
              <div className={`divide-y ${DIVIDER_CLS}`}>
                {recommended.slice(0, 4).map(prof => (
                  <div key={prof.id} className="px-4 py-2.5 flex items-center gap-3">
                    <Link href={`/koala/professors/${prof.id}`} className="flex-1 no-underline min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold truncate text-gray-900 dark:text-[#e8e4dc]">{prof.name}</span>
                        <span className="text-[10px] flex-shrink-0 text-gray-500 dark:text-[#6a7a7e]">{prof.university}</span>
                      </div>
                      {prof.research_areas.length > 0 && (
                        <div className="flex gap-1 mt-0.5">
                          {prof.research_areas.slice(0, 2).map(tag => (
                            <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-[#D4A843]/[0.08] text-gray-400 dark:text-[#a89878]">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </Link>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <Link href={`/koala/professors/${prof.id}`} className="text-[10px] px-2 py-1 rounded no-underline bg-amber-50 dark:bg-[#D4A843]/10 text-amber-700 dark:text-[#D4A843]">
                        详情
                      </Link>
                      <Link href={`/koala/chat?professor=${prof.id}`} className="text-[10px] px-2 py-1 rounded no-underline font-medium bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]">
                        套磁
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="mx-4 lg:mx-0 mb-3">
            <Link href="/koala/chat"
              className="block w-full py-3 rounded-xl text-center text-sm font-semibold no-underline bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]"
            >
              🐨 用我的背景匹配教授
            </Link>
          </div>

          {/* Settings */}
          <div className={`mx-4 lg:mx-0 mb-3 rounded-xl overflow-hidden ${CARD_CLS}`}>
            <button onClick={() => setShowSettings(!showSettings)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-transparent"
            >
              <span className="text-xs font-semibold text-gray-900 dark:text-[#e8e4dc]">⚙️ 设置</span>
              <span className="text-[10px] text-gray-500 dark:text-[#6a7a7e]">{showSettings ? '▲' : '▼'}</span>
            </button>
            {showSettings && (
              <div className={`divide-y border-t ${DIVIDER_CLS}`}>
                <div>
                  <button
                    className="w-full flex items-center px-4 py-2.5 text-xs text-left text-gray-500 dark:text-[#a8b8ac] bg-transparent"
                    onClick={() => { setShowPasswordForm(!showPasswordForm); setPwError(''); setPwToast(''); }}
                  >
                    🔒 修改密码 <span className="ml-auto text-[10px] text-gray-400 dark:text-[#6a7a7e]">{showPasswordForm ? '▲' : '▼'}</span>
                  </button>
                  {showPasswordForm && (
                    <div className="px-4 pb-3 space-y-2">
                      <input
                        type="password"
                        placeholder="当前密码"
                        value={pwCurrent}
                        onChange={e => setPwCurrent(e.target.value)}
                        className={`${INPUT_CLS} rounded-lg py-2 text-xs`}
                      />
                      <input
                        type="password"
                        placeholder="新密码（至少8位，包含字母和数字）"
                        value={pwNew}
                        onChange={e => setPwNew(e.target.value)}
                        className={`${INPUT_CLS} rounded-lg py-2 text-xs`}
                      />
                      <input
                        type="password"
                        placeholder="确认新密码"
                        value={pwConfirm}
                        onChange={e => setPwConfirm(e.target.value)}
                        className={`${INPUT_CLS} rounded-lg py-2 text-xs`}
                      />
                      {pwError && <p className="text-[11px] px-1 text-[#b06040]">{pwError}</p>}
                      {pwToast && <p className="text-[11px] px-1 text-[#5a8060]">{pwToast}</p>}
                      <button
                        disabled={pwLoading}
                        className="w-full py-2 rounded-lg text-xs font-medium disabled:opacity-50 bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]"
                        onClick={async () => {
                          setPwError('');
                          setPwToast('');
                          if (!pwCurrent) { setPwError('请输入当前密码'); return; }
                          if (pwNew.length < 8 || !/[a-zA-Z]/.test(pwNew) || !/\d/.test(pwNew)) {
                            setPwError('新密码至少8位，且需包含字母和数字'); return;
                          }
                          if (pwNew !== pwConfirm) { setPwError('两次输入的密码不一致'); return; }
                          setPwLoading(true);
                          const { error: signInErr } = await supabase.auth.signInWithPassword({
                            email: user?.email || '',
                            password: pwCurrent,
                          });
                          if (signInErr) { setPwLoading(false); setPwError('当前密码错误'); return; }
                          const { error: updateErr } = await supabase.auth.updateUser({ password: pwNew });
                          setPwLoading(false);
                          if (updateErr) { setPwError(updateErr.message); return; }
                          setPwToast('✅ 密码已修改');
                          setPwCurrent(''); setPwNew(''); setPwConfirm('');
                          setTimeout(() => { setShowPasswordForm(false); setPwToast(''); }, 1500);
                        }}
                      >
                        {pwLoading ? '修改中…' : '确认修改'}
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs text-gray-500 dark:text-[#a8b8ac]">🎨 主题</span>
                  <div className="flex rounded-full overflow-hidden border border-gray-200 dark:border-[#D4A843]/20">
                    {([['light', '☀️'], ['dark', '🌙'], ['system', '💻']] as const).map(([val, icon]) => (
                      <button
                        key={val}
                        onClick={() => setTheme(val)}
                        className={`px-3 py-1 text-[11px] transition-colors ${
                          theme === val
                            ? 'bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10] font-medium'
                            : 'text-gray-500 dark:text-[#6a7a7e] hover:bg-gray-100 dark:hover:bg-white/5'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Gmail connection */}
                <div className="px-4 py-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-[#a8b8ac]">📧 Gmail 连接</span>
                    {gmailConnected ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-[#5a8060] dark:text-green-400 flex items-center gap-1">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#5a8060] dark:bg-green-400" />
                          {gmailAddress}
                        </span>
                        <button
                          disabled={gmailDisconnecting}
                          onClick={async () => {
                            setGmailDisconnecting(true);
                            try {
                              await fetch('/api/user/gmail/disconnect', { method: 'POST' });
                              setGmailConnected(false);
                              setGmailAddress(null);
                              setGmailToast('Gmail 已断开');
                              setTimeout(() => setGmailToast(null), 3000);
                            } catch {}
                            setGmailDisconnecting(false);
                          }}
                          className="text-[10px] px-2 py-0.5 rounded border border-gray-200 dark:border-white/10 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-500/20 transition-colors"
                        >
                          {gmailDisconnecting ? '断开中…' : '断开'}
                        </button>
                      </div>
                    ) : (
                      <a
                        href="/api/auth/gmail/connect"
                        className="text-[11px] font-medium px-3 py-1 rounded-full bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10] no-underline"
                      >
                        连接 Gmail
                      </a>
                    )}
                  </div>
                  {gmailToast && (
                    <p className={`text-[11px] mt-1.5 ${gmailToast.includes('失败') ? 'text-[#b06040]' : 'text-[#5a8060]'}`}>
                      {gmailToast}
                    </p>
                  )}
                </div>
                <Link href="/koala/my-profile/academic" className="flex items-center px-4 py-2.5 text-xs no-underline text-gray-500 dark:text-[#a8b8ac]">
                  🎓 学术档案
                </Link>
                <Link href="/koala/my-profile/memories" className="flex items-center px-4 py-2.5 text-xs no-underline text-gray-500 dark:text-[#a8b8ac]">
                  🧠 Ola 的记忆
                </Link>
                <Link href="/koala/tools" className="flex items-center px-4 py-2.5 text-xs no-underline text-gray-500 dark:text-[#a8b8ac]">
                  🔧 更多工具
                </Link>
                {profile?.role && ['admin', 'sales', 'super_admin'].includes(profile.role) && (
                  <Link
                    href={profile.role === 'sales' ? '/dashboard/sales' : '/dashboard/koala'}
                    className="flex items-center justify-between px-4 py-2.5 text-xs no-underline text-[#1A1A2E] dark:text-[#D4A843]"
                  >
                    <span>🖥️ 进入后台管理</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-[#D4A843]/12 text-amber-700 dark:text-[#D4A843]">
                      {profile.role === 'super_admin' ? 'Super Admin' : profile.role === 'admin' ? 'Admin' : 'Sales'}
                    </span>
                  </Link>
                )}
                {userRole !== 'super_admin' && (
                  <button
                    className="w-full flex items-center px-4 py-2.5 text-xs text-left text-gray-500 dark:text-[#a8b8ac] bg-transparent"
                    onClick={() => {
                      if (userRole === 'admin') setRoleApplyRole('sales');
                      else setRoleApplyRole('admin');
                      setShowRoleApply(true);
                    }}
                  >
                    👔 申请角色（管理员/销售）
                  </button>
                )}
                <button
                  className="w-full flex items-center px-4 py-2.5 text-xs text-left text-red-500 dark:text-[#b06040] bg-transparent"
                  onClick={handleSignOut}
                >
                  🚪 退出登录
                </button>
              </div>
            )}
          </div>

        </div>{/* end right column */}
      </div>{/* end two-col layout */}

      {/* Role Application Modal */}
      {showRoleApply && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={() => setShowRoleApply(false)}>
          <div className="w-full max-w-sm rounded-2xl p-6 bg-white dark:bg-[#0F1419] border border-gray-200 dark:border-[#D4A843]/15" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold mb-4 text-gray-900 dark:text-[#e8e4dc]">申请角色</h3>
                <div className="flex gap-2 mb-3">
                  {(['admin', 'sales'] as const).map(r => {
                    const isCurrentRole = userRole === r || userRole === 'super_admin';
                    const label = r === 'admin' ? '管理员' : '销售';
                    if (isCurrentRole) {
                      return (
                        <button
                          key={r}
                          disabled
                          className="flex-1 py-2 rounded-lg text-xs font-medium opacity-60 cursor-not-allowed bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-[#6a7a7e] border border-gray-200 dark:border-white/[0.06]"
                        >
                          ✅ 当前角色：{label}
                        </button>
                      );
                    }
                    return (
                      <button
                        key={r}
                        onClick={() => setRoleApplyRole(r)}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium transition border ${
                          roleApplyRole === r
                            ? 'bg-amber-50 dark:bg-[#D4A843]/15 text-amber-700 dark:text-[#D4A843] border-amber-300 dark:border-[#D4A843]/30'
                            : 'bg-transparent text-gray-500 dark:text-[#6a7a7e] border-gray-200 dark:border-[#D4A843]/[0.08]'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="tel"
                  placeholder="联系电话（选填）"
                  value={roleApplyPhone}
                  onChange={e => setRoleApplyPhone(e.target.value)}
                  className={`w-full rounded-lg px-3 py-2 text-xs mb-3 focus:outline-none ${INPUT_CLS}`}
                />
                <textarea
                  placeholder="申请理由（至少10字）"
                  value={roleApplyReason}
                  onChange={e => setRoleApplyReason(e.target.value)}
                  rows={3}
                  className={`w-full rounded-lg px-3 py-2 text-xs mb-3 focus:outline-none resize-none ${INPUT_CLS}`}
                />
                <div className="flex gap-2">
                  <button onClick={() => setShowRoleApply(false)} className="flex-1 py-2 rounded-lg text-xs text-gray-500 dark:text-[#6a7a7e] border border-gray-200 dark:border-[#D4A843]/10 bg-transparent">取消</button>
                  <button
                    disabled={roleApplyLoading || roleApplyReason.length < 10}
                    onClick={async () => {
                      setRoleApplyLoading(true);
                      try {
                        const res = await fetch('/api/user/role-application', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ role: roleApplyRole, reason: roleApplyReason, phone: roleApplyPhone }),
                        });
                        const d = await res.json();
                        if (!res.ok) {
                          const errMsg = d.error || '提交失败';
                          setRoleToast({ msg: `❌ ${errMsg}`, ok: false });
                        } else {
                          setShowRoleApply(false);
                          setRoleApplyReason('');
                          setRoleApplyPhone('');
                          setRoleApplyStatus(null);
                          setRoleToast({ msg: '✅ 申请已提交，请等待管理员审核', ok: true });
                        }
                      } catch (err) {
                        console.error('[role-application submit]', err);
                        setRoleToast({ msg: '❌ 网络错误，请稍后重试', ok: false });
                      }
                      setRoleApplyLoading(false);
                    }}
                    className="flex-1 py-2 rounded-lg text-xs font-medium disabled:opacity-50 bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]"
                  >
                    {roleApplyLoading ? '提交中…' : '提交申请'}
                  </button>
                </div>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-center mt-4 mb-2 px-4 text-[9px] text-gray-400 dark:text-[#6a7a7e]">
        你的个人信息仅用于 AI 推荐优化，不会与第三方共享。
      </p>

      {/* Role application toast */}
      {roleToast && (
        <div
          className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-xl text-xs font-medium shadow-lg animate-fade-in border cursor-pointer ${
            roleToast.ok
              ? 'bg-green-950 dark:bg-[#1a2e1a] text-green-400 dark:text-[#7ddf7d] border-green-800 dark:border-[rgba(90,128,96,0.3)]'
              : 'bg-red-950 dark:bg-[#2e1a1a] text-red-400 dark:text-[#df7d7d] border-red-800 dark:border-[rgba(176,96,64,0.3)]'
          }`}
          onClick={() => setRoleToast(null)}
        >
          {roleToast.msg}
        </div>
      )}

      {/* ── Credit History Modal ──────────────────────── */}
      {showCreditModal && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
          onClick={() => setShowCreditModal(false)}
        >
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="relative w-full md:max-w-md max-h-[70vh] flex flex-col rounded-t-2xl md:rounded-2xl bg-white dark:bg-[#1a2332] shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-[#D4A843]/[0.08]">
              <span className="text-sm font-semibold text-gray-900 dark:text-[#e8e4dc]">💰 积分明细</span>
              <button
                onClick={() => setShowCreditModal(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 dark:text-[#6a7a7e] hover:bg-gray-100 dark:hover:bg-white/5 bg-transparent"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {creditTxs.length === 0 ? (
                <div className="px-4 py-12 text-xs text-center text-gray-500 dark:text-[#6a7a7e]">暂无积分记录</div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-[#D4A843]/[0.06]">
                  {creditTxs.map(tx => {
                    const d = new Date(tx.created_at);
                    const timeStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                    const isPositive = tx.amount >= 0;
                    const badgeMap: Record<string, { label: string; cls: string }> = {
                      earn_daily:          { label: '签到',     cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
                      daily_checkin:       { label: '签到',     cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
                      profile_complete:    { label: '完善资料', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
                      earn_achievement:    { label: '成就奖励', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
                      earn_referral:       { label: '邀请好友', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
                      referral_bonus:      { label: '邀请好友', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
                      referral:            { label: '邀请好友', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
                      purchase:            { label: '购买',     cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
                      subscription_credit: { label: '订阅',     cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
                      upgrade_credit:      { label: '升级奖励', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
                      spend:               { label: '消耗',     cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
                      admin_adjust:        { label: '管理员调整', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' },
                    };
                    const badge = badgeMap[tx.type] ?? { label: tx.type, cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700/30 dark:text-gray-300' };
                    return (
                      <div key={tx.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-[10px] flex-shrink-0 text-gray-400 dark:text-[#6a7a7e] w-[90px]">{timeStr}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 ${badge.cls}`}>{badge.label}</span>
                          <span className="text-[11px] truncate text-gray-600 dark:text-[#a8b8ac]">{tx.description}</span>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className={`text-xs font-semibold ${isPositive ? 'text-[#5a8060]' : 'text-[#b06040]'}`}>
                            {isPositive ? '+' : ''}{tx.amount}
                          </span>
                          <span className="text-[10px] text-gray-400 dark:text-[#6a7a7e] w-[32px] text-right">{tx.balance_after}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      </div>{/* end max-w-5xl */}
    </div>
  );
}
