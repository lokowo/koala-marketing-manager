'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, type UserProfile } from '../components/AuthContext';

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
  source: string;
  source_document_id: string | null;
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
  source: string;
  source_document_id: string | null;
  created_at: string;
}

interface DocumentEntry {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
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
      <circle cx={cx} cy={cy} r={r} stroke="rgba(201,169,110,0.1)" strokeWidth="5" fill="none" />
      <circle
        cx={cx} cy={cy} r={r}
        stroke={pct >= 80 ? '#5a8060' : pct >= 50 ? '#c9a96e' : '#b06040'}
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
  free:    { label: '免费版', bg: 'rgba(201,169,110,0.1)', color: '#c9a96e' },
  starter: { label: 'Starter', bg: '#d4e8d8', color: '#3a6040' },
  pro:     { label: 'Pro ✦', bg: '#f4e4b8', color: '#8a6030' },
  elite:   { label: 'Elite ✦✦', bg: '#f8d8d0', color: '#8a3020' },
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  draft:    { label: '草稿', color: '#6a7a7e' },
  copied:   { label: '已复制', color: '#c9a96e' },
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

// ─────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────

export default function MyProfilePage() {
  const { user, profile, authLoading, showLogin, signOut, refreshProfile } = useAuth();
  const router = useRouter();

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
  const [showRoleApply, setShowRoleApply] = useState(false);
  const [roleApplyRole, setRoleApplyRole] = useState<'admin' | 'sales'>('admin');
  const [roleApplyReason, setRoleApplyReason] = useState('');
  const [roleApplyPhone, setRoleApplyPhone] = useState('');
  const [roleApplyLoading, setRoleApplyLoading] = useState(false);
  const [roleApplyStatus, setRoleApplyStatus] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

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
  const [showCreditsDetail, setShowCreditsDetail] = useState(false);
  const [showCreditRules, setShowCreditRules] = useState(false);
  const [referralCopied, setReferralCopied] = useState(false);
  const [inviteText, setInviteText] = useState('');
  const [referralStats, setReferralStats] = useState({ invited: 0, maxInvites: 3, earned: 0 });
  const [inviteCopied, setInviteCopied] = useState(false);

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
    if (!user) return;
    setDataLoading(true);
    fetch('/api/admin/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.role) setIsAdmin(true); })
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
        <h1 className="text-lg font-bold mb-2" style={{ color: '#e8e4dc' }}>登录后查看个人中心</h1>
        <p className="text-sm mb-6 leading-relaxed" style={{ color: '#6a7a7e' }}>
          保存你的背景信息，收藏心仪教授，<br />查看申请信历史
        </p>
        <button
          onClick={() => showLogin()}
          className="w-full max-w-xs py-3 rounded-full text-sm font-semibold text-white mb-3"
          style={{ background: '#c9a96e' }}
        >
          登录 / 注册
        </button>
        <Link href="/koala/home" className="text-xs" style={{ color: '#6a7a7e' }}>
          先逛逛 →
        </Link>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="animate-pulse text-sm" style={{ color: '#6a7a7e' }}>加载中…</div>
      </div>
    );
  }

