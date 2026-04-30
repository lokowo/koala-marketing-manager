'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import type { StudentProfile } from '../../lib/types';

interface ProfileState {
  profile: StudentProfile | null;
  fileName: string | null;
  updatedAt: string | null;
}

const FIELD_LABELS: Partial<Record<keyof StudentProfile, string>> = {
  major: '专业',
  degreeLevel: '学历层次',
  gpa: 'GPA',
  gpaScale: 'GPA 满分',
  university: '就读学校',
  graduationYear: '毕业年份',
  hasResearchExperience: '有科研经历',
  researchSummary: '科研经历',
  publications: '论文发表数',
  technicalSkills: '技术技能',
  programmingLanguages: '编程语言',
  researchInterests: '研究方向',
  targetDegree: '目标学位',
  targetField: '目标领域',
};

export default function MyProfilePage() {
  const [data, setData] = useState<ProfileState>({ profile: null, fileName: null, updatedAt: null });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<Partial<StudentProfile> | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/user/profile')
      .then(r => r.json())
      .then(d => {
        if (d.profile) {
          setData({ profile: d.profile.parsed_data, fileName: d.profile.file_name, updatedAt: d.profile.updated_at });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleUpload(file: File) {
    setUploading(true);
    setUploadMsg('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/user/profile/parse', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed');
      const profile = json.profile as StudentProfile;
      // Save to DB
      await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parsed_data: profile, file_name: file.name }),
      });
      setData({ profile, fileName: file.name, updatedAt: new Date().toISOString() });
      setUploadMsg('✅ 文件解析成功！');
    } catch (e) {
      setUploadMsg(`❌ ${(e as Error).message}`);
    } finally {
      setUploading(false);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    const merged = { ...data.profile, ...editing } as StudentProfile;
    await fetch('/api/user/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parsed_data: merged }),
    });
    setData(prev => ({ ...prev, profile: merged }));
    setEditing(null);
    setSaving(false);
  }

  const p = editing ?? data.profile;

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen" style={{ background: '#faf6ec' }}>
        <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid #eee4cc' }}>
          <h1 className="text-base font-bold" style={{ color: '#1a2332' }}>个人数据中心</h1>
        </div>
        <div className="flex items-center justify-center flex-1">
          <div className="animate-pulse text-sm" style={{ color: '#907858' }}>加载中…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#faf6ec', paddingBottom: 80 }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex-shrink-0" style={{ borderBottom: '1px solid #eee4cc' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold" style={{ color: '#1a2332' }}>个人数据中心</h1>
            <p className="text-[11px] mt-0.5" style={{ color: '#907858' }}>AI 解析你的简历，自动填写背景信息</p>
          </div>
          {data.profile && (
            <button
              onClick={() => setEditing(data.profile ? { ...data.profile } : {})}
              className="text-xs px-3 py-1.5 rounded-xl font-medium"
              style={{ background: '#f2ead6', color: '#7d6340', border: '1px solid #d8c8a8' }}
            >
              编辑
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-lg mx-auto w-full">
        {/* Upload area */}
        <div
          className="rounded-2xl p-5 border-2 border-dashed text-center cursor-pointer"
          style={{ borderColor: uploading ? '#c4a050' : '#d8c8a8', background: '#fff' }}
          onClick={() => !uploading && fileRef.current?.click()}
        >
          <div className="text-2xl mb-2">{uploading ? '⏳' : '📄'}</div>
          <div className="text-sm font-semibold" style={{ color: '#1a2332' }}>
            {uploading ? '正在解析…' : data.profile ? '重新上传简历' : '上传简历 / 成绩单'}
          </div>
          <p className="text-[11px] mt-1" style={{ color: '#907858' }}>
            {data.fileName ? `当前文件：${data.fileName}` : '支持 PDF、图片格式'}
          </p>
          {uploadMsg && (
            <p className="text-[11px] mt-2" style={{ color: uploadMsg.startsWith('✅') ? '#5a8060' : '#b06040' }}>{uploadMsg}</p>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,image/*"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
          />
        </div>

        {/* Profile data */}
        {data.profile ? (
          <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #e8dcc8' }}>
            <div className="px-4 py-3" style={{ borderBottom: '1px solid #f0e8d4' }}>
              <span className="text-xs font-semibold" style={{ color: '#1a2332' }}>📋 解析结果</span>
              {data.updatedAt && (
                <span className="text-[10px] ml-2" style={{ color: '#b09878' }}>
                  更新于 {new Date(data.updatedAt).toLocaleDateString('zh-CN')}
                </span>
              )}
            </div>
            <div className="divide-y" style={{ borderColor: '#f0e8d4' }}>
              {(Object.entries(FIELD_LABELS) as [keyof StudentProfile, string][]).map(([key, label]) => {
                const val = p?.[key];
                if (val === undefined || val === null || val === '') return null;
                const display = Array.isArray(val)
                  ? (val as string[]).join(', ') || '—'
                  : typeof val === 'boolean'
                  ? (val ? '是' : '否')
                  : String(val);

                return (
                  <div key={key} className="flex items-start gap-3 px-4 py-2.5">
                    <span className="text-[11px] w-24 flex-shrink-0 pt-0.5" style={{ color: '#907858' }}>{label}</span>
                    {editing ? (
                      Array.isArray(val) ? (
                        <input
                          className="flex-1 text-xs outline-none border-b"
                          style={{ borderColor: '#d8c8a8', color: '#1a2332' }}
                          defaultValue={(val as string[]).join(', ')}
                          onChange={e => setEditing(prev => ({
                            ...prev,
                            [key]: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                          }))}
                        />
                      ) : (
                        <input
                          className="flex-1 text-xs outline-none border-b"
                          style={{ borderColor: '#d8c8a8', color: '#1a2332' }}
                          defaultValue={String(val)}
                          onChange={e => setEditing(prev => ({ ...prev, [key]: e.target.value }))}
                        />
                      )
                    ) : (
                      <span className="flex-1 text-xs" style={{ color: '#1a2332' }}>{display}</span>
                    )}
                  </div>
                );
              })}
            </div>
            {editing && (
              <div className="flex gap-2 px-4 py-3" style={{ borderTop: '1px solid #f0e8d4' }}>
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold text-white"
                  style={{ background: '#c4a050' }}
                >
                  {saving ? '保存中…' : '保存'}
                </button>
                <button
                  onClick={() => setEditing(null)}
                  className="flex-1 py-2 rounded-xl text-xs font-medium"
                  style={{ background: '#f2ead6', color: '#7d6340' }}
                >
                  取消
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm font-medium mb-1" style={{ color: '#1a2332' }}>还没有上传过简历</p>
            <p className="text-xs" style={{ color: '#907858' }}>上传后 AI 会自动解析你的背景信息，帮你更快匹配教授</p>
          </div>
        )}

        <Link
          href="/koala/chat"
          className="block text-center py-3 rounded-xl text-sm font-semibold no-underline"
          style={{ background: '#1a2332', color: '#fff' }}
        >
          🐨 用我的背景匹配教授
        </Link>
      </div>
    </div>
  );
}
