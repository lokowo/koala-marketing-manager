'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, type UserProfile } from '../components/AuthContext';

// ─── Completeness helpers ────────────────────
const COMPLETENESS_FIELDS: { key: keyof UserProfile; label: string }[] = [
  { key: 'display_name', label: '姓名' },
  { key: 'university', label: '就读学校' },
  { key: 'major', label: '专业' },
  { key: 'degree_level', label: '学历层次' },
  { key: 'gpa', label: 'GPA' },
  { key: 'target_field', label: '目标研究方向' },
  { key: 'english_level', label: '英语水平' },
  { key: 'has_research_experience', label: '科研经历' },
  { key: 'target_universities', label: '目标学校' },
];

function calcCompleteness(p: Partial<UserProfile>): number {
  const filled = COMPLETENESS_FIELDS.filter(({ key }) => {
    const v = p[key];
    if (v === undefined || v === null || v === '') return false;
    if (Array.isArray(v) && v.length === 0) return false;
    return true;
  }).length;
  const bonus = p.parsed_data || p.resume_url ? 10 : 0;
  return Math.min(100, Math.round((filled / COMPLETENESS_FIELDS.length) * 90) + bonus);
}

// ─── Arc progress SVG ───────────────────────
function ArcProgress({ pct }: { pct: number }) {
  const r = 42;
  const cx = 56;
  const cy = 56;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;
  return (
    <svg width="112" height="112" className="rotate-[-90deg]">
      <circle cx={cx} cy={cy} r={r} stroke="#e8dcc8" strokeWidth="8" fill="none" />
      <circle
        cx={cx} cy={cy} r={r}
        stroke={pct >= 80 ? '#5a8060' : pct >= 50 ? '#c4a050' : '#b06040'}
        strokeWidth="8" fill="none"
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
  free:    { label: '免费版', bg: '#e8dcc8', color: '#7d6340' },
  starter: { label: 'Starter', bg: '#d4e8d8', color: '#3a6040' },
  pro:     { label: 'Pro ✦', bg: '#f4e4b8', color: '#8a6030' },
  elite:   { label: 'Elite ✦✦', bg: '#f8d8d0', color: '#8a3020' },
};

// ─── Saved professor mini card ────────────────
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

// ─── Outreach email entry ────────────────────
interface OutreachEntry {
  id: string;
  subject_line: string;
  status: string;
  purpose: string;
  created_at: string;
  professors: { id: string; name: string; university: string } | null;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  draft:    { label: '草稿', color: '#907858' },
  copied:   { label: '已复制', color: '#c4a050' },
  sent:     { label: '已发送', color: '#5a8060' },
  replied:  { label: '已回复 🎉', color: '#3a7050' },
  no_reply: { label: '未回复', color: '#b06040' },
};

// ─── Edit form ───────────────────────────────
type EditData = {
  display_name: string;
  university: string;
  major: string;
  degree_level: string;
  gpa: string;
  gpa_scale: string;
  target_field: string;
  target_universities: string;
  english_level: string;
  has_research_experience: boolean;
  research_description: string;
  has_publications: boolean;
  publication_details: string;
};

function profileToEdit(p: UserProfile): EditData {
  return {
    display_name: p.display_name ?? '',
    university: p.university ?? '',
    major: p.major ?? '',
    degree_level: p.degree_level ?? '',
    gpa: p.gpa ? String(p.gpa) : '',
    gpa_scale: p.gpa_scale ?? '',
    target_field: p.target_field ?? '',
    target_universities: (p.target_universities ?? []).join(', '),
    english_level: p.english_level ?? '',
    has_research_experience: p.has_research_experience ?? false,
    research_description: p.research_description ?? '',
    has_publications: p.has_publications ?? false,
    publication_details: p.publication_details ?? '',
  };
}

// ─────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────

export default function MyProfilePage() {
  const { user, profile, authLoading, showLogin, signOut, refreshProfile } = useAuth();
  const router = useRouter();

  const [saved, setSaved] = useState<SavedEntry[]>([]);
  const [emails, setEmails] = useState<OutreachEntry[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<EditData | null>(null);
  const [saving, setSaving] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

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
    ]).then(([s, e]) => {
      setSaved(s.saved ?? []);
      setEmails(e.emails ?? []);
    }).catch(() => {}).finally(() => setDataLoading(false));
  }, [user]);

  // ── Not logged in ────────────────────────
  if (!authLoading && !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
        <div className="text-5xl mb-4">🐨</div>
        <h1 className="text-lg font-bold mb-2" style={{ color: '#1a2332' }}>登录后查看个人中心</h1>
        <p className="text-sm mb-6 leading-relaxed" style={{ color: '#907858' }}>
          保存你的背景信息，收藏心仪教授，<br />查看套磁信历史
        </p>
        <button
          onClick={() => showLogin()}
          className="w-full max-w-xs py-3 rounded-full text-sm font-semibold text-white mb-3"
          style={{ background: '#c4a050' }}
        >
          登录 / 注册
        </button>
        <Link
          href="/koala/home"
          className="text-xs"
          style={{ color: '#907858' }}
        >
          先逛逛 →
        </Link>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="animate-pulse text-sm" style={{ color: '#907858' }}>加载中…</div>
      </div>
    );
  }

  const pct = profile ? calcCompleteness(profile) : 0;
  const plan = PLAN_CONFIG[profile?.plan_type ?? 'free'];
  const displayName = profile?.display_name || user?.email?.split('@')[0] || '用户';
  const initials = displayName.slice(0, 1).toUpperCase();
  const missingFields = COMPLETENESS_FIELDS.filter(({ key }) => {
    if (!profile) return true;
    const v = profile[key as keyof UserProfile];
    if (v === undefined || v === null || v === '') return true;
    if (Array.isArray(v) && v.length === 0) return true;
    return false;
  });

  // ── Save edit ────────────────────────────
  async function saveEdit() {
    if (!editData) return;
    setSaving(true);
    const payload = {
      display_name: editData.display_name || null,
      university: editData.university || null,
      major: editData.major || null,
      degree_level: editData.degree_level || null,
      gpa: editData.gpa ? parseFloat(editData.gpa) : null,
      gpa_scale: editData.gpa_scale || null,
      target_field: editData.target_field || null,
      target_universities: editData.target_universities
        ? editData.target_universities.split(',').map(s => s.trim()).filter(Boolean)
        : [],
      english_level: editData.english_level || null,
      has_research_experience: editData.has_research_experience,
      research_description: editData.research_description || null,
      has_publications: editData.has_publications,
      publication_details: editData.publication_details || null,
    };
    await fetch('/api/user/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    await refreshProfile();
    setEditing(false);
    setSaving(false);
  }

  // ── CV upload ────────────────────────────
  async function handleUpload(file: File) {
    setUploading(true);
    setUploadMsg('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/user/profile/parse', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed');
      await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parsed_data: json.profile, file_name: file.name }),
      });
      await refreshProfile();
      setUploadMsg('✅ 简历解析成功！');
    } catch (e) {
      setUploadMsg(`❌ ${(e as Error).message}`);
    } finally {
      setUploading(false);
    }
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

  return (
    <div className="pb-6 lg:pb-12" style={{ background: '#faf6ec' }}>
      {/* ── Header card ──────────────────── */}
      <div className="px-4 lg:px-0 pt-5 pb-4">
        <div className="rounded-3xl p-5 lg:flex lg:items-center lg:gap-8" style={{ background: '#f2ead6', border: '1px solid #e8dcc8' }}>
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0"
              style={{ background: '#c4a050', color: '#fff' }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold truncate" style={{ color: '#1a2332' }}>
                {displayName}
              </h1>
              <p className="text-xs truncate mt-0.5" style={{ color: '#907858' }}>
                {user?.email}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{ background: plan.bg, color: plan.color }}
                >
                  {plan.label}
                </span>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: '#e8f4e8', color: '#3a6040' }}
                >
                  ✦ {profile?.credits_remaining ?? 1} 积分
                </span>
              </div>
            </div>
          </div>
          {/* Admin CTA — only visible to admins */}
          {isAdmin && (
            <Link
              href="/dashboard"
              className="mt-4 lg:mt-0 lg:ml-auto flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold no-underline"
              style={{ background: '#1a2332', color: '#c4a050', border: '2px solid #c4a050', whiteSpace: 'nowrap' }}
            >
              ⚙️ 超级管理后台
            </Link>
          )}
        </div>
      </div>

      {/* ── Two-col on desktop ── */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
      <div>{/* left column */}

      {/* ── Profile completeness ──────────── */}
      <div className="mx-4 lg:mx-0 mb-3 rounded-2xl p-4" style={{ background: '#f2ead6', border: '1px solid #e8dcc8' }}>
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <ArcProgress pct={pct} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold" style={{ color: '#1a2332' }}>{pct}%</span>
              <span className="text-[9px]" style={{ color: '#907858' }}>完整度</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold mb-1" style={{ color: '#1a2332' }}>
              {pct >= 90 ? '资料很完整 🎉' : '完善资料，让推荐更精准'}
            </p>
            {missingFields.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {missingFields.slice(0, 4).map(f => (
                  <button
                    key={f.key}
                    onClick={() => { setEditing(true); setEditData(profile ? profileToEdit(profile) : null); }}
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: '#fff3e0', color: '#b06040', border: '1px solid #e8c890' }}
                  >
                    + {f.label}
                  </button>
                ))}
                {missingFields.length > 4 && (
                  <span className="text-[10px]" style={{ color: '#907858' }}>+{missingFields.length - 4}项</span>
                )}
              </div>
            ) : (
              <p className="text-xs" style={{ color: '#5a8060' }}>所有基本信息已填写完整</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Personal info ─────────────────── */}
      <div className="mx-4 lg:mx-0 mb-3 rounded-2xl overflow-hidden" style={{ background: '#f2ead6', border: '1px solid #e8dcc8' }}>
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: editing ? '1px solid #e8dcc8' : undefined }}
        >
          <span className="text-xs font-semibold" style={{ color: '#1a2332' }}>📋 个人背景</span>
          {!editing ? (
            <button
              onClick={() => { setEditing(true); setEditData(profile ? profileToEdit(profile) : profileToEdit({} as UserProfile)); }}
              className="text-[11px] px-3 py-1 rounded-xl"
              style={{ background: '#e8dcc8', color: '#7d6340' }}
            >
              编辑
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={saveEdit}
                disabled={saving}
                className="text-[11px] px-3 py-1 rounded-xl font-semibold text-white"
                style={{ background: saving ? '#d8c8a8' : '#c4a050' }}
              >
                {saving ? '保存中…' : '保存'}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="text-[11px] px-3 py-1 rounded-xl"
                style={{ background: '#e8dcc8', color: '#7d6340' }}
              >
                取消
              </button>
            </div>
          )}
        </div>

        {editing && editData ? (
          <div className="px-4 py-3 space-y-3">
            {[
              { key: 'display_name' as const, label: '姓名', placeholder: '你的名字' },
              { key: 'university' as const, label: '就读学校', placeholder: '例：浙江大学' },
              { key: 'major' as const, label: '专业', placeholder: '例：计算机科学' },
              { key: 'gpa' as const, label: 'GPA', placeholder: '例：3.8' },
              { key: 'gpa_scale' as const, label: 'GPA 满分', placeholder: '例：4.0' },
              { key: 'target_field' as const, label: '目标研究方向', placeholder: '例：机器学习' },
              { key: 'target_universities' as const, label: '目标学校（逗号分隔）', placeholder: '例：ANU, UNSW' },
              { key: 'english_level' as const, label: '英语水平', placeholder: '例：雅思 7.0' },
              { key: 'research_description' as const, label: '科研经历描述', placeholder: '简述你的科研项目…' },
              { key: 'publication_details' as const, label: '论文详情', placeholder: '发表过的论文名称/期刊…' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-[11px] mb-1" style={{ color: '#907858' }}>{label}</label>
                <input
                  type="text"
                  placeholder={placeholder}
                  value={editData[key] as string}
                  onChange={e => setEditData(prev => prev ? { ...prev, [key]: e.target.value } : prev)}
                  className="w-full px-3 py-2 rounded-xl text-xs outline-none"
                  style={{ background: '#fff', border: '1px solid #e8dcc8', color: '#1a2332' }}
                />
              </div>
            ))}
            <div>
              <label className="block text-[11px] mb-1" style={{ color: '#907858' }}>学历层次</label>
              <select
                value={editData.degree_level}
                onChange={e => setEditData(prev => prev ? { ...prev, degree_level: e.target.value } : prev)}
                className="w-full px-3 py-2 rounded-xl text-xs outline-none"
                style={{ background: '#fff', border: '1px solid #e8dcc8', color: '#1a2332' }}
              >
                <option value="">请选择</option>
                {['本科在读', '本科毕业', '硕士在读', '硕士毕业', '博士在读'].map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: '#584838' }}>
                <input
                  type="checkbox"
                  checked={editData.has_research_experience}
                  onChange={e => setEditData(prev => prev ? { ...prev, has_research_experience: e.target.checked } : prev)}
                  className="rounded"
                />
                有科研经历
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: '#584838' }}>
                <input
                  type="checkbox"
                  checked={editData.has_publications}
                  onChange={e => setEditData(prev => prev ? { ...prev, has_publications: e.target.checked } : prev)}
                  className="rounded"
                />
                有论文发表
              </label>
            </div>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: '#e8dcc8' }}>
            {[
              { label: '学校', value: profile?.university },
              { label: '专业', value: profile?.major },
              { label: '学历', value: profile?.degree_level },
              { label: 'GPA', value: profile?.gpa ? `${profile.gpa} / ${profile.gpa_scale || '?'}` : null },
              { label: '目标方向', value: profile?.target_field },
              { label: '目标学校', value: (profile?.target_universities ?? []).join(', ') || null },
              { label: '英语水平', value: profile?.english_level },
              { label: '科研经历', value: profile?.has_research_experience ? (profile.research_description || '有') : '无' },
              { label: '论文发表', value: profile?.has_publications ? (profile.publication_details || '有') : '无' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-start gap-3 px-4 py-2.5">
                <span className="text-[11px] w-20 flex-shrink-0 pt-0.5" style={{ color: '#907858' }}>{label}</span>
                <span className="flex-1 text-xs" style={{ color: value ? '#1a2332' : '#c8b898' }}>
                  {value || '未填写'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── CV Upload ────────────────────── */}
      <div className="mx-4 lg:mx-0 mb-3 rounded-2xl p-4" style={{ background: '#f2ead6', border: '1px solid #e8dcc8' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold" style={{ color: '#1a2332' }}>📄 简历 / 成绩单</span>
          {profile?.file_name && (
            <span className="text-[10px]" style={{ color: '#907858' }}>{profile.file_name}</span>
          )}
        </div>
        <button
          onClick={() => !uploading && fileRef.current?.click()}
          disabled={uploading}
          className="w-full py-2.5 rounded-xl text-xs font-medium border-2 border-dashed"
          style={{ borderColor: '#c4a050', color: uploading ? '#d8c8a8' : '#c4a050', background: 'transparent' }}
        >
          {uploading ? '⏳ AI 解析中…' : profile?.parsed_data ? '重新上传（AI 重新解析）' : '📎 上传简历 / 成绩单（PDF/图片）'}
        </button>
        {uploadMsg && (
          <p className="text-[11px] mt-2 text-center" style={{ color: uploadMsg.startsWith('✅') ? '#5a8060' : '#b06040' }}>
            {uploadMsg}
          </p>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,image/*"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
        />
      </div>

      </div>{/* end left column */}
      <div>{/* right column */}

      {/* ── Saved professors ──────────────── */}
      <div className="mx-4 lg:mx-0 mb-3 rounded-2xl overflow-hidden" style={{ background: '#f2ead6', border: '1px solid #e8dcc8' }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #e8dcc8' }}>
          <span className="text-xs font-semibold" style={{ color: '#1a2332' }}>
            🔖 我的收藏 <span className="font-normal" style={{ color: '#907858' }}>({saved.length})</span>
          </span>
          <Link href="/koala/professors" className="text-[11px] no-underline" style={{ color: '#c4a050' }}>
            找更多 →
          </Link>
        </div>

        {dataLoading ? (
          <div className="px-4 py-4 text-xs text-center" style={{ color: '#907858' }}>加载中…</div>
        ) : saved.length === 0 ? (
          <div className="px-4 py-5 text-center">
            <p className="text-xs" style={{ color: '#907858' }}>还没有收藏教授</p>
            <Link
              href="/koala/professors"
              className="text-xs mt-1 inline-block no-underline font-medium"
              style={{ color: '#c4a050' }}
            >
              去浏览教授库 →
            </Link>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: '#e8dcc8' }}>
            {saved.map(entry => {
              const prof = entry.professors;
              if (!prof) return null;
              return (
                <div key={entry.id} className="px-4 py-3 flex items-start gap-3">
                  <Link
                    href={`/koala/professors/${prof.id}`}
                    className="flex-1 no-underline"
                  >
                    <p className="text-xs font-semibold" style={{ color: '#1a2332' }}>{prof.name}</p>
                    <p className="text-[11px]" style={{ color: '#907858' }}>
                      {prof.position_title ?? ''} · {prof.university}
                    </p>
                    {prof.research_areas.length > 0 && (
                      <p className="text-[10px] mt-0.5 truncate" style={{ color: '#a89878' }}>
                        {prof.research_areas.slice(0, 2).join(' · ')}
                      </p>
                    )}
                  </Link>
                  <button
                    onClick={() => unsaveProfessor(entry.professor_id)}
                    className="text-[10px] px-2 py-1 rounded-lg flex-shrink-0"
                    style={{ background: '#f8e8e0', color: '#b06040' }}
                  >
                    取消
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Outreach history ──────────────── */}
      <div className="mx-4 lg:mx-0 mb-3 rounded-2xl overflow-hidden" style={{ background: '#f2ead6', border: '1px solid #e8dcc8' }}>
        <div className="px-4 py-3" style={{ borderBottom: '1px solid #e8dcc8' }}>
          <span className="text-xs font-semibold" style={{ color: '#1a2332' }}>
            ✉️ 套磁信记录 <span className="font-normal" style={{ color: '#907858' }}>({emails.length})</span>
          </span>
        </div>

        {dataLoading ? (
          <div className="px-4 py-4 text-xs text-center" style={{ color: '#907858' }}>加载中…</div>
        ) : emails.length === 0 ? (
          <div className="px-4 py-5 text-center">
            <p className="text-xs" style={{ color: '#907858' }}>还没有生成过套磁信</p>
            <Link
              href="/koala/chat"
              className="text-xs mt-1 inline-block no-underline font-medium"
              style={{ color: '#c4a050' }}
            >
              去生成第一封 →
            </Link>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: '#e8dcc8' }}>
            {emails.map(email => {
              const st = STATUS_LABEL[email.status] ?? { label: email.status, color: '#907858' };
              return (
                <div key={email.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: '#1a2332' }}>
                        {email.professors?.name ?? '未知教授'}
                      </p>
                      <p className="text-[11px] truncate mt-0.5" style={{ color: '#907858' }}>
                        {email.subject_line}
                      </p>
                      <p className="text-[10px] mt-0.5" style={{ color: '#a89878' }}>
                        {new Date(email.created_at).toLocaleDateString('zh-CN')} · {email.purpose}
                      </p>
                    </div>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
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

      {/* ── CTA ──────────────────────────── */}
      <div className="mx-4 lg:mx-0 mb-4">
        <Link
          href="/koala/chat"
          className="block w-full py-3 rounded-full text-center text-sm font-semibold text-white no-underline"
          style={{ background: '#7d6340' }}
        >
          🐨 用我的背景匹配教授
        </Link>
      </div>

      {/* ── Settings ─────────────────────── */}
      <div className="mx-4 lg:mx-0 mb-3 rounded-2xl overflow-hidden" style={{ background: '#f2ead6', border: '1px solid #e8dcc8' }}>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="w-full flex items-center justify-between px-4 py-3"
          style={{ background: 'transparent' }}
        >
          <span className="text-xs font-semibold" style={{ color: '#1a2332' }}>⚙️ 设置</span>
          <span className="text-xs" style={{ color: '#907858' }}>{showSettings ? '▲' : '▼'}</span>
        </button>

        {showSettings && (
          <div className="divide-y" style={{ borderColor: '#e8dcc8', borderTop: '1px solid #e8dcc8' }}>
            <button
              className="w-full flex items-center px-4 py-3 text-xs text-left"
              style={{ color: '#584838', background: 'transparent' }}
              onClick={() => {
                // Password reset via Supabase magic link
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
            <Link
              href="/koala/tools"
              className="flex items-center px-4 py-3 text-xs no-underline"
              style={{ color: '#584838' }}
            >
              🔧 更多工具
            </Link>
            <button
              className="w-full flex items-center px-4 py-3 text-xs text-left"
              style={{ color: '#b06040', background: 'transparent' }}
              onClick={handleSignOut}
            >
              🚪 退出登录
            </button>
          </div>
        )}
      </div>

      {/* ── Data disclaimer ──────────────── */}
      <div className="mx-4 lg:mx-0 mt-2 px-3 py-2 rounded-xl text-[10px] leading-relaxed" style={{ background: '#f0e9d6', color: '#b09878' }}>
        你的个人信息仅用于 AI 推荐优化，不会与第三方共享。
      </div>
      </div>{/* end right column */}
      </div>{/* end two-col grid */}
    </div>
  );
}
