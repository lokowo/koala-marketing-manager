'use client';

import { useState } from 'react';
import { Download, Copy, Check, Sparkles, Loader2 } from 'lucide-react';

interface CVItem {
  title: string;
  subtitle?: string | null;
  date?: string;
  details?: string[];
  needs_enhancement?: boolean;
}

interface CVSection {
  title: string;
  items: CVItem[];
}

interface CVData {
  version: string;
  header: {
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    linkedin?: string | null;
    website?: string | null;
  };
  sections: CVSection[];
  skills?: {
    languages?: string[];
    technical?: string[];
    soft?: string[];
  };
}

interface CVPreviewCardProps {
  versions: Record<string, CVData>;
  onPhotoUpload?: (file: File) => void;
  photoUrl?: string;
}

const VERSION_LABELS: Record<string, { label: string; desc: string }> = {
  supervisor: { label: '导师版', desc: '突出研究经历' },
  scholarship: { label: '奖学金版', desc: '突出荣誉成绩' },
  general: { label: '通用版', desc: '均衡展示' },
};

export default function CVPreviewCard({ versions, onPhotoUpload, photoUrl }: CVPreviewCardProps) {
  const versionKeys = Object.keys(versions);
  const [activeTab, setActiveTab] = useState(versionKeys[0] ?? 'general');
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [enhancingIdx, setEnhancingIdx] = useState<string | null>(null);
  const [localVersions, setLocalVersions] = useState(versions);

  const cv = localVersions[activeTab];
  if (!cv) return null;

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const res = await fetch('/api/user/generate-cv-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cv, photoUrl }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CV_${cv.header.name?.replace(/\s+/g, '_') ?? 'academic'}_${activeTab}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent fail
    } finally {
      setDownloading(false);
    }
  };

  const handleCopy = async () => {
    const lines: string[] = [];
    lines.push(cv.header.name || '');
    const contact = [cv.header.email, cv.header.phone, cv.header.address].filter(Boolean).join(' | ');
    if (contact) lines.push(contact);
    lines.push('');

    for (const section of cv.sections) {
      lines.push(section.title.toUpperCase());
      lines.push('─'.repeat(40));
      for (const item of section.items) {
        lines.push(`${item.title}${item.date ? `  (${item.date})` : ''}`);
        if (item.subtitle) lines.push(`  ${item.subtitle}`);
        for (const d of item.details ?? []) {
          lines.push(`  • ${d}`);
        }
        lines.push('');
      }
    }

    if (cv.skills) {
      lines.push('SKILLS');
      lines.push('─'.repeat(40));
      if (cv.skills.languages?.length) lines.push(`Languages: ${cv.skills.languages.join(', ')}`);
      if (cv.skills.technical?.length) lines.push(`Technical: ${cv.skills.technical.join(', ')}`);
      if (cv.skills.soft?.length) lines.push(`Soft Skills: ${cv.skills.soft.join(', ')}`);
    }

    await navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEnhance = async (sectionIdx: number, itemIdx: number) => {
    const key = `${sectionIdx}-${itemIdx}`;
    setEnhancingIdx(key);
    try {
      const item = cv.sections[sectionIdx].items[itemIdx];
      const raw = item.details?.join('\n') || item.subtitle || item.title;
      const res = await fetch('/api/user/enhance-experience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_description: raw, major: cv.header.name }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();

      setLocalVersions(prev => {
        const next = JSON.parse(JSON.stringify(prev));
        const target = next[activeTab].sections[sectionIdx].items[itemIdx];
        target.details = data.enhanced;
        target.needs_enhancement = false;
        return next;
      });
    } catch {
      // silent
    } finally {
      setEnhancingIdx(null);
    }
  };

  const handlePhotoInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onPhotoUpload) onPhotoUpload(file);
  };

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-gray-100 dark:border-white/5">
        {versionKeys.map(key => {
          const meta = VERSION_LABELS[key] ?? { label: key, desc: '' };
          const active = key === activeTab;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 py-3 text-center transition-colors ${
                active
                  ? 'bg-white dark:bg-white/[0.04] border-b-2 border-[#1A1A2E] dark:border-[#D4A843]'
                  : 'bg-gray-50 dark:bg-white/[0.01] text-gray-500 dark:text-gray-500'
              }`}
            >
              <span className={`text-sm font-medium ${active ? 'text-gray-900 dark:text-gray-100' : ''}`}>
                {meta.label}
              </span>
              <span className="block text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{meta.desc}</span>
            </button>
          );
        })}
      </div>

      {/* CV Preview */}
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h3 className="text-lg font-light text-gray-900 dark:text-gray-100">{cv.header.name}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {[cv.header.email, cv.header.phone].filter(Boolean).join(' | ')}
            </p>
            {cv.header.address && (
              <p className="text-xs text-gray-400 dark:text-gray-500">{cv.header.address}</p>
            )}
          </div>
          {/* Photo area */}
          <label className="relative flex-shrink-0 w-16 h-20 rounded border border-dashed border-gray-300 dark:border-white/20 cursor-pointer overflow-hidden flex items-center justify-center bg-gray-50 dark:bg-white/[0.03] hover:border-gray-400 dark:hover:border-white/30 transition-colors">
            {photoUrl ? (
              <img src={photoUrl} alt="CV Photo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[9px] text-gray-400 dark:text-gray-500 text-center leading-tight px-1">
                上传照片
              </span>
            )}
            <input type="file" accept="image/*" onChange={handlePhotoInput} className="absolute inset-0 opacity-0 cursor-pointer" />
          </label>
        </div>

        {/* Sections */}
        {cv.sections.map((section, si) => (
          <div key={si}>
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-white/10 pb-1 mb-2">
              {section.title}
            </h4>
            <div className="space-y-2.5">
              {section.items.map((item, ii) => (
                <div key={ii} className="relative">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.title}</span>
                        {item.needs_enhancement && (
                          <button
                            onClick={() => handleEnhance(si, ii)}
                            disabled={enhancingIdx === `${si}-${ii}`}
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors"
                          >
                            {enhancingIdx === `${si}-${ii}` ? (
                              <><Loader2 size={10} className="animate-spin" /> 润色中</>
                            ) : (
                              <><Sparkles size={10} /> AI 润色</>
                            )}
                          </button>
                        )}
                      </div>
                      {item.subtitle && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 italic">{item.subtitle}</p>
                      )}
                    </div>
                    {item.date && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap shrink-0">{item.date}</span>
                    )}
                  </div>
                  {item.details && item.details.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {item.details.map((d, di) => (
                        <li key={di} className="text-xs text-gray-600 dark:text-gray-400 pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-gray-400 dark:before:text-gray-500">
                          {d}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Skills */}
        {cv.skills && (
          <div>
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-white/10 pb-1 mb-2">
              Skills
            </h4>
            <div className="space-y-1">
              {cv.skills.languages && cv.skills.languages.length > 0 && (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Languages:</span>{' '}
                  {cv.skills.languages.join(', ')}
                </p>
              )}
              {cv.skills.technical && cv.skills.technical.length > 0 && (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Technical:</span>{' '}
                  {cv.skills.technical.join(', ')}
                </p>
              )}
              {cv.skills.soft && cv.skills.soft.length > 0 && (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Soft Skills:</span>{' '}
                  {cv.skills.soft.join(', ')}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.01]">
        <button
          onClick={handleDownloadPDF}
          disabled={downloading}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10] hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {downloading ? (
            <><Loader2 size={13} className="animate-spin" /> 生成中...</>
          ) : (
            <><Download size={13} /> 下载 PDF</>
          )}
        </button>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
        >
          {copied ? <><Check size={13} /> 已复制</> : <><Copy size={13} /> 复制文本</>}
        </button>
      </div>
    </div>
  );
}
