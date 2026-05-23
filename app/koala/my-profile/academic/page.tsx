'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, Camera, X, Plus } from 'lucide-react';
import { useAuth } from '../../components/AuthContext';
import { supabase } from '../../../lib/supabase/client';

const INPUT_CLS = 'w-full px-3 py-2 rounded-lg text-sm outline-none bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 dark:focus:border-blue-500/50 focus:ring-2 focus:ring-blue-50 dark:focus:ring-blue-500/10 transition-colors';
const LABEL_CLS = 'block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1';
const CARD_CLS = 'rounded-xl bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 shadow-sm';

interface ProfileData {
  display_name: string;
  avatar_url: string;
  university: string;
  major: string;
  degree_level: string;
  gpa: string;
  gpa_scale: string;
  target_field: string;
  target_universities: string[];
  english_level: string;
  english_test_type: string;
  has_research_experience: boolean;
  research_description: string;
  has_publications: boolean;
  publication_details: string;
  research_interests: string[];
  career_goal: string;
  start_semester: string;
  strengths: string[];
  work_experience: string;
  profile_completed_at: string | null;
  profile_version: number;
}

const EMPTY_PROFILE: ProfileData = {
  display_name: '',
  avatar_url: '',
  university: '',
  major: '',
  degree_level: '',
  gpa: '',
  gpa_scale: '',
  target_field: '',
  target_universities: [],
  english_level: '',
  english_test_type: '',
  has_research_experience: false,
  research_description: '',
  has_publications: false,
  publication_details: '',
  research_interests: [],
  career_goal: '',
  start_semester: '',
  strengths: [],
  work_experience: '',
  profile_completed_at: null,
  profile_version: 1,
};

const DEGREE_OPTIONS = ['本科在读', '本科毕业', '硕士在读', '硕士毕业', '博士在读'];

