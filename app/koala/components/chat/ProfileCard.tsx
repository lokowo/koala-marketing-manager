'use client';

import { useState, useCallback } from 'react';
import { Check, Download, Pencil, X } from 'lucide-react';
import type { ExtractedProfile } from '../../../lib/chat/extract-profile';

interface ProfileCardProps {
  data: ExtractedProfile;
  onConfirm: (data: ExtractedProfile) => Promise<void>;
}

// Inline-editable text field
function EditableField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500 dark:text-gray-400 w-16 shrink-0">{label}</span>
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { onChange(draft); setEditing(false); }
            if (e.key === 'Escape') { setDraft(value); setEditing(false); }
          }}
          className="flex-1 min-w-0 h-7 px-2 text-sm bg-white dark:bg-white/10 border border-blue-400 dark:border-blue-500/50 rounded text-gray-900 dark:text-gray-100 outline-none"
        />
        <button onClick={() => { onChange(draft); setEditing(false); }} className="p-0.5 text-blue-600 dark:text-blue-400">
          <Check size={14} />
        </button>
        <button onClick={() => { setDraft(value); setEditing(false); }} className="p-0.5 text-gray-400">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 group cursor-pointer" onClick={() => setEditing(true)}>
      <span className="text-xs text-gray-500 dark:text-gray-400 w-16 shrink-0">{label}</span>
      <span className="text-sm text-gray-900 dark:text-gray-100 flex-1 min-w-0 truncate">
        {value || <span className="text-gray-400 dark:text-gray-500 italic">未填写</span>}
      </span>
      <Pencil size={12} className="text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </div>
  );
}

// Tag editor for arrays (research interests, strengths, etc.)
function TagField({
  label,
  icon,
  tags,
  onChange,
}: {
  label: string;
  icon: string;
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  const addTag = () => {
    const trimmed = draft.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setDraft('');
    setAdding(false);
  };

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-sm">{icon}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tags.map(tag => (
          <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 rounded">
            {tag}
            <button onClick={() => onChange(tags.filter(t => t !== tag))} className="text-blue-400 dark:text-blue-500 hover:text-blue-600">
              <X size={10} />
            </button>
          </span>
        ))}
        {adding ? (
          <input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addTag(); if (e.key === 'Escape') { setDraft(''); setAdding(false); } }}
            onBlur={addTag}
            placeholder="输入后回车"
            className="h-6 px-2 text-xs bg-white dark:bg-white/10 border border-blue-400 dark:border-blue-500/50 rounded outline-none text-gray-900 dark:text-gray-100 w-24"
          />
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="px-2 py-0.5 text-xs text-gray-400 dark:text-gray-500 border border-dashed border-gray-300 dark:border-gray-600 rounded hover:border-blue-400 hover:text-blue-500 transition-colors"
          >
            + 添加
          </button>
        )}
      </div>
    </div>
  );
}