  const pct = profile ? calcCompleteness(profile, education.length, work.length, documents.length) : 0;
  const plan = PLAN_CONFIG[profile?.plan_type ?? 'free'];
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
      if (eduEditing === 'new') {
        await fetch('/api/user/education', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eduForm),
        });
      } else {
        await fetch('/api/user/education', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: eduEditing, ...eduForm }),
        });
      }
      loadEducation();
      setEduEditing(null);
    } catch {}
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
      if (workEditing === 'new') {
        await fetch('/api/user/work', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(workForm),
        });
      } else {
        await fetch('/api/user/work', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: workEditing, ...workForm }),
        });
      }
      loadWork();
      setWorkEditing(null);
    } catch {}
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
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/user/documents', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Upload failed');
      loadDocuments();
    } catch (e) {
      console.error('Document upload failed:', e);
    }
    setDocUploading(false);
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

  const CARD = { background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.08)' } as const;
  const DIVIDER = '1px solid rgba(201,169,110,0.08)';

  const otherInfoRows = [
    { label: '目标方向', value: profile?.target_field },
    { label: '目标学校', value: (profile?.target_universities ?? []).join(', ') || null },
    { label: '英语水平', value: profile?.english_level },
    { label: '科研经历', value: profile?.has_research_experience ? (profile.research_description || '有') : null },
    { label: '论文发表', value: profile?.has_publications ? (profile.publication_details || '有') : null },
  ];

  // ── Education form inline component ───────
  function renderEduForm() {
    return (
      <div className="px-4 py-3 space-y-2" style={{ borderTop: DIVIDER }}>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] mb-0.5" style={{ color: '#6a7a7e' }}>学校 *</label>
            <input type="text" placeholder="例：浙江大学" value={eduForm.school}
              onChange={e => setEduForm(p => ({ ...p, school: e.target.value }))}
              className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,169,110,0.08)', color: '#e8e4dc' }}
            />
          </div>
          <div>
            <label className="block text-[10px] mb-0.5" style={{ color: '#6a7a7e' }}>专业</label>
            <input type="text" placeholder="例：计算机科学" value={eduForm.major}
              onChange={e => setEduForm(p => ({ ...p, major: e.target.value }))}
              className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,169,110,0.08)', color: '#e8e4dc' }}
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-[10px] mb-0.5" style={{ color: '#6a7a7e' }}>学历</label>
            <select value={eduForm.degree}
              onChange={e => setEduForm(p => ({ ...p, degree: e.target.value }))}
              className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,169,110,0.08)', color: '#e8e4dc' }}
            >
              <option value="">请选择</option>
              {DEGREE_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] mb-0.5" style={{ color: '#6a7a7e' }}>GPA</label>
            <input type="text" placeholder="3.8" value={eduForm.gpa}
              onChange={e => setEduForm(p => ({ ...p, gpa: e.target.value }))}
              className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,169,110,0.08)', color: '#e8e4dc' }}
            />
          </div>
          <div>
            <label className="block text-[10px] mb-0.5" style={{ color: '#6a7a7e' }}>满分</label>
            <select value={eduForm.gpa_scale}
              onChange={e => setEduForm(p => ({ ...p, gpa_scale: e.target.value }))}
              className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,169,110,0.08)', color: '#e8e4dc' }}
            >
              <option value="">—</option>
              {['4.0', '5.0', '7.0', '100'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] mb-0.5" style={{ color: '#6a7a7e' }}>开始</label>
            <input type="text" placeholder="2020-09" value={eduForm.start_date}
              onChange={e => setEduForm(p => ({ ...p, start_date: e.target.value }))}
              className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,169,110,0.08)', color: '#e8e4dc' }}
            />
          </div>
          <div>
            <label className="block text-[10px] mb-0.5" style={{ color: '#6a7a7e' }}>
              结束
              <label className="ml-2 inline-flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={eduForm.is_current}
                  onChange={e => setEduForm(p => ({ ...p, is_current: e.target.checked, end_date: e.target.checked ? '' : p.end_date }))}
                  className="rounded"
                />
                <span className="text-[10px]" style={{ color: '#a8b8ac' }}>至今</span>
              </label>
            </label>
            <input type="text" placeholder="2024-06" value={eduForm.end_date}
              disabled={eduForm.is_current}
              onChange={e => setEduForm(p => ({ ...p, end_date: e.target.value }))}
              className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,169,110,0.08)', color: eduForm.is_current ? '#4a5a5e' : '#e8e4dc' }}
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] mb-0.5" style={{ color: '#6a7a7e' }}>备注</label>
          <input type="text" placeholder="相关课程、荣誉等" value={eduForm.description}
            onChange={e => setEduForm(p => ({ ...p, description: e.target.value }))}
            className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,169,110,0.08)', color: '#e8e4dc' }}
          />
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={saveEducation} disabled={eduSaving || !eduForm.school.trim()}
            className="text-[11px] px-3 py-1 rounded-lg font-semibold text-white"
            style={{ background: eduSaving ? '#d8c8a8' : '#c9a96e' }}
          >
            {eduSaving ? '保存中…' : '保存'}
          </button>
          <button onClick={() => setEduEditing(null)}
            className="text-[11px] px-3 py-1 rounded-lg"
            style={{ background: 'rgba(201,169,110,0.1)', color: '#c9a96e' }}
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
      <div className="px-4 py-3 space-y-2" style={{ borderTop: DIVIDER }}>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] mb-0.5" style={{ color: '#6a7a7e' }}>公司/机构 *</label>
            <input type="text" placeholder="例：字节跳动" value={workForm.company}
              onChange={e => setWorkForm(p => ({ ...p, company: e.target.value }))}
              className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,169,110,0.08)', color: '#e8e4dc' }}
            />
          </div>
          <div>
            <label className="block text-[10px] mb-0.5" style={{ color: '#6a7a7e' }}>职位</label>
            <input type="text" placeholder="例：研究实习生" value={workForm.position}
              onChange={e => setWorkForm(p => ({ ...p, position: e.target.value }))}
              className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,169,110,0.08)', color: '#e8e4dc' }}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] mb-0.5" style={{ color: '#6a7a7e' }}>开始</label>
            <input type="text" placeholder="2023-06" value={workForm.start_date}
              onChange={e => setWorkForm(p => ({ ...p, start_date: e.target.value }))}
              className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,169,110,0.08)', color: '#e8e4dc' }}
            />
          </div>
          <div>
            <label className="block text-[10px] mb-0.5" style={{ color: '#6a7a7e' }}>
              结束
              <label className="ml-2 inline-flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={workForm.is_current}
                  onChange={e => setWorkForm(p => ({ ...p, is_current: e.target.checked, end_date: e.target.checked ? '' : p.end_date }))}
                  className="rounded"
                />
                <span className="text-[10px]" style={{ color: '#a8b8ac' }}>至今</span>
              </label>
            </label>
            <input type="text" placeholder="2024-01" value={workForm.end_date}
              disabled={workForm.is_current}
              onChange={e => setWorkForm(p => ({ ...p, end_date: e.target.value }))}
              className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,169,110,0.08)', color: workForm.is_current ? '#4a5a5e' : '#e8e4dc' }}
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] mb-0.5" style={{ color: '#6a7a7e' }}>工作描述</label>
          <input type="text" placeholder="简述职责、成就…" value={workForm.description}
            onChange={e => setWorkForm(p => ({ ...p, description: e.target.value }))}
            className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,169,110,0.08)', color: '#e8e4dc' }}
          />
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={saveWork} disabled={workSaving || !workForm.company.trim()}
            className="text-[11px] px-3 py-1 rounded-lg font-semibold text-white"
            style={{ background: workSaving ? '#d8c8a8' : '#c9a96e' }}
          >
            {workSaving ? '保存中…' : '保存'}
          </button>
          <button onClick={() => setWorkEditing(null)}
            className="text-[11px] px-3 py-1 rounded-lg"
            style={{ background: 'rgba(201,169,110,0.1)', color: '#c9a96e' }}
          >
            取消
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-6 lg:pb-12" style={{ background: '#080c10' }}>
      <div className="max-w-5xl mx-auto">

      {/* ── Profile Header ──────────────────── */}
      <div className="mx-4 lg:mx-0 pt-4 pb-3">
        <div className="rounded-xl p-5" style={CARD}>
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative cursor-pointer group flex-shrink-0" onClick={() => !avatarUploading && avatarFileRef.current?.click()}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="rounded-full object-cover" style={{ width: 72, height: 72 }} />
              ) : (
                <div className="rounded-full flex items-center justify-center text-2xl font-bold" style={{ width: 72, height: 72, background: '#c9a96e', color: '#080c10' }}>
                  {initials}
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {avatarUploading ? (
                  <span className="text-white text-xs animate-pulse">上传中…</span>
                ) : (
                  <span className="text-white text-xs">📷 更换</span>
                )}
              </div>
              <input ref={avatarFileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold truncate" style={{ color: '#e8e4dc' }}>
                  {displayName}
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                  style={{ background: plan.bg, color: plan.color }}
                >
                  {plan.label}
                </span>
              </div>
              <p className="text-xs truncate mt-0.5" style={{ color: '#6a7a7e' }}>{user?.email}</p>
              {isAdmin && (
                <Link href="/dashboard" className="text-[10px] no-underline mt-0.5 inline-block" style={{ color: '#c9a96e' }}>
                  ⚙️ 超级管理后台 →
                </Link>
              )}
              <div className="flex items-center gap-2 mt-1.5 text-[10px]" style={{ color: '#6a7a7e' }}>
                <span>{education.length} 段教育</span>
                <span>·</span>
                <span>{work.length} 段工作</span>
                <span>·</span>
                <span>{documents.length} 份文件</span>
              </div>
            </div>
            {/* Completeness arc */}
            <div className="relative flex-shrink-0" style={{ width: 40, height: 40 }}>
              <ArcProgress pct={pct} size={40} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-bold" style={{ color: '#e8e4dc' }}>{pct}%</span>
              </div>
            </div>
            {/* Edit button */}
            <button
              onClick={() => {
                setOtherEditing(true);
                setOtherData(profile ? profileToOther(profile) : profileToOther({} as UserProfile));
              }}
              className="text-[11px] px-3 py-1.5 rounded-lg flex-shrink-0"
              style={{ background: 'rgba(201,169,110,0.1)', color: '#c9a96e' }}
            >
              编辑资料
            </button>
          </div>
          {/* Avatar toast */}
          {avatarMsg && (
            <p className="text-[11px] mt-2 text-center" style={{ color: avatarMsg.includes('已更新') ? '#5a8060' : '#b06040' }}>
              {avatarMsg.includes('已更新') ? '✅' : '❌'} {avatarMsg}
            </p>
          )}
        </div>
      </div>

      {/* ── Credits card ────────────────────── */}
      <div className="mx-4 lg:mx-0 pb-3">
        <div className="rounded-xl p-4" style={CARD}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold" style={{ color: '#c9a96e' }}>
                💎 {creditBalance ?? profile?.credits_remaining ?? 0}
              </span>
              <span className="text-xs" style={{ color: '#6a7a7e' }}>积分</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCheckin}
                disabled={todayClaimed || checkinLoading}
                className="text-[11px] px-3 py-1.5 rounded-lg font-medium"
                style={todayClaimed
                  ? { background: 'rgba(90,128,96,0.12)', color: '#5a8060' }
                  : { background: '#c9a96e', color: '#080c10' }
                }
              >
                {checkinLoading ? '…' : todayClaimed ? '✅ 已签到' : '每日签到 +2'}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => setShowCreditRules(!showCreditRules)}
              className="text-[10px]" style={{ color: '#6a7a7e', background: 'transparent' }}
            >
              📋 积分规则 {showCreditRules ? '▲' : '▼'}
            </button>
            <button
              onClick={() => setShowCreditsDetail(!showCreditsDetail)}
              className="text-[10px]" style={{ color: '#c9a96e', background: 'transparent' }}
            >
              查看积分明细 →
            </button>
          </div>
          {showCreditRules && (
            <div className="mt-2 p-3 rounded-lg text-[10px] leading-relaxed" style={{ background: 'rgba(0,0,0,0.2)', color: '#6a7a7e' }}>
              <p className="font-semibold mb-1" style={{ color: '#a8b8ac' }}>消耗积分</p>
              <p>生成套磁信 5 · 教授匹配 2 · AI 对话 1 · 选校规划 3 · 文书润色 5 · 简历解析 免费</p>
              <p className="font-semibold mt-2 mb-1" style={{ color: '#a8b8ac' }}>获取积分</p>
              <p>每日签到 +2 · 完善资料80% +20 · 上传简历 +10 · 邀请好友 +15/人 · 收藏教授 +5 · 首封套磁信 +10</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Invite card ──────────────────────── */}
      {referralCode && (
        <div className="mx-4 lg:mx-0 mb-3 rounded-xl p-4" style={CARD}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold" style={{ color: '#e8e4dc' }}>📨 邀请好友，各得 15 积分</span>
            {referralStats.invited >= 3 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(90,128,96,0.12)', color: '#5a8060' }}>🎉 已满</span>
            )}
          </div>
          <p className="text-[10px] mb-3" style={{ color: '#6a7a7e' }}>每个邀请码最多邀请 3 位好友</p>

          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px]" style={{ color: '#a8b8ac' }}>你的邀请码：</span>
            <span className="text-sm font-bold tracking-wider" style={{ color: '#c9a96e', fontFamily: 'monospace' }}>{referralCode}</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(referralCode);
                setReferralCopied(true);
                setTimeout(() => setReferralCopied(false), 2000);
              }}
              disabled={referralStats.invited >= 3}
              className="text-[10px] px-2 py-0.5 rounded"
              style={{ background: 'rgba(201,169,110,0.1)', color: referralStats.invited >= 3 ? '#4a5a5e' : '#c9a96e' }}
            >
              {referralCopied ? '✅ 已复制' : '复制码'}
            </button>
          </div>

          <textarea
            value={inviteText}
            onChange={e => setInviteText(e.target.value)}
            rows={5}
            disabled={referralStats.invited >= 3}
            className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none mb-3"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,169,110,0.08)', color: '#e8e4dc', lineHeight: 1.6 }}
          />

          <div className="flex gap-2 mb-3">
            <button
              onClick={() => {
                navigator.clipboard.writeText(inviteText);
                setInviteCopied(true);
                setTimeout(() => setInviteCopied(false), 2500);
              }}
              disabled={referralStats.invited >= 3}
              className="flex-1 text-[11px] py-2 rounded-lg font-medium"
              style={referralStats.invited >= 3
                ? { background: 'rgba(201,169,110,0.06)', color: '#4a5a5e' }
                : { background: '#c9a96e', color: '#080c10' }
              }
            >
              {inviteCopied ? '✅ 已复制，去分享给朋友吧！' : '一键复制邀请文案'}
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(inviteText);
                setInviteCopied(true);
                setTimeout(() => setInviteCopied(false), 2500);
              }}
              disabled={referralStats.invited >= 3}
              className="flex-1 text-[11px] py-2 rounded-lg font-medium"
              style={{ background: 'rgba(90,128,96,0.12)', color: referralStats.invited >= 3 ? '#4a5a5e' : '#5a8060' }}
            >
              {inviteCopied ? '✅ 已复制，请打开微信粘贴发送给朋友' : '分享到微信'}
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px]" style={{ color: '#6a7a7e' }}>
            <span>已邀请 {referralStats.invited}/{referralStats.maxInvites} 人 · 获得 {referralStats.earned} 积分</span>
            {referralStats.invited >= 3 && <span style={{ color: '#5a8060' }}>🎉 邀请名额已用完</span>}
          </div>
        </div>
      )}

      {/* ── Two-col layout ──────────────────── */}
      <div className="lg:flex lg:gap-3 lg:items-start lg:px-0">
        {/* ── Left column ── */}
        <div className="lg:w-[380px] lg:flex-shrink-0">

          {/* ── Education history ─────────────── */}
          <div className="mx-4 lg:mx-0 mb-3 rounded-xl overflow-hidden" style={CARD}>
            <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: DIVIDER }}>
              <span className="text-xs font-semibold" style={{ color: '#e8e4dc' }}>
                🎓 教育经历 <span className="font-normal" style={{ color: '#6a7a7e' }}>({education.length})</span>
              </span>
              <button
                onClick={() => { setEduEditing('new'); setEduForm(emptyEdu); }}
                className="text-[10px] px-2 py-0.5 rounded"
                style={{ background: 'rgba(201,169,110,0.1)', color: '#c9a96e' }}
              >
                + 添加
              </button>
            </div>

            {dataLoading ? (
              <div className="px-4 py-4 text-xs text-center" style={{ color: '#6a7a7e' }}>加载中…</div>
            ) : education.length === 0 && eduEditing !== 'new' ? (
              <div className="px-4 py-4 text-center">
                <p className="text-xs" style={{ color: '#6a7a7e' }}>还没有教育经历</p>
                <button onClick={() => { setEduEditing('new'); setEduForm(emptyEdu); }}
                  className="text-xs mt-1 font-medium" style={{ color: '#c9a96e', background: 'transparent' }}
                >
                  添加第一段教育经历 →
                </button>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'rgba(201,169,110,0.05)' }}>
                {education.map(edu => (
                  eduEditing === edu.id ? (
                    <div key={edu.id}>{renderEduForm()}</div>
                  ) : (
                    <div key={edu.id} className="px-4 py-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold" style={{ color: '#e8e4dc' }}>{edu.school}</span>
                            {edu.degree && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(201,169,110,0.08)', color: '#a89878' }}>
                                {edu.degree}
                              </span>
                            )}
                            {edu.source === 'ai_parsed' && (
                              <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: 'rgba(90,128,96,0.15)', color: '#5a8060' }}>
                                AI
                              </span>
                            )}
                          </div>
                          {edu.major && <p className="text-[11px] mt-0.5" style={{ color: '#6a7a7e' }}>{edu.major}</p>}
                          <div className="flex items-center gap-2 mt-0.5 text-[10px]" style={{ color: '#5a6a6e' }}>
                            {(edu.start_date || edu.end_date) && (
                              <span>{edu.start_date ?? '?'} – {edu.is_current ? '至今' : (edu.end_date ?? '?')}</span>
                            )}
                            {edu.gpa && <span>GPA {edu.gpa}{edu.gpa_scale ? `/${edu.gpa_scale}` : ''}</span>}
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => { setEduEditing(edu.id); setEduForm(eduToForm(edu)); }}
                            className="text-[10px] px-2 py-0.5 rounded"
                            style={{ background: 'rgba(201,169,110,0.1)', color: '#c9a96e' }}
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => deleteEducation(edu.id)}
                            className="text-[10px] px-2 py-0.5 rounded"
                            style={{ background: 'rgba(176,96,64,0.12)', color: '#b06040' }}
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
          <div className="mx-4 lg:mx-0 mb-3 rounded-xl overflow-hidden" style={CARD}>
            <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: DIVIDER }}>
              <span className="text-xs font-semibold" style={{ color: '#e8e4dc' }}>
                💼 工作/实习经历 <span className="font-normal" style={{ color: '#6a7a7e' }}>({work.length})</span>
              </span>
              <button
                onClick={() => { setWorkEditing('new'); setWorkForm(emptyWork); }}
                className="text-[10px] px-2 py-0.5 rounded"
                style={{ background: 'rgba(201,169,110,0.1)', color: '#c9a96e' }}
              >
                + 添加
              </button>
            </div>

            {dataLoading ? (
              <div className="px-4 py-4 text-xs text-center" style={{ color: '#6a7a7e' }}>加载中…</div>
            ) : work.length === 0 && workEditing !== 'new' ? (
              <div className="px-4 py-4 text-center">
                <p className="text-xs" style={{ color: '#6a7a7e' }}>还没有工作/实习经历</p>
                <button onClick={() => { setWorkEditing('new'); setWorkForm(emptyWork); }}
                  className="text-xs mt-1 font-medium" style={{ color: '#c9a96e', background: 'transparent' }}
                >
                  添加第一段经历 →
                </button>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'rgba(201,169,110,0.05)' }}>
                {work.map(w => (
                  workEditing === w.id ? (
                    <div key={w.id}>{renderWorkForm()}</div>
                  ) : (
                    <div key={w.id} className="px-4 py-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold" style={{ color: '#e8e4dc' }}>{w.company}</span>
                            {w.source === 'ai_parsed' && (
                              <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: 'rgba(90,128,96,0.15)', color: '#5a8060' }}>
                                AI
                              </span>
                            )}
                          </div>
                          {w.position && <p className="text-[11px] mt-0.5" style={{ color: '#6a7a7e' }}>{w.position}</p>}
                          {(w.start_date || w.end_date) && (
                            <p className="text-[10px] mt-0.5" style={{ color: '#5a6a6e' }}>
                              {w.start_date ?? '?'} – {w.is_current ? '至今' : (w.end_date ?? '?')}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => { setWorkEditing(w.id); setWorkForm(workToForm(w)); }}
                            className="text-[10px] px-2 py-0.5 rounded"
                            style={{ background: 'rgba(201,169,110,0.1)', color: '#c9a96e' }}
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => deleteWork(w.id)}
                            className="text-[10px] px-2 py-0.5 rounded"
                            style={{ background: 'rgba(176,96,64,0.12)', color: '#b06040' }}
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
          <div className="mx-4 lg:mx-0 mb-3 rounded-xl overflow-hidden" style={CARD}>
            <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: DIVIDER }}>
              <span className="text-xs font-semibold" style={{ color: '#e8e4dc' }}>
                📄 文件管理 <span className="font-normal" style={{ color: '#6a7a7e' }}>({documents.length})</span>
              </span>
              <button
                onClick={() => !docUploading && docFileRef.current?.click()}
                disabled={docUploading}
                className="text-[10px] px-2 py-0.5 rounded"
                style={{ background: 'rgba(201,169,110,0.1)', color: '#c9a96e' }}
              >
                {docUploading ? '上传中…' : '+ 上传'}
              </button>
              <input ref={docFileRef} type="file" accept=".pdf,image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleDocUpload(f); }}
              />
            </div>

            {dataLoading ? (
              <div className="px-4 py-4 text-xs text-center" style={{ color: '#6a7a7e' }}>加载中…</div>
            ) : documents.length === 0 ? (
              <div className="px-4 py-4 text-center">
                <p className="text-xs" style={{ color: '#6a7a7e' }}>上传简历、成绩单或学历证明</p>
                <p className="text-[10px] mt-1" style={{ color: '#5a6a6e' }}>AI 自动解析，填充教育和工作经历</p>
                <button
                  onClick={() => !docUploading && docFileRef.current?.click()}
                  className="mt-2 text-xs font-medium"
                  style={{ color: '#c9a96e', background: 'transparent' }}
                >
                  📎 上传第一份文件 →
                </button>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'rgba(201,169,110,0.05)' }}>
                {documents.map(doc => {
                  const parseColor = doc.parse_status === 'done' ? '#5a8060'
                    : doc.parse_status === 'parsing' ? '#c9a96e'
                    : doc.parse_status === 'failed' ? '#b06040'
                    : '#6a7a7e';
                  const parseLabel = doc.parse_status === 'done' ? '已解析'
                    : doc.parse_status === 'parsing' ? '解析中…'
                    : doc.parse_status === 'failed' ? '解析失败'
                    : '待解析';
                  return (
                    <div key={doc.id} className="px-4 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate" style={{ color: '#e8e4dc' }}>{doc.file_name}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px]" style={{ color: '#5a6a6e' }}>
                            <span>{formatFileSize(doc.file_size)}</span>
                            <span>·</span>
                            <span style={{ color: parseColor }}>{parseLabel}</span>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          {(doc.parse_status === 'pending' || doc.parse_status === 'failed') && (
                            <button
                              onClick={() => parseDocument(doc.id)}
                              className="text-[10px] px-2 py-0.5 rounded font-medium text-white"
                              style={{ background: '#c9a96e' }}
                            >
                              🤖 AI解析
                            </button>
                          )}
                          <button
                            onClick={() => deleteDocument(doc.id)}
                            className="text-[10px] px-2 py-0.5 rounded"
                            style={{ background: 'rgba(176,96,64,0.12)', color: '#b06040' }}
                          >
                            删除
                          </button>
                        </div>
                      </div>
                      {doc.parse_status === 'failed' && doc.parse_error && (
                        <p className="text-[10px] mt-1" style={{ color: '#b06040' }}>{doc.parse_error}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Other info — collapsible ──────── */}
          <div className="mx-4 lg:mx-0 mb-3 rounded-xl overflow-hidden" style={CARD}>
            {otherEditing && otherData ? (
              <>
                <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: DIVIDER }}>
                  <span className="text-xs font-semibold" style={{ color: '#e8e4dc' }}>📋 编辑其他信息</span>
                  <div className="flex gap-2">
                    <button onClick={saveOtherInfo} disabled={otherSaving}
                      className="text-[11px] px-3 py-1 rounded-lg font-semibold text-white"
                      style={{ background: otherSaving ? '#d8c8a8' : '#c9a96e' }}
                    >
                      {otherSaving ? '保存中…' : '保存'}
                    </button>
                    <button onClick={() => setOtherEditing(false)}
                      className="text-[11px] px-3 py-1 rounded-lg"
                      style={{ background: 'rgba(201,169,110,0.1)', color: '#c9a96e' }}
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
                      <label className="block text-[11px] mb-1" style={{ color: '#6a7a7e' }}>{label}</label>
                      <input type="text" placeholder={placeholder}
                        value={otherData[key] as string}
                        onChange={e => setOtherData(prev => prev ? { ...prev, [key]: e.target.value } : prev)}
                        className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,169,110,0.08)', color: '#e8e4dc' }}
                      />
                    </div>
                  ))}
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: '#a8b8ac' }}>
                      <input type="checkbox" checked={otherData.has_research_experience}
                        onChange={e => setOtherData(prev => prev ? { ...prev, has_research_experience: e.target.checked } : prev)}
                        className="rounded"
                      />
                      有科研经历
                    </label>
                    <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: '#a8b8ac' }}>
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
                  className="w-full flex items-center justify-between px-4 py-2.5"
                  style={{ background: 'transparent' }}
                >
                  <span className="text-xs font-semibold" style={{ color: '#e8e4dc' }}>
                    📋 其他信息 <span className="font-normal" style={{ color: '#6a7a7e' }}>{otherInfoRows.filter(r => r.value).length}/{otherInfoRows.length} 已填</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setOtherEditing(true);
                        setOtherData(profile ? profileToOther(profile) : profileToOther({} as UserProfile));
                      }}
                      className="text-[10px] px-2 py-0.5 rounded"
                      style={{ background: 'rgba(201,169,110,0.1)', color: '#c9a96e' }}
                    >
                      编辑
                    </button>
                    <span className="text-[10px]" style={{ color: '#6a7a7e' }}>{showOther ? '▲' : '▼'}</span>
                  </div>
                </button>
                {showOther && (
                  <div style={{ borderTop: DIVIDER }}>
                    {otherInfoRows.map(({ label, value }, i) => (
                      <div key={label}
                        className="flex items-center px-4"
                        style={{ height: 36, background: i % 2 === 1 ? 'rgba(201,169,110,0.03)' : 'transparent' }}
                      >
                        <span className="text-[11px] w-20 flex-shrink-0" style={{ color: '#6a7a7e' }}>{label}</span>
                        <span className="flex-1 text-xs truncate" style={{ color: value ? '#e8e4dc' : '#4a5a5e' }}>
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

          {/* Saved professors */}
          <div className="mx-4 lg:mx-0 mb-3 rounded-xl overflow-hidden" style={CARD}>
            <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: DIVIDER }}>
              <span className="text-xs font-semibold" style={{ color: '#e8e4dc' }}>
                🔖 我的收藏 <span className="font-normal" style={{ color: '#6a7a7e' }}>({saved.length})</span>
              </span>
              <Link href="/koala/professors" className="text-[11px] no-underline" style={{ color: '#c9a96e' }}>
                找更多 →
              </Link>
            </div>
            {dataLoading ? (
              <div className="px-4 py-4 text-xs text-center" style={{ color: '#6a7a7e' }}>加载中…</div>
            ) : saved.length === 0 ? (
              <div className="px-4 py-4 text-center">
                <p className="text-xs" style={{ color: '#6a7a7e' }}>还没有收藏教授</p>
                <Link href="/koala/professors" className="text-xs mt-1 inline-block no-underline font-medium" style={{ color: '#c9a96e' }}>
                  去浏览教授库 →
                </Link>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'rgba(201,169,110,0.05)' }}>
                {saved.map(entry => {
                  const prof = entry.professors;
                  if (!prof) return null;
                  return (
                    <div key={entry.id} className="px-4 py-2.5 flex items-start gap-3">
                      <Link href={`/koala/professors/${prof.id}`} className="flex-1 no-underline min-w-0">
                        <p className="text-xs font-semibold" style={{ color: '#e8e4dc' }}>{prof.name}</p>
                        <p className="text-[11px]" style={{ color: '#6a7a7e' }}>
                          {prof.position_title ?? ''} · {prof.university}
                        </p>
                        {prof.research_areas.length > 0 && (
                          <p className="text-[10px] mt-0.5 truncate" style={{ color: '#a89878' }}>
                            {prof.research_areas.slice(0, 2).join(' · ')}
                          </p>
                        )}
                      </Link>
                      <button onClick={() => unsaveProfessor(entry.professor_id)}
                        className="text-[10px] px-2 py-1 rounded-lg flex-shrink-0"
                        style={{ background: 'rgba(176,96,64,0.12)', color: '#b06040' }}
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
          <div className="mx-4 lg:mx-0 mb-3 rounded-xl overflow-hidden" style={CARD}>
            <div className="px-4 py-2.5" style={{ borderBottom: DIVIDER }}>
              <span className="text-xs font-semibold" style={{ color: '#e8e4dc' }}>
                ✉️ 申请信记录 <span className="font-normal" style={{ color: '#6a7a7e' }}>({emails.length})</span>
              </span>
            </div>
            {dataLoading ? (
              <div className="px-4 py-4 text-xs text-center" style={{ color: '#6a7a7e' }}>加载中…</div>
            ) : emails.length === 0 ? (
              <div className="px-4 py-4 text-center">
                <p className="text-xs" style={{ color: '#6a7a7e' }}>还没有生成过申请信</p>
                <Link href="/koala/chat" className="text-xs mt-1 inline-block no-underline font-medium" style={{ color: '#c9a96e' }}>
                  去生成第一封 →
                </Link>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'rgba(201,169,110,0.05)' }}>
                {emails.map(email => {
                  const st = STATUS_LABEL[email.status] ?? { label: email.status, color: '#6a7a7e' };
                  return (
                    <div key={email.id} className="px-4 py-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate" style={{ color: '#e8e4dc' }}>
                            {email.professors?.name ?? '未知教授'}
                          </p>
                          <p className="text-[11px] truncate mt-0.5" style={{ color: '#6a7a7e' }}>
                            {email.subject_line}
                          </p>
                          <p className="text-[10px] mt-0.5" style={{ color: '#a89878' }}>
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

          {/* Credits transaction history */}
          {showCreditsDetail && (
            <div className="mx-4 lg:mx-0 mb-3 rounded-xl overflow-hidden" style={CARD}>
              <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: DIVIDER }}>
                <span className="text-xs font-semibold" style={{ color: '#e8e4dc' }}>
                  💰 积分明细
                </span>
                <button
                  onClick={() => setShowCreditsDetail(false)}
                  className="text-[10px]" style={{ color: '#6a7a7e', background: 'transparent' }}
                >
                  收起 ▲
                </button>
              </div>
              {creditTxs.length === 0 ? (
                <div className="px-4 py-4 text-xs text-center" style={{ color: '#6a7a7e' }}>暂无积分记录</div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'rgba(201,169,110,0.05)' }}>
                  {creditTxs.map(tx => {
                    const d = new Date(tx.created_at);
                    const now = new Date();
                    const isToday = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
                    const timeStr = isToday
                      ? `今天 ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
                      : d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }) + ' ' + d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
                    const isPositive = tx.amount >= 0;
                    return (
                      <div key={tx.id} className="px-4 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] flex-shrink-0" style={{ color: '#6a7a7e' }}>{timeStr}</span>
                          <span className="text-[10px]" style={{ color: '#4a5a5e' }}>·</span>
                          <span className="text-[11px] truncate" style={{ color: '#a8b8ac' }}>{tx.description}</span>
                        </div>
                        <span className="text-xs font-semibold flex-shrink-0 ml-2" style={{ color: isPositive ? '#5a8060' : '#b06040' }}>
                          {isPositive ? '+' : ''}{tx.amount}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* AI Chat history */}
          <div className="mx-4 lg:mx-0 mb-3 rounded-xl overflow-hidden" style={CARD}>
            <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: DIVIDER }}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold" style={{ color: '#e8e4dc' }}>🤖 对话</span>
                {Object.entries(chatStats).map(([mode, count]) => {
                  const ml = MODE_LABELS[mode];
                  return (
                    <span key={mode} className="text-[10px] px-1.5 py-0.5 rounded" title={ml?.label ?? mode} style={{ background: 'rgba(201,169,110,0.1)', color: '#c9a96e' }}>
                      {ml?.emoji ?? '💬'}{count}
                    </span>
                  );
                })}
              </div>
              <Link href="/koala/chat" className="text-[11px] no-underline" style={{ color: '#c9a96e' }}>
                新对话 →
              </Link>
            </div>
            {dataLoading ? (
              <div className="px-4 py-4 text-xs text-center" style={{ color: '#6a7a7e' }}>加载中…</div>
            ) : conversations.length === 0 ? (
              <div className="px-4 py-4 text-center">
                <p className="text-xs" style={{ color: '#6a7a7e' }}>还没有对话记录</p>
                <Link href="/koala/chat" className="text-xs mt-1 inline-block no-underline font-medium" style={{ color: '#c9a96e' }}>
                  开始第一次对话 →
                </Link>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'rgba(201,169,110,0.05)' }}>
                {conversations.map(conv => {
                  const ml = MODE_LABELS[conv.mode];
                  return (
                    <Link key={conv.id} href={`/koala/chat?mode=${conv.mode}`} className="flex items-center gap-3 px-4 no-underline hover:bg-white/[0.02]" style={{ height: 40 }}>
                      <span className="text-sm">{ml?.emoji ?? '💬'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium" style={{ color: '#e8e4dc' }}>{ml?.label ?? conv.mode}</p>
                      </div>
                      <span className="text-[10px]" style={{ color: '#6a7a7e' }}>{conv.messageCount}条 · {timeAgo(conv.created_at)}</span>
                      <span className="text-[10px]" style={{ color: '#4a5a5e' }}>→</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recommended professors */}
          <div className="mx-4 lg:mx-0 mb-3 rounded-xl overflow-hidden" style={CARD}>
            <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: DIVIDER }}>
              <span className="text-xs font-semibold" style={{ color: '#e8e4dc' }}>⭐ 为你推荐</span>
              <button onClick={loadRecommended} disabled={recLoading}
                className="text-[10px] px-2 py-0.5 rounded"
                style={{ background: 'rgba(201,169,110,0.1)', color: '#c9a96e' }}
              >
                {recLoading ? '…' : '🔄 换一批'}
              </button>
            </div>
            {dataLoading ? (
              <div className="px-4 py-4 text-xs text-center" style={{ color: '#6a7a7e' }}>加载中…</div>
            ) : recommended.length === 0 ? (
              <div className="px-4 py-4 text-center">
                <p className="text-xs" style={{ color: '#6a7a7e' }}>完善个人背景后获得个性化推荐</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'rgba(201,169,110,0.05)' }}>
                {recommended.slice(0, 4).map(prof => (
                  <div key={prof.id} className="px-4 py-2.5 flex items-center gap-3">
                    <Link href={`/koala/professors/${prof.id}`} className="flex-1 no-underline min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold truncate" style={{ color: '#e8e4dc' }}>{prof.name}</span>
                        <span className="text-[10px] flex-shrink-0" style={{ color: '#6a7a7e' }}>{prof.university}</span>
                      </div>
                      {prof.research_areas.length > 0 && (
                        <div className="flex gap-1 mt-0.5">
                          {prof.research_areas.slice(0, 2).map(tag => (
                            <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(201,169,110,0.08)', color: '#a89878' }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </Link>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <Link href={`/koala/professors/${prof.id}`} className="text-[10px] px-2 py-1 rounded no-underline" style={{ background: 'rgba(201,169,110,0.1)', color: '#c9a96e' }}>
                        详情
                      </Link>
                      <Link href={`/koala/chat?professor=${prof.id}`} className="text-[10px] px-2 py-1 rounded no-underline font-medium text-white" style={{ background: '#c9a96e' }}>
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
              className="block w-full py-3 rounded-xl text-center text-sm font-semibold text-white no-underline"
              style={{ background: '#c9a96e' }}
            >
              🐨 用我的背景匹配教授
            </Link>
          </div>

          {/* Settings */}
          <div className="mx-4 lg:mx-0 mb-3 rounded-xl overflow-hidden" style={CARD}>
            <button onClick={() => setShowSettings(!showSettings)}
              className="w-full flex items-center justify-between px-4 py-2.5"
              style={{ background: 'transparent' }}
            >
              <span className="text-xs font-semibold" style={{ color: '#e8e4dc' }}>⚙️ 设置</span>
              <span className="text-[10px]" style={{ color: '#6a7a7e' }}>{showSettings ? '▲' : '▼'}</span>
            </button>
            {showSettings && (
              <div className="divide-y" style={{ borderColor: 'rgba(201,169,110,0.05)', borderTop: DIVIDER }}>
                <button
                  className="w-full flex items-center px-4 py-2.5 text-xs text-left"
                  style={{ color: '#a8b8ac', background: 'transparent' }}
                  onClick={() => {
                    if (user?.email) {
                      fetch('/api/auth/reset-password', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: user.email }),
                      });
                      alert('密码重置链接已发送到你的邮箱');
                    }
                  }}
                >
                  🔑 修改密码
                </button>
                <Link href="/koala/tools" className="flex items-center px-4 py-2.5 text-xs no-underline" style={{ color: '#a8b8ac' }}>
                  🔧 更多工具
                </Link>
                <button
                  className="w-full flex items-center px-4 py-2.5 text-xs text-left"
                  style={{ color: '#a8b8ac', background: 'transparent' }}
                  onClick={() => setShowRoleApply(true)}
                >
                  👔 申请角色（管理员/销售）
                </button>
                <button
                  className="w-full flex items-center px-4 py-2.5 text-xs text-left"
                  style={{ color: '#b06040', background: 'transparent' }}
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
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: '#111c28', border: '1px solid rgba(201,169,110,0.15)' }} onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold mb-4" style={{ color: '#e8e4dc' }}>申请角色</h3>
            {roleApplyStatus ? (
              <div className="text-center py-4">
                <p className="text-xs" style={{ color: roleApplyStatus === 'success' ? '#5a8060' : '#b06040' }}>
                  {roleApplyStatus === 'success' ? '申请已提交，请等待审核' : roleApplyStatus}
                </p>
                <button onClick={() => { setShowRoleApply(false); setRoleApplyStatus(null); }} className="mt-3 text-xs px-4 py-2 rounded-full" style={{ background: '#c9a96e', color: '#080c10' }}>关闭</button>
              </div>
            ) : (
              <>
                <div className="flex gap-2 mb-3">
                  {(['admin', 'sales'] as const).map(r => (
                    <button
                      key={r}
                      onClick={() => setRoleApplyRole(r)}
                      className="flex-1 py-2 rounded-lg text-xs font-medium transition"
                      style={{ background: roleApplyRole === r ? 'rgba(201,169,110,0.15)' : 'transparent', color: roleApplyRole === r ? '#c9a96e' : '#6a7a7e', border: `1px solid ${roleApplyRole === r ? 'rgba(201,169,110,0.3)' : 'rgba(201,169,110,0.08)'}` }}
                    >
                      {r === 'admin' ? '管理员' : '销售'}
                    </button>
                  ))}
                </div>
                <input
                  type="tel"
                  placeholder="联系电话（选填）"
                  value={roleApplyPhone}
                  onChange={e => setRoleApplyPhone(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-xs mb-3 focus:outline-none"
                  style={{ background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.1)', color: '#e8e4dc' }}
                />
                <textarea
                  placeholder="申请理由（至少10字）"
                  value={roleApplyReason}
                  onChange={e => setRoleApplyReason(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg px-3 py-2 text-xs mb-3 focus:outline-none resize-none"
                  style={{ background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.1)', color: '#e8e4dc' }}
                />
                <div className="flex gap-2">
                  <button onClick={() => setShowRoleApply(false)} className="flex-1 py-2 rounded-lg text-xs" style={{ color: '#6a7a7e', border: '1px solid rgba(201,169,110,0.1)' }}>取消</button>
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
                        if (!res.ok) { setRoleApplyStatus(d.error || '提交失败'); }
                        else { setRoleApplyStatus('success'); }
                      } catch { setRoleApplyStatus('网络错误'); }
                      setRoleApplyLoading(false);
                    }}
                    className="flex-1 py-2 rounded-lg text-xs font-medium disabled:opacity-50"
                    style={{ background: '#c9a96e', color: '#080c10' }}
                  >
                    {roleApplyLoading ? '提交中…' : '提交申请'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-center mt-4 mb-2 px-4" style={{ fontSize: 9, color: '#6a7a7e' }}>
        你的个人信息仅用于 AI 推荐优化，不会与第三方共享。
      </p>

      </div>{/* end max-w-5xl */}
    </div>
  );
}