function TagInput({ tags, onChange, placeholder }: { tags: string[]; onChange: (t: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const trimmed = draft.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setDraft('');
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 rounded">
            {tag}
            <button onClick={() => onChange(tags.filter((t) => t !== tag))} className="text-blue-400 hover:text-blue-600 bg-transparent p-0">
              <X size={10} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-1.5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder ?? '输入后回车'}
          className={INPUT_CLS}
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim()}
          className="px-3 py-2 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors disabled:opacity-40 shrink-0"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

export default function AcademicProfilePage() {
  const router = useRouter();
  const { user, profile: authProfile, refreshProfile } = useAuth();
  const [data, setData] = useState<ProfileData>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    fetch('/api/user/profile')
      .then((r) => r.json())
      .then(({ profile }) => {
        if (profile) {
          setData({
            display_name: profile.display_name ?? '',
            avatar_url: profile.avatar_url ?? '',
            university: profile.university ?? '',
            major: profile.major ?? '',
            degree_level: profile.degree_level ?? '',
            gpa: profile.gpa != null ? String(profile.gpa) : '',
            gpa_scale: profile.gpa_scale ?? '',
            target_field: profile.target_field ?? '',
            target_universities: profile.target_universities ?? [],
            english_level: profile.english_level ?? '',
            english_test_type: profile.english_test_type ?? '',
            has_research_experience: profile.has_research_experience ?? false,
            research_description: profile.research_description ?? '',
            has_publications: profile.has_publications ?? false,
            publication_details: profile.publication_details ?? '',
            research_interests: profile.research_interests ?? [],
            career_goal: profile.career_goal ?? '',
            start_semester: profile.start_semester ?? '',
            strengths: profile.strengths ?? [],
            work_experience: profile.work_experience ?? '',
            profile_completed_at: profile.profile_completed_at ?? null,
            profile_version: profile.profile_version ?? 1,
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const update = useCallback(<K extends keyof ProfileData>(key: K, value: ProfileData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }, []);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setAvatarUploading(true);
    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `avatars/${user.id}.${ext}`;
      const { error } = await supabase.storage.from('user-files').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('user-files').getPublicUrl(path);
      const url = urlData.publicUrl + '?t=' + Date.now();
      update('avatar_url', url);
      await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url: url }),
      });
    } catch (err) {
      console.error('[avatar upload]', err);
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.display_name,
          university: data.university,
          major: data.major,
          degree_level: data.degree_level,
          gpa: data.gpa || null,
          gpa_scale: data.gpa_scale || null,
          target_field: data.target_field,
          preferred_universities: data.target_universities,
          english_level: data.english_level,
          has_research_experience: data.has_research_experience,
          research_description: data.research_description,
          research_interests: data.research_interests,
          career_goal: data.career_goal,
          start_semester: data.start_semester,
          strengths: data.strengths,
          work_experience: data.work_experience,
        }),
      });
      if (res.ok) {
        setSaved(true);
        refreshProfile?.();
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error('[save profile]', err);
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#080c10]">
        <p className="text-sm text-gray-500 dark:text-gray-400">请先登录</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#080c10]">
        <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">加载中…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#080c10] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/82 dark:bg-[#080c10]/82 backdrop-blur-xl border-b border-gray-200 dark:border-white/10">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 h-14">
          <button onClick={() => router.back()} className="p-1 text-gray-500 dark:text-gray-400 bg-transparent">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-base font-light text-gray-900 dark:text-gray-100 tracking-tight">学术档案</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-4">

        {/* Avatar + Name */}
        <div className={`${CARD_CLS} p-5`}>
          <div className="flex items-center gap-4">
            <div className="relative cursor-pointer group shrink-0" onClick={() => !avatarUploading && fileRef.current?.click()}>
              {data.avatar_url ? (
                <img src={data.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-xl font-medium text-blue-700 dark:text-blue-300">
                  {(data.display_name || user.email || '?')[0].toUpperCase()}
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {avatarUploading ? (
                  <span className="text-white text-[10px] animate-pulse">上传中</span>
                ) : (
                  <Camera size={16} className="text-white" />
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
            <div className="flex-1 min-w-0">
              <label className={LABEL_CLS}>姓名</label>
              <input
                value={data.display_name}
                onChange={(e) => update('display_name', e.target.value)}
                placeholder="你的姓名"
                className={INPUT_CLS}
              />
            </div>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">
            头像将用于 CV 生成
          </p>
        </div>

        {/* Academic Background */}
        <div className={`${CARD_CLS} p-5 space-y-4`}>
          <h2 className="text-sm font-medium text-gray-900 dark:text-gray-100">学术背景</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>院校</label>
              <input value={data.university} onChange={(e) => update('university', e.target.value)} placeholder="如 Wuhan University" className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>专业</label>
              <input value={data.major} onChange={(e) => update('major', e.target.value)} placeholder="如 Computer Science" className={INPUT_CLS} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>学历</label>
              <select value={data.degree_level} onChange={(e) => update('degree_level', e.target.value)} className={INPUT_CLS}>
                <option value="">请选择</option>
                {DEGREE_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={LABEL_CLS}>GPA</label>
                <input value={data.gpa} onChange={(e) => update('gpa', e.target.value)} placeholder="3.8" inputMode="decimal" className={INPUT_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>满分</label>
                <select value={data.gpa_scale} onChange={(e) => update('gpa_scale', e.target.value)} className={INPUT_CLS}>
                  <option value="">—</option>
                  <option value="4.0">4.0</option>
                  <option value="5.0">5.0</option>
                  <option value="7.0">7.0</option>
                  <option value="100">100</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className={LABEL_CLS}>英语水平</label>
            <input value={data.english_level} onChange={(e) => update('english_level', e.target.value)} placeholder="如 IELTS 7.0 / TOEFL 100" className={INPUT_CLS} />
          </div>
        </div>

        {/* Research */}
        <div className={`${CARD_CLS} p-5 space-y-4`}>
          <h2 className="text-sm font-medium text-gray-900 dark:text-gray-100">科研经历</h2>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input type="checkbox" checked={data.has_research_experience} onChange={(e) => update('has_research_experience', e.target.checked)} className="accent-blue-600 w-4 h-4" />
              有科研经历
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input type="checkbox" checked={data.has_publications} onChange={(e) => update('has_publications', e.target.checked)} className="accent-blue-600 w-4 h-4" />
              有论文发表
            </label>
          </div>

          {data.has_research_experience && (
            <div>
              <label className={LABEL_CLS}>科研经历描述</label>
              <textarea
                value={data.research_description}
                onChange={(e) => update('research_description', e.target.value)}
                rows={3}
                placeholder="描述你的科研项目、方法、成果…"
                className={INPUT_CLS + ' resize-none'}
              />
            </div>
          )}

          {data.has_publications && (
            <div>
              <label className={LABEL_CLS}>论文详情</label>
              <textarea
                value={data.publication_details}
                onChange={(e) => update('publication_details', e.target.value)}
                rows={2}
                placeholder="期刊名、论文标题、作者排序…"
                className={INPUT_CLS + ' resize-none'}
              />
            </div>
          )}

          <div>
            <label className={LABEL_CLS}>研究兴趣</label>
            <TagInput tags={data.research_interests} onChange={(t) => update('research_interests', t)} placeholder="如 NLP, Reinforcement Learning" />
          </div>

          <div>
            <label className={LABEL_CLS}>个人优势</label>
            <TagInput tags={data.strengths} onChange={(t) => update('strengths', t)} placeholder="如 编程能力强, 英文论文写作" />
          </div>
        </div>

        {/* Goals */}
        <div className={`${CARD_CLS} p-5 space-y-4`}>
          <h2 className="text-sm font-medium text-gray-900 dark:text-gray-100">目标与规划</h2>

          <div>
            <label className={LABEL_CLS}>目标研究方向</label>
            <input value={data.target_field} onChange={(e) => update('target_field', e.target.value)} placeholder="如 Computer Vision, Medical Imaging" className={INPUT_CLS} />
          </div>

          <div>
            <label className={LABEL_CLS}>目标大学</label>
            <TagInput tags={data.target_universities} onChange={(t) => update('target_universities', t)} placeholder="如 University of Melbourne" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>计划入学学期</label>
              <input value={data.start_semester} onChange={(e) => update('start_semester', e.target.value)} placeholder="如 2027 S1" className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>职业目标</label>
              <input value={data.career_goal} onChange={(e) => update('career_goal', e.target.value)} placeholder="如 学术界 / 工业界" className={INPUT_CLS} />
            </div>
          </div>

          <div>
            <label className={LABEL_CLS}>工作/实习经历</label>
            <textarea
              value={data.work_experience}
              onChange={(e) => update('work_experience', e.target.value)}
              rows={2}
              placeholder="简要描述相关工作经历…"
              className={INPUT_CLS + ' resize-none'}
            />
          </div>
        </div>

        {/* Save */}
        <div className={`${CARD_CLS} p-5`}>
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 min-h-[44px]"
          >
            {saved ? (
              <><Check size={16} /> 已保存</>
            ) : saving ? (
              '保存中…'
            ) : (
              '保存学术档案'
            )}
          </button>
          {data.profile_completed_at && (
            <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center mt-2">
              上次更新：{new Date(data.profile_completed_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              {data.profile_version > 1 && ` · 版本 ${data.profile_version}`}
            </p>
          )}
        </div>

        {/* Quick link to chat */}
        <div className="text-center pb-4">
          <Link href="/koala/chat" className="text-xs text-blue-600 dark:text-blue-400 no-underline hover:underline">
            ← 回到 Ola 对话，让 AI 帮你补充画像
          </Link>
        </div>
      </div>
    </div>
  );
}
