'use client';

import { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft, Search, SlidersHorizontal, Bookmark, Loader2,
  X, GraduationCap, BookOpen, TrendingUp, MessageSquarePlus,
} from 'lucide-react';
import type { Professor } from '../../lib/types';

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  { label: '全部',   value: 'all'    },
  { label: '医学健康', value: 'health' },
  { label: '物理天文', value: 'physics' },
  { label: '生命科学', value: 'bio'    },
  { label: '地球科学', value: 'earth'  },
  { label: '心理神经', value: 'neuro'  },
  { label: 'CS·AI',  value: 'cs'     },
  { label: '工程',   value: 'eng'    },
  { label: '社科',   value: 'soc'    },
];

const HOT_TAGS = ['AI', 'Machine Learning', 'Neuroscience', 'Data Science', 'Finance', 'Education'];

const UNI_COLORS: Record<string, { bg: string; fg: string; short: string }> = {
  'Australian National University':        { bg: '#c4a050', fg: '#1a2332', short: 'ANU' },
  'University of Melbourne':               { bg: '#003087', fg: '#fff',    short: 'MEL' },
  'University of Sydney':                  { bg: '#cc0000', fg: '#fff',    short: 'SYD' },
  'UNSW Sydney':                           { bg: '#1a1a1a', fg: '#ffe600', short: 'NSW' },
  'University of Queensland':              { bg: '#51247a', fg: '#fff',    short: 'UQ'  },
  'Monash University':                     { bg: '#006dae', fg: '#fff',    short: 'MON' },
  'University of Western Australia':       { bg: '#003087', fg: '#fff',    short: 'UWA' },
  'University of Adelaide':                { bg: '#005a9c', fg: '#fff',    short: 'ADE' },
  'University of Technology Sydney':       { bg: '#00a3e0', fg: '#fff',    short: 'UTS' },
  'RMIT University':                       { bg: '#e60028', fg: '#fff',    short: 'RMT' },
  'Macquarie University':                  { bg: '#e8291c', fg: '#fff',    short: 'MAC' },
  'Queensland University of Technology':   { bg: '#005a9c', fg: '#fff',    short: 'QUT' },
  'Deakin University':                     { bg: '#00a86b', fg: '#fff',    short: 'DEA' },
  'Griffith University':                   { bg: '#d4380d', fg: '#fff',    short: 'GRF' },
  'La Trobe University':                   { bg: '#e84e1b', fg: '#fff',    short: 'LAT' },
  'University of Newcastle':               { bg: '#1f1646', fg: '#fff',    short: 'NEW' },
  'University of Wollongong':              { bg: '#1e5799', fg: '#fff',    short: 'WOL' },
  'Flinders University':                   { bg: '#004f9f', fg: '#fff',    short: 'FLI' },
  'Curtin University':                     { bg: '#cfb44b', fg: '#1a2332', short: 'CUR' },
  'James Cook University':                 { bg: '#005c84', fg: '#fff',    short: 'JCU' },
  'Swinburne University of Technology':    { bg: '#bb0000', fg: '#fff',    short: 'SWI' },
  'Western Sydney University':             { bg: '#e52020', fg: '#fff',    short: 'WSY' },
};

const LIMIT = 20;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getUniBadge(university: string) {
  if (UNI_COLORS[university]) return UNI_COLORS[university];
  // fallback: first 3 letters, blue-grey
  const letters = university.replace(/University of |University /gi, '').slice(0, 3).toUpperCase();
  return { bg: '#5a6878', fg: '#fff', short: letters };
}

