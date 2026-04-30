'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Search, SlidersHorizontal, Bookmark } from 'lucide-react';
import type { Professor } from '../../lib/types';

const CATEGORIES = [
  { label: '全部', value: 'all' },
  { label: 'CS·AI', value: 'cs' },
  { label: '生物医学', value: 'bio' },
  { label: '商科', value: 'biz' },
  { label: '工程', value: 'eng' },
  { label: '社科', value: 'soc' },
];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  cs: ['computer', 'machine learning', 'artificial intelligence', 'data science', 'nlp', 'deep learning', 'software'],
  bio: ['biology', 'biomedical', 'genomics', 'medical', 'health', 'neuroscience', 'biochemistry'],
  biz: ['business', 'finance', 'economics', 'management', 'marketing', 'accounting'],
  eng: ['engineering', 'robotics', 'mechanical', 'electrical', 'civil', 'materials'],
  soc: ['social', 'psychology', 'sociology', 'education', 'anthropology', 'history'],
};

export default function ProfessorsPage() {
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '50' });
    if (search) params.set('search', search);
    fetch(`/api/professors?${params}`)
      .then(r => r.json())
      .then(d => setProfessors(d.professors ?? d.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search]);

  const filtered = professors.filter(p => {
    if (category === 'all') return true;
    const keywords = CATEGORY_KEYWORDS[category] ?? [];
    const areasStr = (p.researchAreas ?? []).join(' ').toLowerCase();
    const facultyStr = (p.faculty ?? '').toLowerCase();
    return keywords.some(k => areasStr.includes(k) || facultyStr.includes(k));
  });

  return (
    <div style={{ background: '#faf6ec', minHeight: '100vh', paddingBottom: 100 }}>
      {/* Header */}
      <div className="flex px-4 pt-4 pb-2 justify-between items-center">
        <Link
          href="/koala/home"
          className="size-10 rounded-full flex justify-center items-center no-underline"
          style={{ background: '#f0e9d6' }}
        >
          <ChevronLeft className="size-5" style={{ color: '#1a2332' }} />
        </Link>
        <h1 className="font-bold text-lg leading-7" style={{ color: '#1a2332' }}>教授库</h1>
        <button
          className="size-10 rounded-full flex justify-center items-center"
          style={{ background: '#f0e9d6' }}
        >
          <SlidersHorizontal className="size-5" style={{ color: '#c4a050' }} />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pt-2">
        <div
          className="rounded-2xl flex px-4 py-3 items-center gap-2"
          style={{ background: '#f0e9d6' }}
        >
          <Search className="size-4" style={{ color: '#8a8470' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索教授姓名、学校、研究方向…"
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: '#1a2332' }}
          />
        </div>
      </div>

      {/* Category pills */}
      <div className="overflow-x-auto flex px-4 pt-4 gap-2 pb-1">
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => setCategory(cat.value)}
            className="whitespace-nowrap text-xs leading-4 px-4 py-2 rounded-full transition-colors"
            style={
              category === cat.value
                ? { background: '#c4a050', color: '#fff', fontWeight: 700 }
                : { background: '#fff', color: '#1a2332', border: '1px solid #e5dcc3' }
            }
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex px-4 pt-4 pb-8 flex-col gap-4">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-2xl animate-pulse" style={{ background: '#f2ead6', height: 104 }} />
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-sm" style={{ color: '#907858' }}>
            {search ? `未找到与"${search}"相关的教授` : '暂无教授数据'}
          </div>
        ) : (
          filtered.map(p => (
            <Link
              key={p.id}
              href={`/koala/professors/${p.id}`}
              className="rounded-2xl bg-white flex p-4 gap-3 no-underline"
              style={{ boxShadow: '0 4px 16px rgba(196,160,80,0.12)' }}
            >
              <div
                className="size-16 shrink-0 rounded-full flex items-center justify-center text-2xl overflow-hidden"
                style={{ background: '#f0e9d6' }}
              >
                👨‍🔬
              </div>
              <div className="min-w-0 flex flex-col flex-1 gap-1">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-bold text-base leading-6" style={{ color: '#1a2332' }}>
                      {p.positionTitle ? `${p.positionTitle} ` : ''}{p.name}
                    </h3>
                    <p className="text-xs leading-4" style={{ color: '#7a7468' }}>{p.university}</p>
                  </div>
                  <Bookmark className="size-5 shrink-0" style={{ color: '#c4a050' }} />
                </div>
                <div className="flex mt-1 flex-wrap gap-1">
                  {(p.researchAreas ?? []).slice(0, 3).map(area => (
                    <span
                      key={area}
                      className="rounded-full text-[10px] px-2 py-0.5"
                      style={{ border: '1px solid #c4a050', color: '#c4a050' }}
                    >
                      {area}
                    </span>
                  ))}
                </div>
                <div className="flex mt-1 justify-end">
                  <span className="font-medium text-xs leading-4" style={{ color: '#c4a050' }}>
                    查看详情 ›
                  </span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