export function ProfileCard({ data, onConfirm }: ProfileCardProps) {
  const [profile, setProfile] = useState<ExtractedProfile>({ ...data });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const update = useCallback((key: keyof ExtractedProfile, value: unknown) => {
    setProfile(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await onConfirm(profile);
      setSaved(true);
    } catch {
      // error handled by parent
    } finally {
      setSaving(false);
    }
  };

  const degreeLabel = profile.degree_level || '';
  const schoolLine = [profile.university, profile.major, degreeLabel].filter(Boolean).join(' / ');
  const gpaLine = profile.gpa ? `${profile.gpa}${profile.gpa_scale ? ` / ${profile.gpa_scale}` : ''}` : '';

  return (
    <div className="mt-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-blue-50/50 dark:from-blue-500/10 dark:to-transparent border-b border-gray-200 dark:border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
            <span className="text-sm">🎓</span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">学术画像</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">点击任意字段可修改</p>
          </div>
        </div>
      </div>

      {/* Fields */}
      <div className="px-4 py-3 space-y-2.5">
        {/* Name */}
        {profile.name && (
          <EditableField label="姓名" value={profile.name} onChange={v => update('name', v)} />
        )}

        {/* School / Major / Degree */}
        <div className="flex items-center gap-1.5 group cursor-pointer">
          <span className="text-sm">🏫</span>
          <span className="text-sm text-gray-900 dark:text-gray-100">{schoolLine || '未填写院校信息'}</span>
        </div>
        <div className="ml-6 space-y-1.5">
          <EditableField label="院校" value={profile.university || ''} onChange={v => update('university', v)} />
          <EditableField label="专业" value={profile.major || ''} onChange={v => update('major', v)} />
          <EditableField label="学历" value={profile.degree_level || ''} onChange={v => update('degree_level', v)} />
        </div>

        {/* GPA */}
        <div className="flex items-center gap-1.5">
          <span className="text-sm">📊</span>
          <EditableField label="GPA" value={gpaLine} onChange={v => {
            const parts = v.split('/').map(s => s.trim());
            update('gpa', parts[0]);
            if (parts[1]) update('gpa_scale', parts[1]);
          }} />
        </div>

        {/* English */}
        {(profile.english_level !== undefined) && (
          <div className="flex items-center gap-1.5">
            <span className="text-sm">🌐</span>
            <EditableField label="英语" value={profile.english_level || ''} onChange={v => update('english_level', v)} />
          </div>
        )}

        {/* Research interests */}
        <TagField
          label="研究兴趣"
          icon="🔬"
          tags={profile.research_interests ?? []}
          onChange={tags => update('research_interests', tags)}
        />

        {/* Strengths */}
        {(profile.strengths && profile.strengths.length > 0) && (
          <TagField
            label="个人特长"
            icon="💡"
            tags={profile.strengths}
            onChange={tags => update('strengths', tags)}
          />
        )}

        {/* Publications */}
        {profile.publications && profile.publications.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-sm">📝</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">论文</span>
            </div>
            <ul className="ml-6 space-y-1">
              {profile.publications.map((pub, i) => (
                <li key={i} className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                  {pub}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Target preferences */}
        <div className="pt-1 border-t border-gray-100 dark:border-white/5 space-y-1.5">
          {profile.target_field && (
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🎯</span>
              <EditableField label="目标方向" value={profile.target_field} onChange={v => update('target_field', v)} />
            </div>
          )}
          {profile.target_degree && (
            <EditableField label="目标学位" value={profile.target_degree} onChange={v => update('target_degree', v)} />
          )}
          {profile.preferred_universities && profile.preferred_universities.length > 0 && (
            <TagField
              label="目标大学"
              icon="🏛️"
              tags={profile.preferred_universities}
              onChange={tags => update('preferred_universities', tags)}
            />
          )}
          {profile.career_goal && (
            <EditableField label="职业目标" value={profile.career_goal} onChange={v => update('career_goal', v)} />
          )}
          {profile.start_semester && (
            <EditableField label="入学时间" value={profile.start_semester} onChange={v => update('start_semester', v)} />
          )}
        </div>

        {/* Research experience */}
        {profile.research_description && (
          <div className="pt-1 border-t border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-sm">🧪</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">科研经历</span>
            </div>
            <p className="ml-6 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
              {profile.research_description}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] flex gap-2">
        <button
          onClick={handleConfirm}
          disabled={saving || saved}
          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50
            bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          {saved ? (
            <><Check size={14} /> 已保存</>
          ) : saving ? (
            '保存中...'
          ) : (
            <><Check size={14} /> 确认无误</>
          )}
        </button>
        <button
          disabled
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-white/10 text-gray-400 dark:text-gray-500 bg-white dark:bg-white/5 cursor-not-allowed"
          title="即将推出"
        >
          <Download size={14} /> 导出 CV
        </button>
      </div>
    </div>
  );
}