function fmtCitations(n?: number): string {
  if (!n) return '';
  if (n >= 100000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function getStatusBadge(s?: string): { label: string; bg: string; color: string } | null {
  if (s === 'yes')    return { label: '招生中', bg: 'rgba(34,197,94,0.15)', color: '#22c55e' };
  if (s === 'no')     return { label: '暂不招生', bg: 'rgba(239,68,68,0.15)', color: '#ef4444' };
  return null;
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

type Filters = {
  page: number;
  search: string;
  category: string;
  accepting: string;   // '' | 'yes'
  hIndexMin: number;   // 0 = no filter
  sortBy: string;
};

async function apiFetch(f: Filters) {
  const q = new URLSearchParams({ page: String(f.page), limit: String(LIMIT) });
  if (f.search)             q.set('search', f.search);
  if (f.category !== 'all') q.set('category', f.category);
  if (f.accepting)          q.set('acceptingStudents', f.accepting);
  if (f.hIndexMin)          q.set('hIndexMin', String(f.hIndexMin));
  if (f.sortBy !== 'opportunity_score') q.set('sortBy', f.sortBy);
  const res = await fetch(`/api/professors?${q}`);
  if (!res.ok) throw new Error('fetch failed');
  return res.json() as Promise<{ data: Professor[]; total: number; hasMore: boolean }>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfessorsPage() {
  return (
    <Suspense fallback={
      <div style={{ background: '#080c10', minHeight: '100vh' }} className="flex items-center justify-center">
        <p className="text-sm" style={{ color: '#6a7a7e' }}>加载中…</p>
      </div>
    }>
      <ProfessorsPageInner />
    </Suspense>
  );
}

function ProfessorsPageInner() {
  const searchParams = useSearchParams();
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filters — initialize category from URL param if provided
  const [search, setSearch]         = useState('');
  const [debouncedSearch, setDB]    = useState('');
  const [category, setCategory]     = useState(() => searchParams.get('category') ?? 'all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [accepting, setAccepting]   = useState('');        // '' | 'yes'
  const [hIndexMin, setHIndexMin]   = useState(0);
  const [sortBy, setSortBy]         = useState('opportunity_score');

  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Active filter count for badge
  const activeFilters = [accepting !== '', hIndexMin > 0, sortBy !== 'opportunity_score'].filter(Boolean).length;

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDB(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const filters: Filters = { page: 1, search: debouncedSearch, category, accepting, hIndexMin, sortBy };

  // Reset + load on filter change
  useEffect(() => {
    setLoading(true);
    setProfessors([]);
    setPage(1);
    setHasMore(true);
    apiFetch(filters)
      .then(d => { setProfessors(d.data); setTotal(d.total); setHasMore(d.hasMore); setPage(2); })
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, category, accepting, hIndexMin, sortBy]);

  // Category counts once on mount
  useEffect(() => {
    Promise.all(
      ['health', 'physics', 'bio', 'earth', 'neuro', 'cs', 'eng', 'soc'].map(c =>
        fetch(`/api/professors?category=${c}&limit=1`)
          .then(r => r.json()).then(d => [c, d.total ?? 0] as [string, number]).catch(() => [c, 0] as [string, number])
      )
    ).then(results => setCategoryCounts(Object.fromEntries(results)));
  }, []);

  // Load more
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    apiFetch({ ...filters, page })
      .then(d => { setProfessors(prev => [...prev, ...d.data]); setHasMore(d.hasMore); setPage(p => p + 1); })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, category, accepting, hIndexMin, sortBy, loadingMore, hasMore]);

  // Intersection observer
  useEffect(() => {
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) loadMore(); },
      { rootMargin: '200px' }
    );
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [loadMore]);

  return (
    <div style={{ background: '#080c10', minHeight: '100vh', paddingBottom: 120 }}>

      {/* Filter backdrop — mobile only */}
      {filterOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setFilterOpen(false)} />
      )}

      {/* Mobile Header — hidden on desktop */}
      <div className="flex lg:hidden px-4 pt-4 pb-2 justify-between items-center">
        <Link href="/koala/discover" className="size-10 rounded-full flex justify-center items-center" style={{ background: 'rgba(201,169,110,0.1)' }}>
          <ChevronLeft className="size-5" style={{ color: '#c9a96e' }} />
        </Link>
        <div className="flex flex-col items-center">
          <h1 className="font-bold text-lg leading-7" style={{ color: '#e8e4dc' }}>教授库</h1>
          {total !== null && (
            <span className="text-xs" style={{ color: '#6a7a7e' }}>共 {total.toLocaleString()} 位导师</span>
          )}
        </div>
        <button
          onClick={() => setFilterOpen(true)}
          className="size-10 rounded-full flex justify-center items-center relative"
          style={{ background: activeFilters ? '#c9a96e' : 'rgba(201,169,110,0.1)' }}
        >
          <SlidersHorizontal className="size-5" style={{ color: activeFilters ? '#080c10' : '#c9a96e' }} />
          {activeFilters > 0 && (
            <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full text-[10px] font-bold flex items-center justify-center"
              style={{ background: '#cc4444', color: '#fff' }}>
              {activeFilters}
            </span>
          )}
        </button>
      </div>

      {/* Desktop title */}
      <div className="hidden lg:flex items-baseline gap-3 pt-6 pb-2">
        <h1 className="font-bold text-2xl" style={{ color: '#e8e4dc' }}>教授库</h1>
        {total !== null && <span className="text-sm" style={{ color: '#6a7a7e' }}>共 {total.toLocaleString()} 位导师</span>}
      </div>

      {/* Desktop layout: sidebar + list */}
      <div className="lg:flex lg:gap-6 lg:items-start">

        {/* ── Left sidebar (desktop only) ── */}
        <aside className="hidden lg:block lg:w-64 lg:flex-shrink-0 lg:sticky lg:top-20">
          {/* Search */}
          <div className="rounded-2xl flex px-4 py-3 items-center gap-2 mb-3" style={{ background: '#111c28', border: '1px solid rgba(201,169,110,0.12)' }}>
            <Search className="size-4 shrink-0" style={{ color: '#6a7a7e' }} />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="搜索教授、学校、研究方向…"
              className="flex-1 bg-transparent text-sm outline-none" style={{ color: '#e8e4dc' }}
            />
            {search && <button onClick={() => setSearch('')} className="text-xs" style={{ color: '#c9a96e' }}>清除</button>}
          </div>

          {/* Hot tags */}
          {!search && (
            <div className="flex flex-wrap gap-2 mb-4">
              {HOT_TAGS.map(tag => (
                <button key={tag} onClick={() => setSearch(tag)}
                  className="text-xs px-3 py-1 rounded-full"
                  style={{ background: 'rgba(201,169,110,0.08)', color: '#c9a96e', border: '1px solid rgba(201,169,110,0.2)' }}>
                  {tag}
                </button>
              ))}
            </div>
          )}

          {/* Categories */}
          <div className="rounded-2xl overflow-hidden mb-3" style={{ background: '#111c28', border: '1px solid rgba(201,169,110,0.12)' }}>
            <div className="px-3 py-2.5 text-xs font-semibold" style={{ color: '#a8b8ac', borderBottom: '1px solid rgba(201,169,110,0.12)' }}>研究方向</div>
            {CATEGORIES.map(cat => {
              const count = cat.value === 'all' ? total : (categoryCounts[cat.value] ?? null);
              const active = category === cat.value;
              return (
                <button key={cat.value} onClick={() => setCategory(cat.value)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs transition-colors"
                  style={active
                    ? { background: '#c9a96e', color: '#080c10', fontWeight: 700 }
                    : { background: 'transparent', color: '#e8e4dc' }}>
                  <span>{cat.label}</span>
                  {count !== null && (
                    <span className="text-[10px]" style={{ opacity: active ? 0.85 : 0.5 }}>
                      {count >= 1000 ? `${Math.floor(count / 100) / 10}k` : count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Filters */}
          <div className="rounded-2xl overflow-hidden mb-3" style={{ background: '#111c28', border: '1px solid rgba(201,169,110,0.12)' }}>
            <div className="px-3 py-2.5 text-xs font-semibold" style={{ color: '#a8b8ac', borderBottom: '1px solid rgba(201,169,110,0.12)' }}>招生状态</div>
            {[['', '全部'], ['yes', '🟢 招生中']].map(([v, label]) => (
              <button key={v} onClick={() => setAccepting(v)}
                className="w-full text-left px-3 py-2 text-xs transition-colors"
                style={accepting === v ? { background: '#c9a96e', color: '#080c10', fontWeight: 600 } : { background: 'transparent', color: '#e8e4dc' }}>
                {label}
              </button>
            ))}
          </div>

          <div className="rounded-2xl overflow-hidden mb-3" style={{ background: '#111c28', border: '1px solid rgba(201,169,110,0.12)' }}>
            <div className="px-3 py-2.5 text-xs font-semibold" style={{ color: '#a8b8ac', borderBottom: '1px solid rgba(201,169,110,0.12)' }}>H指数</div>
            {[[0, '全部'], [10, 'H ≥ 10'], [20, 'H ≥ 20'], [40, 'H ≥ 40'], [80, 'H ≥ 80']].map(([v, label]) => (
              <button key={v} onClick={() => setHIndexMin(Number(v))}
                className="w-full text-left px-3 py-2 text-xs transition-colors"
                style={hIndexMin === Number(v) ? { background: '#c9a96e', color: '#080c10', fontWeight: 600 } : { background: 'transparent', color: '#e8e4dc' }}>
                {label}
              </button>
            ))}
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ background: '#111c28', border: '1px solid rgba(201,169,110,0.12)' }}>
            <div className="px-3 py-2.5 text-xs font-semibold" style={{ color: '#a8b8ac', borderBottom: '1px solid rgba(201,169,110,0.12)' }}>排序</div>
            {[['opportunity_score','⭐ 推荐度'],['h_index','📈 H指数'],['paper_count','📄 论文数'],['citation_count','📊 引用数']].map(([v, label]) => (
              <button key={v} onClick={() => setSortBy(v)}
                className="w-full text-left px-3 py-2 text-xs transition-colors"
                style={sortBy === v ? { background: '#c9a96e', color: '#080c10', fontWeight: 600 } : { background: 'transparent', color: '#e8e4dc' }}>
                {label}
              </button>
            ))}
          </div>
        </aside>

        {/* ── Right: main content ── */}
        <div className="lg:flex-1 lg:min-w-0">

      {/* Mobile Search */}
      <div className="px-4 pt-2 lg:hidden">
        <div className="rounded-2xl flex px-4 py-3 items-center gap-2" style={{ background: '#111c28', border: '1px solid rgba(201,169,110,0.12)' }}>
          <Search className="size-4 shrink-0" style={{ color: '#6a7a7e' }} />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="搜索教授、学校、研究方向…"
            className="flex-1 bg-transparent text-sm outline-none" style={{ color: '#e8e4dc' }}
          />
          {search && <button onClick={() => setSearch('')} className="text-xs" style={{ color: '#c9a96e' }}>清除</button>}
        </div>
        {!search && <p className="text-xs mt-2 px-1" style={{ color: '#6a7a7e' }}>输入你的研究方向，找到最匹配的导师</p>}
      </div>

      {/* Mobile Hot tags */}
      {!search && (
        <div className="flex flex-wrap px-4 pt-2 gap-2 lg:hidden">
          {HOT_TAGS.map(tag => (
            <button key={tag} onClick={() => setSearch(tag)}
              className="text-xs px-3 py-1 rounded-full"
              style={{ background: 'rgba(201,169,110,0.08)', color: '#c9a96e', border: '1px solid rgba(201,169,110,0.2)' }}>
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Mobile Category tabs */}
      <div className="overflow-x-auto flex px-4 pt-4 gap-2 pb-1 no-scrollbar lg:hidden">
        {CATEGORIES.map(cat => {
          const count = cat.value === 'all' ? total : (categoryCounts[cat.value] ?? null);
          const active = category === cat.value;
          return (
            <button key={cat.value} onClick={() => setCategory(cat.value)}
              className="whitespace-nowrap text-xs px-3 py-2 rounded-full transition-colors flex items-center gap-1"
              style={active
                ? { background: '#c9a96e', color: '#080c10', fontWeight: 700 }
                : { background: '#111c28', color: '#e8e4dc', border: '1px solid rgba(201,169,110,0.15)' }}>
              {cat.label}
              {count !== null && (
                <span className="text-[10px]" style={{ opacity: active ? 0.85 : 0.5 }}>
                  {count >= 1000 ? `${Math.floor(count / 100) / 10}k` : count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sort hint */}
      {sortBy !== 'opportunity_score' && (
        <div className="px-4 pt-2 flex items-center gap-1">
          <span className="text-xs" style={{ color: '#6a7a7e' }}>排序：
            {{ h_index: 'H指数', paper_count: '论文数', citation_count: '引用数', updated_at: '最近更新' }[sortBy] ?? sortBy}
          </span>
          <button onClick={() => setSortBy('opportunity_score')} className="text-xs underline" style={{ color: '#c9a96e' }}>重置</button>
        </div>
      )}

      {/* List */}
      <div className="flex px-4 pt-4 pb-2 flex-col gap-4 lg:px-0 lg:grid lg:grid-cols-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl animate-pulse" style={{ background: '#111c28', height: 160 }} />
          ))
        ) : professors.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3 lg:col-span-2">
            <span className="text-4xl">🔍</span>
            <p className="font-medium text-sm" style={{ color: '#e8e4dc' }}>
              {search ? `未找到与"${search}"相关的导师` : '暂无匹配数据'}
            </p>
            <p className="text-xs text-center" style={{ color: '#6a7a7e' }}>
              {search ? '试试换个关键词，或点击热门标签' : '尝试调整筛选条件'}
            </p>
            <div className="flex gap-2 mt-1">
              {search && <button onClick={() => setSearch('')} className="text-xs px-4 py-2 rounded-full" style={{ background: '#c9a96e', color: '#080c10' }}>清除搜索</button>}
              {activeFilters > 0 && <button onClick={() => { setAccepting(''); setHIndexMin(0); setSortBy('opportunity_score'); }} className="text-xs px-4 py-2 rounded-full" style={{ background: '#111c28', color: '#e8e4dc' }}>清除筛选</button>}
            </div>
            <Link href="/koala/chat" className="mt-2 text-xs px-5 py-2 rounded-full no-underline" style={{ background: '#c9a96e', color: '#080c10' }}>
              让 Koala AI 帮我匹配 →
            </Link>
          </div>
        ) : (
          professors.map(p => <ProfCard key={p.id} p={p} />)
        )}
      </div>

      {/* Sentinel for infinite scroll - must be outside grid */}
      <div ref={sentinelRef} className="h-4 px-4" />

      {loadingMore && (
        <div className="flex justify-center py-4">
          <Loader2 className="size-5 animate-spin" style={{ color: '#c4a050' }} />
        </div>
      )}

      {!loading && !hasMore && professors.length > 0 && (
        <div className="px-4 pb-4 lg:px-0 space-y-3">
          <p className="text-center text-xs py-2" style={{ color: '#6a7a7e' }}>
            已加载全部 {professors.length.toLocaleString()} 位导师
          </p>
          <Link href="/koala/chat"
            className="mx-auto block text-center text-sm font-medium py-3 px-6 rounded-2xl no-underline"
            style={{ background: '#c9a96e', color: '#080c10', maxWidth: 280 }}>
            没找到理想导师？让 Koala AI 精准匹配 →
          </Link>
          <div className="mt-4 px-2 py-3 rounded-xl text-[11px] leading-relaxed" style={{ background: '#111c28', color: '#6a7a7e', border: '1px solid rgba(201,169,110,0.12)' }}>
            以上数据来自大学官网、Google Scholar 及公开数据库，仅供参考。经费与招生状态可能与实际情况存在差异，请直接联系导师核实。如发现信息有误，欢迎反馈至{' '}
            <a href="mailto:info@koalaphd.com" style={{ color: '#c9a96e' }}>info@koalaphd.com</a>
          </div>
        </div>
      )}
      </div>{/* end right panel */}
      </div>{/* end lg:flex */}

      {/* Filter bottom sheet — mobile only */}
      <div
        className="lg:hidden fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 overflow-y-auto"
        style={{
          transform: filterOpen ? 'translateY(0)' : 'translateY(100%)',
          background: '#0d1520',
          borderRadius: '20px 20px 0 0',
          maxHeight: '75vh',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
          border: '1px solid rgba(201,169,110,0.12)',
        }}
      >
        <div className="px-4 pt-3 pb-6">
          {/* Handle */}
          <div className="mx-auto mb-4 rounded-full" style={{ width: 36, height: 4, background: 'rgba(201,169,110,0.3)' }} />

          <div className="flex justify-between items-center mb-5">
            <h2 className="font-bold text-base" style={{ color: '#e8e4dc' }}>筛选 & 排序</h2>
            <button onClick={() => setFilterOpen(false)}>
              <X className="size-5" style={{ color: '#6a7a7e' }} />
            </button>
          </div>

          {/* Recruiting status */}
          <FilterSection label="招生状态">
            {[['', '全部'], ['yes', '🟢 招生中']].map(([v, label]) => (
              <FilterChip key={v} label={label} active={accepting === v} onClick={() => setAccepting(v)} />
            ))}
            <p className="w-full mt-1 text-[10px]" style={{ color: '#b0a090' }}>
              招生状态基于公开数据，如需确认请直接联系导师
            </p>
          </FilterSection>

          {/* H-index */}
          <FilterSection label="H指数 (学术影响力)">
            {[[0, '全部'], [10, 'H ≥ 10'], [20, 'H ≥ 20'], [40, 'H ≥ 40'], [80, 'H ≥ 80']].map(([v, label]) => (
              <FilterChip key={v} label={String(label)} active={hIndexMin === v} onClick={() => setHIndexMin(Number(v))} />
            ))}
          </FilterSection>

          {/* Sort */}
          <FilterSection label="排序方式">
            {[
              ['opportunity_score', '⭐ 推荐度'],
              ['h_index', '📈 H指数'],
              ['paper_count', '📄 论文数'],
              ['citation_count', '📊 引用数'],
            ].map(([v, label]) => (
              <FilterChip key={v} label={label} active={sortBy === v} onClick={() => setSortBy(v)} />
            ))}
          </FilterSection>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => { setAccepting(''); setHIndexMin(0); setSortBy('opportunity_score'); }}
              className="flex-1 py-3 rounded-2xl text-sm font-medium"
              style={{ background: '#111c28', color: '#a8b8ac', border: '1px solid rgba(201,169,110,0.12)' }}>
              重置
            </button>
            <button
              onClick={() => setFilterOpen(false)}
              className="flex-2 flex-grow-[2] py-3 rounded-2xl text-sm font-bold"
              style={{ background: '#c9a96e', color: '#080c10' }}>
              应用筛选
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Professor Card ──────────────────────────────────────────────────────────

function ProfCard({ p }: { p: Professor }) {
  const uni = getUniBadge(p.university);
  const statusBadge = getStatusBadge(p.acceptingStudents);
  const hasGrant = p.grantStatus === 'Active';
  const hasStats = p.hIndex || p.paperCount || p.citationCount;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#111c28', border: '1px solid rgba(201,169,110,0.12)', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
      {/* Top badges row */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        {statusBadge && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: statusBadge.bg, color: statusBadge.color }}>
            {statusBadge.label}
          </span>
        )}
        {hasGrant && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(234,179,8,0.15)', color: '#eab308' }}>
            💰 有经费
          </span>
        )}
        {p.opportunityScore != null && p.opportunityScore >= 70 && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(201,169,110,0.1)', color: '#c9a96e' }}>
            ⭐ 推荐
          </span>
        )}
        <Bookmark className="size-4 ml-auto shrink-0" style={{ color: '#c9a96e' }} />
      </div>

      {/* Main info */}
      <div className="flex gap-3 px-4 pb-3">
        {/* University badge */}
        <div className="size-12 shrink-0 rounded-xl flex items-center justify-center text-xs font-bold"
          style={{ background: uni.bg, color: uni.fg }}>
          {uni.short}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-[15px] leading-5 truncate" style={{ color: '#e8e4dc' }}>
            {p.name}
          </h3>
          <p className="text-xs mt-0.5" style={{ color: '#6a7a7e' }}>
            {p.positionTitle ? `${p.positionTitle} · ` : ''}{p.university}
          </p>
        </div>
      </div>

      {/* Stats row */}
      {hasStats && (
        <div className="flex gap-3 px-4 pb-3 text-xs" style={{ color: '#6a7a7e' }}>
          {p.hIndex != null && (
            <span className="flex items-center gap-1">
              <TrendingUp className="size-3" />
              H:{p.hIndex}
            </span>
          )}
          {p.paperCount != null && (
            <span className="flex items-center gap-1">
              <BookOpen className="size-3" />
              {p.paperCount}篇
            </span>
          )}
          {p.citationCount != null && (
            <span className="flex items-center gap-1">
              <GraduationCap className="size-3" />
              {fmtCitations(p.citationCount)}引
            </span>
          )}
        </div>
      )}

      {/* Suitable backgrounds */}
      {(p.suitableStudentBackgrounds ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1 px-4 pb-2">
          <span className="text-[10px]" style={{ color: '#6a7a7e' }}>适合背景：</span>
          {p.suitableStudentBackgrounds.slice(0, 3).map(bg => (
            <span key={bg} className="text-[10px] px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(201,169,110,0.08)', color: '#a8b8ac' }}>
              {bg}
            </span>
          ))}
        </div>
      )}

      {/* Research tags */}
      {(p.researchAreas ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1 px-4 pb-3">
          {p.researchAreas.slice(0, 3).map(area => (
            <span key={area} className="rounded-full text-[10px] px-2 py-0.5"
              style={{ border: '1px solid rgba(201,169,110,0.25)', color: '#c9a96e' }}>
              {area}
            </span>
          ))}
        </div>
      )}

      {/* CTAs */}
      <div className="flex gap-2 px-4 pb-4">
        <Link href={`/koala/professors/${p.id}`}
          className="flex-1 text-center text-xs font-semibold py-2 rounded-xl no-underline"
          style={{ background: 'rgba(201,169,110,0.1)', color: '#e8e4dc', border: '1px solid rgba(201,169,110,0.2)' }}>
          查看详情
        </Link>
        <Link href={`/koala/chat?action=outreach&prof=${p.id}&name=${encodeURIComponent(p.name)}`}
          className="flex-1 text-center text-xs font-semibold py-2 rounded-xl no-underline flex items-center justify-center gap-1"
          style={{ background: '#c9a96e', color: '#080c10' }}>
          <MessageSquarePlus className="size-3" />
          申请信
        </Link>
      </div>
    </div>
  );
}

// ─── Small UI components ──────────────────────────────────────────────────────

function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-semibold mb-2" style={{ color: '#a8b8ac' }}>{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="text-xs px-3 py-1.5 rounded-full transition-colors"
      style={active
        ? { background: '#c9a96e', color: '#080c10', fontWeight: 600 }
        : { background: '#111c28', color: '#e8e4dc', border: '1px solid rgba(201,169,110,0.15)' }}>
      {label}
    </button>
  );
}
