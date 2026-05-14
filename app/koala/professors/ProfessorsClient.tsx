'use client';

import { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft, Search, SlidersHorizontal, Bookmark, Loader2,
  X, GraduationCap, BookOpen, TrendingUp, MessageSquarePlus, Plus, Check,
  ExternalLink, FileEdit, Mic,
} from 'lucide-react';
import VoiceInputButton from '../../components/VoiceInputButton';
import type { Professor } from '../../lib/types';

interface SearchCandidate {
  name: string;
  university: string;
  position?: string;
  faculty?: string;
  researchAreas: string[];
  hIndex?: number;
  paperCount?: number;
  citationCount?: number;
  email?: string;
  profileUrl?: string;
  source: 'database' | 'openalex' | 'claude_web_search';
  confidence: 'high' | 'medium' | 'low';
  universityMismatch?: boolean;
  existsInDb: boolean;
  dbId?: string;
}

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
  'Australian National University':        { bg: '#d4a84330', fg: '#b8922e', short: 'ANU' },
  'University of Melbourne':               { bg: '#00308720', fg: '#1e4a8a', short: 'MEL' },
  'University of Sydney':                  { bg: '#cc000018', fg: '#b83232', short: 'SYD' },
  'UNSW Sydney':                           { bg: '#1a1a1a15', fg: '#3a3a3a', short: 'NSW' },
  'University of Queensland':              { bg: '#51247a18', fg: '#6b3d96', short: 'UQ'  },
  'Monash University':                     { bg: '#006dae18', fg: '#2680b8', short: 'MON' },
  'University of Western Australia':       { bg: '#00308718', fg: '#1e4a8a', short: 'UWA' },
  'University of Adelaide':                { bg: '#005a9c18', fg: '#2870a8', short: 'ADE' },
  'University of Technology Sydney':       { bg: '#00a3e018', fg: '#1a8ab8', short: 'UTS' },
  'RMIT University':                       { bg: '#e6002818', fg: '#c43838', short: 'RMT' },
  'Macquarie University':                  { bg: '#e8291c18', fg: '#c44040', short: 'MAC' },
  'Queensland University of Technology':   { bg: '#005a9c18', fg: '#2870a8', short: 'QUT' },
  'Deakin University':                     { bg: '#00a86b18', fg: '#2d9060', short: 'DEA' },
  'Griffith University':                   { bg: '#d4380d18', fg: '#b84830', short: 'GRF' },
  'La Trobe University':                   { bg: '#e84e1b18', fg: '#c45830', short: 'LAT' },
  'University of Newcastle':               { bg: '#1f164618', fg: '#3d3060', short: 'NEW' },
  'University of Wollongong':              { bg: '#1e579918', fg: '#2e68a0', short: 'WOL' },
  'Flinders University':                   { bg: '#004f9f18', fg: '#2868a0', short: 'FLI' },
  'Curtin University':                     { bg: '#cfb44b20', fg: '#a8942e', short: 'CUR' },
  'James Cook University':                 { bg: '#005c8418', fg: '#286880', short: 'JCU' },
  'Swinburne University of Technology':    { bg: '#bb000018', fg: '#a83838', short: 'SWI' },
  'Western Sydney University':             { bg: '#e5202018', fg: '#c43838', short: 'WSY' },
};

const ALL_UNIVERSITIES = [
  'Australian National University', 'University of Melbourne', 'University of Sydney',
  'UNSW Sydney', 'University of Queensland', 'Monash University',
  'University of Western Australia', 'University of Adelaide',
  'University of Technology Sydney', 'RMIT University', 'Macquarie University',
  'Queensland University of Technology', 'Deakin University', 'Griffith University',
  'La Trobe University', 'University of Newcastle', 'University of Wollongong',
  'Flinders University', 'Curtin University', 'James Cook University',
  'Swinburne University of Technology', 'Western Sydney University',
  'University of Tasmania', 'Charles Sturt University', 'University of Canberra',
  'Murdoch University', 'Victoria University', 'University of the Sunshine Coast',
  'Edith Cowan University', 'Australian Catholic University', 'Bond University',
  'Central Queensland University', 'Southern Cross University',
  'University of New England', 'Federation University Australia',
  'Charles Darwin University', 'University of Southern Queensland',
  'Torrens University', 'University of New South Wales', 'University of Divinity',
  'Western Australian Academy of Performing Arts',
];

const LIMIT = 20;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getUniBadge(university: string) {
  if (UNI_COLORS[university]) return UNI_COLORS[university];
  // fallback: first 3 letters, blue-grey
  const letters = university.replace(/University of |University /gi, '').slice(0, 3).toUpperCase();
  return { bg: '#5a687818', fg: '#5a6878', short: letters };
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
  university: string;
};

async function apiFetch(f: Filters) {
  const q = new URLSearchParams({ page: String(f.page), limit: String(LIMIT) });
  if (f.search)             q.set('search', f.search);
  if (f.category !== 'all') q.set('category', f.category);
  if (f.accepting)          q.set('acceptingStudents', f.accepting);
  if (f.hIndexMin)          q.set('hIndexMin', String(f.hIndexMin));
  if (f.sortBy !== 'opportunity_score') q.set('sortBy', f.sortBy);
  if (f.university)         q.set('university', f.university);
  const res = await fetch(`/api/professors?${q}`);
  if (!res.ok) throw new Error('fetch failed');
  return res.json() as Promise<{ data: Professor[]; total: number; hasMore: boolean }>;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ProfessorsClientProps {
  initialProfessors: Professor[];
  initialTotal: number;
}

export default function ProfessorsClient({ initialProfessors, initialTotal }: ProfessorsClientProps) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center bg-white dark:bg-[#080c10] min-h-screen">
        <p className="text-sm text-gray-500 dark:text-[#6a7a7e]">加载中…</p>
      </div>
    }>
      <ProfessorsPageInner initialProfessors={initialProfessors} initialTotal={initialTotal} />
    </Suspense>
  );
}

function ProfessorsPageInner({ initialProfessors, initialTotal }: ProfessorsClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [professors, setProfessors] = useState<Professor[]>(initialProfessors);
  const [total, setTotal] = useState<number | null>(initialTotal);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialProfessors.length >= LIMIT);
  const [loading, setLoading] = useState(initialProfessors.length === 0);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filters — initialize category from URL param if provided
  const [search, setSearch]         = useState('');
  const [debouncedSearch, setDB]    = useState('');
  const [category, setCategory]     = useState(() => searchParams.get('category') ?? 'all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [accepting, setAccepting]   = useState('');        // '' | 'yes'
  const [hIndexMin, setHIndexMin]   = useState(0);
  const [sortBy, setSortBy]         = useState('opportunity_score');
  const [university, setUniversity] = useState('');

  // External search candidates
  const [candidates, setCandidates] = useState<SearchCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [addingName, setAddingName] = useState<string | null>(null);

  // Deep search
  const [showDeepSearch, setShowDeepSearch] = useState(false);
  const [deepName, setDeepName] = useState('');
  const [deepUni, setDeepUni] = useState('');
  const [deepSearching, setDeepSearching] = useState(false);
  const [deepCandidates, setDeepCandidates] = useState<SearchCandidate[]>([]);
  const [deepAddedIds, setDeepAddedIds] = useState<Set<string>>(new Set());
  const [deepAddingName, setDeepAddingName] = useState<string | null>(null);

  const [savedProfessors, setSavedProfessors] = useState<Map<string, Professor>>(new Map());

  // Reward toast state
  const [rewardToast, setRewardToast] = useState<{ profName: string; credits: number; newBalance: number; referralCode: string } | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Active filter count for badge
  const activeFilters = [accepting !== '', hIndexMin > 0, sortBy !== 'opportunity_score', university !== ''].filter(Boolean).length;

  // Auto-debounce: typing triggers search after 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDB(search.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Trigger search immediately (button click or Enter) — skips debounce
  const triggerSearch = useCallback(() => {
    setDB(search.trim());
  }, [search]);

  const filters: Filters = { page: 1, search: debouncedSearch, category, accepting, hIndexMin, sortBy, university };

  // Reset + load on filter change
  useEffect(() => {
    setLoading(true);
    setProfessors([]);
    setCandidates([]);
    setSearching(false);
    setSearchDone(false);
    setPage(1);
    setHasMore(false);
    apiFetch(filters)
      .then(d => {
        setProfessors(d.data);
        setTotal(d.total);
        setHasMore(d.hasMore);
        setPage(2);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, category, accepting, hIndexMin, sortBy, university]);

  // Add candidate to database via POST
  const handleAddCandidate = useCallback(async (candidate: SearchCandidate) => {
    setAddingName(candidate.name);
    try {
      const res = await fetch('/api/professors/auto-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate }),
      });
      if (res.ok) {
        const result = await res.json();
        setAddedIds(prev => new Set(prev).add(candidate.name));
        if (result.professor) {
          const key = `${candidate.name}|${candidate.university}`;
          setSavedProfessors(prev => new Map(prev).set(key, result.professor));
        }
        if (result.reward) {
          setRewardToast({ profName: candidate.name, credits: result.reward.credits, newBalance: result.reward.newBalance, referralCode: result.reward.referralCode });
        }
      }
    } catch { /* ignore */ }
    setAddingName(null);
  }, []);

  const handleDeepSearch = useCallback(async (overrideName?: string, overrideUni?: string) => {
    const name = overrideName ?? deepName;
    const uni = overrideUni ?? deepUni;
    if (!name.trim()) return;
    setDeepSearching(true);
    setDeepCandidates([]);
    try {
      const params = new URLSearchParams({ name: name.trim(), deep: 'true' });
      if (uni.trim()) params.set('university', uni.trim());
      const res = await fetch(`/api/professors/auto-search?${params}`);
      const data = await res.json();
      setDeepCandidates(data.candidates || []);
    } catch { /* ignore */ }
    setDeepSearching(false);
  }, [deepName, deepUni]);

  const handleDeepAddCandidate = useCallback(async (candidate: SearchCandidate) => {
    setDeepAddingName(candidate.name);
    try {
      const res = await fetch('/api/professors/auto-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate }),
      });
      if (res.ok) {
        const result = await res.json();
        setDeepAddedIds(prev => new Set(prev).add(candidate.name));
        if (result.professor) {
          const key = `${candidate.name}|${candidate.university}`;
          setSavedProfessors(prev => new Map(prev).set(key, result.professor));
        }
        if (result.reward) {
          setRewardToast({ profName: candidate.name, credits: result.reward.credits, newBalance: result.reward.newBalance, referralCode: result.reward.referralCode });
        }
      }
    } catch { /* ignore */ }
    setDeepAddingName(null);
  }, []);

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
      .then(d => {
        setProfessors(prev => {
          const ids = new Set(prev.map(p => p.id));
          return [...prev, ...d.data.filter((p: Professor) => !ids.has(p.id))];
        });
        setHasMore(d.hasMore);
        setPage(p => p + 1);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, category, accepting, hIndexMin, sortBy, university, loadingMore, hasMore]);

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
    <div className="bg-white dark:bg-[#080c10]" style={{ minHeight: '100vh', paddingBottom: 120 }}>

      {/* Filter backdrop — mobile only */}
      {filterOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setFilterOpen(false)} />
      )}

      {/* Mobile Header — hidden on desktop */}
      <div className="flex lg:hidden px-4 pt-4 pb-2 justify-between items-center">
        <Link href="/koala/discover" className="size-10 rounded-full flex justify-center items-center bg-amber-50 dark:bg-[#D4A843]/10">
          <ChevronLeft className="size-5 text-amber-600 dark:text-[#D4A843]" />
        </Link>
        <div className="flex flex-col items-center">
          <h1 className="font-bold text-lg leading-7 text-gray-900 dark:text-[#e8e4dc]">教授库</h1>
          {total !== null && (
            <span className="text-xs text-gray-500 dark:text-[#6a7a7e]">
              {debouncedSearch ? `找到 ${total.toLocaleString()} 位匹配导师` : `共 ${total.toLocaleString()} 位已认证导师`}
            </span>
          )}
        </div>
        <button
          onClick={() => setFilterOpen(true)}
          className={`size-10 rounded-full flex justify-center items-center relative ${activeFilters ? 'bg-[#1A1A2E] dark:bg-[#D4A843]' : 'bg-amber-50 dark:bg-[#D4A843]/10'}`}
        >
          <SlidersHorizontal className={`size-5 ${activeFilters ? 'text-white dark:text-[#080c10]' : 'text-amber-600 dark:text-[#D4A843]'}`} />
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
        <h1 className="font-bold text-2xl text-gray-900 dark:text-[#e8e4dc]">教授库</h1>
        {total !== null && <span className="text-sm text-gray-500 dark:text-[#6a7a7e]">{debouncedSearch ? `找到 ${total.toLocaleString()} 位匹配导师` : `共 ${total.toLocaleString()} 位已认证导师`}</span>}
      </div>

      {/* Desktop layout: sidebar + list */}
      <div className="lg:flex lg:gap-6 lg:items-start">

        {/* ── Left sidebar (desktop only) ── */}
        <aside className="hidden lg:block lg:w-64 lg:flex-shrink-0 lg:sticky lg:top-20">
          {/* Search */}
          <div className="rounded-2xl flex px-4 py-3 items-center gap-2 mb-3 bg-white dark:bg-[#0F1419] border border-gray-200 dark:border-[rgba(212,168,67,0.12)] shadow-sm dark:shadow-none">
            <Search className="size-4 shrink-0 text-gray-500 dark:text-[#6a7a7e]" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') triggerSearch(); }}
              placeholder="搜索教授、学校、研究方向…"
              className="flex-1 bg-transparent text-sm outline-none text-gray-900 dark:text-[#e8e4dc]"
            />
            {search && <button type="button" onClick={() => { setSearch(''); setDB(''); }} className="text-xs text-[#1A1A2E] dark:text-[#D4A843]">清除</button>}
            <VoiceInputButton
              onTranscript={(text) => setSearch(prev => prev + text)}
              size="sm"
            />
            <button type="button" onClick={triggerSearch} className="size-7 rounded-lg flex items-center justify-center shrink-0 relative z-10 bg-[#1A1A2E] dark:bg-[#D4A843] active:scale-90 transition-transform cursor-pointer">
              <Search className="size-3.5 text-white dark:text-[#080c10]" />
            </button>
          </div>

          {/* Hot tags */}
          {!search && (
            <div className="flex flex-wrap gap-2 mb-4">
              {HOT_TAGS.map(tag => (
                <button key={tag} onClick={() => { setSearch(tag); setDB(tag); }}
                  className="text-xs px-3 py-1 rounded-full text-amber-700 dark:text-[#D4A843] bg-amber-50 dark:bg-[#D4A843]/10 border border-amber-300 dark:border-[rgba(212,168,67,0.2)]">
                  {tag}
                </button>
              ))}
            </div>
          )}

          {/* Categories */}
          <div className="rounded-2xl overflow-hidden mb-3 bg-white dark:bg-[#0F1419] border border-gray-200 dark:border-[rgba(212,168,67,0.12)] shadow-sm dark:shadow-none">
            <div className="px-3 py-2.5 text-xs font-semibold text-gray-500 dark:text-[#a8b8ac] border-b border-gray-200 dark:border-[rgba(212,168,67,0.12)]">研究方向</div>
            {CATEGORIES.map(cat => {
              const count = cat.value === 'all' ? total : (categoryCounts[cat.value] ?? null);
              const active = category === cat.value;
              return (
                <button key={cat.value} onClick={() => setCategory(cat.value)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors ${active ? 'bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10] font-bold' : ''}`}>
                  <span className={active ? '' : 'text-gray-700 dark:text-[#e8e4dc]'}>{cat.label}</span>
                  {count !== null && (
                    <span className="text-[10px]" style={{ opacity: active ? 0.85 : 0.5 }}>
                      {count >= 1000 ? `${Math.floor(count / 100) / 10}k` : count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* University filter */}
          <div className="rounded-2xl overflow-hidden mb-3 bg-white dark:bg-[#0F1419] border border-gray-200 dark:border-[rgba(212,168,67,0.12)] shadow-sm dark:shadow-none">
            <div className="px-3 py-2.5 text-xs font-semibold text-gray-500 dark:text-[#a8b8ac] border-b border-gray-200 dark:border-[rgba(212,168,67,0.12)]">大学</div>
            <div className="px-2 py-2">
              <select
                value={university}
                onChange={e => setUniversity(e.target.value)}
                className="w-full text-xs px-2 py-1.5 rounded-lg outline-none bg-gray-100 dark:bg-[#0d1520] text-gray-900 dark:text-[#e8e4dc] border border-gray-200 dark:border-[rgba(212,168,67,0.15)]"
              >
                <option value="">全部大学</option>
                {ALL_UNIVERSITIES.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Filters */}
          <div className="rounded-2xl overflow-hidden mb-3 bg-white dark:bg-[#0F1419] border border-gray-200 dark:border-[rgba(212,168,67,0.12)] shadow-sm dark:shadow-none">
            <div className="px-3 py-2.5 text-xs font-semibold text-gray-500 dark:text-[#a8b8ac] border-b border-gray-200 dark:border-[rgba(212,168,67,0.12)]">招生状态</div>
            {[['', '全部'], ['yes', '🟢 招生中']].map(([v, label]) => (
              <button key={v} onClick={() => setAccepting(v)}
                className={`w-full text-left px-3 py-2 text-xs transition-colors ${accepting === v ? 'bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10] font-semibold' : ''}`}>
                <span className={accepting === v ? '' : 'text-gray-700 dark:text-[#e8e4dc]'}>{label}</span>
              </button>
            ))}
          </div>

          <div className="rounded-2xl overflow-hidden mb-3 bg-white dark:bg-[#0F1419] border border-gray-200 dark:border-[rgba(212,168,67,0.12)] shadow-sm dark:shadow-none">
            <div className="px-3 py-2.5 text-xs font-semibold text-gray-500 dark:text-[#a8b8ac] border-b border-gray-200 dark:border-[rgba(212,168,67,0.12)]">H指数</div>
            {[[0, '全部'], [10, 'H ≥ 10'], [20, 'H ≥ 20'], [40, 'H ≥ 40'], [80, 'H ≥ 80']].map(([v, label]) => (
              <button key={v} onClick={() => setHIndexMin(Number(v))}
                className={`w-full text-left px-3 py-2 text-xs transition-colors ${hIndexMin === Number(v) ? 'bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10] font-semibold' : ''}`}>
                <span className={hIndexMin === Number(v) ? '' : 'text-gray-700 dark:text-[#e8e4dc]'}>{label}</span>
              </button>
            ))}
          </div>

          <div className="rounded-2xl overflow-hidden bg-white dark:bg-[#0F1419] border border-gray-200 dark:border-[rgba(212,168,67,0.12)] shadow-sm dark:shadow-none">
            <div className="px-3 py-2.5 text-xs font-semibold text-gray-500 dark:text-[#a8b8ac] border-b border-gray-200 dark:border-[rgba(212,168,67,0.12)]">排序</div>
            {[['opportunity_score','⭐ 推荐度'],['h_index','📈 H指数'],['paper_count','📄 论文数'],['citation_count','📊 引用数']].map(([v, label]) => (
              <button key={v} onClick={() => setSortBy(v)}
                className={`w-full text-left px-3 py-2 text-xs transition-colors ${sortBy === v ? 'bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10] font-semibold' : ''}`}>
                <span className={sortBy === v ? '' : 'text-gray-700 dark:text-[#e8e4dc]'}>{label}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* ── Right: main content ── */}
        <div className="lg:flex-1 lg:min-w-0">

      {/* Mobile Search */}
      <div className="px-4 pt-2 lg:hidden">
        <div className="rounded-2xl flex px-4 py-3 items-center gap-2 bg-gray-100 dark:bg-[#0F1419] border border-gray-200 dark:border-[rgba(212,168,67,0.12)]">
          <Search className="size-4 shrink-0 text-gray-500 dark:text-[#6a7a7e]" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') triggerSearch(); }}
            placeholder="搜索教授、学校、研究方向…"
            className="flex-1 bg-transparent text-sm outline-none text-gray-900 dark:text-[#e8e4dc]"
          />
          {search && <button type="button" onClick={() => { setSearch(''); setDB(''); }} className="text-xs text-[#1A1A2E] dark:text-[#D4A843]">清除</button>}
          <VoiceInputButton
            onTranscript={(text) => setSearch(prev => prev + text)}
            size="sm"
          />
          <button type="button" onClick={triggerSearch} className="size-8 rounded-lg flex items-center justify-center shrink-0 relative z-10 bg-[#1A1A2E] dark:bg-[#D4A843] active:scale-90 transition-transform cursor-pointer">
            <Search className="size-4 text-white dark:text-[#080c10]" />
          </button>
        </div>
        {!search && <p className="text-xs mt-2 px-1 text-gray-500 dark:text-[#6a7a7e]">输入你的研究方向，找到最匹配的导师</p>}
      </div>

      {/* Mobile Hot tags */}
      {!search && (
        <div className="flex flex-wrap px-4 pt-2 gap-2 lg:hidden">
          {HOT_TAGS.map(tag => (
            <button key={tag} onClick={() => { setSearch(tag); setDB(tag); }}
              className="text-xs px-3 py-1 rounded-full text-amber-700 dark:text-[#D4A843] bg-amber-50 dark:bg-[#D4A843]/10 border border-amber-300 dark:border-[rgba(212,168,67,0.2)]">
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
              className={`whitespace-nowrap text-xs px-3 py-2 rounded-full transition-colors flex items-center gap-1 ${active ? 'bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10] font-bold' : 'bg-gray-100 dark:bg-[#0F1419] text-gray-700 dark:text-[#e8e4dc] border border-gray-200 dark:border-[rgba(212,168,67,0.15)]'}`}>
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
          <span className="text-xs text-gray-500 dark:text-[#6a7a7e]">排序：
            {{ h_index: 'H指数', paper_count: '论文数', citation_count: '引用数', updated_at: '最近更新' }[sortBy] ?? sortBy}
          </span>
          <button onClick={() => setSortBy('opportunity_score')} className="text-xs underline text-[#1A1A2E] dark:text-[#D4A843]">重置</button>
        </div>
      )}

      {/* List */}
      <div className="flex px-4 pt-4 pb-2 flex-col gap-4 lg:px-0 lg:grid lg:grid-cols-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl animate-pulse bg-gray-100 dark:bg-[#0F1419]" style={{ height: 160 }} />
          ))
        ) : professors.length === 0 ? (
          <div className="flex flex-col items-center py-8 gap-4 lg:col-span-2">
            {search ? (
              <div className="w-full max-w-lg mx-auto rounded-2xl bg-amber-50/60 dark:bg-[#0F1419] border border-gray-200 dark:border-[rgba(212,168,67,0.2)] p-6">
                <div className="text-center space-y-3">
                  <p className="text-3xl">😕</p>
                  <p className="font-bold text-base text-gray-900 dark:text-[#e8e4dc]">
                    数据库中未找到 &ldquo;{search}&rdquo;
                  </p>
                  <p className="text-sm text-gray-600 dark:text-[#8a9a9e]">
                    该教授可能还未被收录。试试 AI 深度搜索，我们可以从网上找到这位教授的信息！
                  </p>
                  <button
                    onClick={() => {
                      setShowDeepSearch(true);
                      setDeepName(search);
                      setDeepUni(university);
                      handleDeepSearch(search, university);
                    }}
                    className="w-full py-3 rounded-xl text-sm font-bold bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10] hover:opacity-90 transition flex items-center justify-center gap-2"
                  >
                    <Search className="size-4" />
                    AI 深度搜索 &ldquo;{search}&rdquo;
                  </button>
                  <p className="text-xs text-amber-600 dark:text-amber-500">
                    录入新教授可获得 <span className="font-bold">10 积分奖励</span> ✨
                  </p>
                </div>
                <div className="flex justify-center gap-2 mt-4">
                  <button onClick={() => { setSearch(''); setDB(''); }} className="text-xs px-4 py-2 rounded-full bg-white/60 dark:bg-[#0F1419] text-gray-700 dark:text-[#e8e4dc]">清除搜索</button>
                  {activeFilters > 0 && <button onClick={() => { setAccepting(''); setHIndexMin(0); setSortBy('opportunity_score'); setUniversity(''); }} className="text-xs px-4 py-2 rounded-full bg-white/60 dark:bg-[#0F1419] text-gray-700 dark:text-[#e8e4dc]">清除筛选</button>}
                </div>
              </div>
            ) : (
              <div className="w-full max-w-md mx-auto rounded-2xl bg-gray-50 dark:bg-[#0F1419] border border-gray-200 dark:border-[rgba(212,168,67,0.15)] p-5 text-center">
                <p className="text-sm text-gray-500 dark:text-[#6a7a7e]">暂无匹配数据，尝试调整筛选条件或搜索教授名字</p>
                {activeFilters > 0 && <button onClick={() => { setAccepting(''); setHIndexMin(0); setSortBy('opportunity_score'); setUniversity(''); }} className="text-xs px-4 py-2 mt-3 rounded-full bg-gray-100 dark:bg-[#0d1520] text-gray-700 dark:text-[#e8e4dc]">清除筛选</button>}
              </div>
            )}
          </div>
        ) : (
          professors.map(p => <ProfCard key={p.id} p={p} />)
        )}
      </div>

      {/* External search candidates */}
      {debouncedSearch && !loading && (searching || searchDone) && (
        <div className="px-4 pt-2 pb-4 lg:px-0">
          <div className="rounded-2xl overflow-hidden bg-white dark:bg-[#0F1419] border border-gray-200 dark:border-[rgba(212,168,67,0.12)] shadow-sm dark:shadow-none">
            <div className="px-4 py-3 flex items-center gap-2 border-b border-gray-100 dark:border-[rgba(212,168,67,0.08)]">
              <span className="text-sm font-semibold text-gray-900 dark:text-[#D4A843]">全网搜索结果</span>
              {searching && <Loader2 className="size-4 animate-spin text-amber-600 dark:text-[#D4A843]" />}
            </div>
            {searching && candidates.length === 0 && (
              <div className="px-4 py-6 text-center">
                <p className="text-xs text-gray-500 dark:text-[#6a7a7e]">
                  正在从网络搜索 &ldquo;{debouncedSearch}&rdquo;…
                </p>
              </div>
            )}
            {candidates.length > 0 && (
              <div className="divide-y divide-gray-100 dark:divide-[rgba(212,168,67,0.06)]">
                {candidates.map((c, idx) => {
                  const added = addedIds.has(c.name) || c.existsInDb;
                  const adding = addingName === c.name;
                  const sourceBadge = c.source === 'database'
                    ? { label: '✅ 已收录', cls: 'bg-green-500/15 text-green-500' }
                    : c.source === 'openalex'
                      ? { label: '📊 学术数据库', cls: 'bg-blue-400/15 text-blue-400' }
                      : { label: '🔍 网络搜索', cls: 'bg-amber-400/15 text-amber-600 dark:text-amber-400' };
                  const confBadge = c.confidence === 'high'
                    ? { label: '高匹配', cls: 'text-green-500' }
                    : c.confidence === 'medium'
                      ? { label: '中匹配', cls: 'text-yellow-500' }
                      : { label: '低匹配', cls: 'text-[#6a7a7e]' };

                  const savedKey = `${c.name}|${c.university}`;
                  const savedProf = savedProfessors.get(savedKey);

                  if (savedProf) {
                    return (
                      <div key={idx} className="px-4 py-3 bg-green-50/50 dark:bg-green-900/10 border-l-2 border-green-500">
                        <div className="flex items-center gap-2 mb-2">
                          <Check className="size-4 text-green-500" />
                          <p className="text-sm font-semibold text-gray-900 dark:text-[#e8e4dc]">{savedProf.name}</p>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-500">已录入</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-[#6a7a7e] mb-2">
                          {savedProf.positionTitle && <span>{savedProf.positionTitle} · </span>}
                          {savedProf.university}
                        </p>
                        {savedProf.researchAreas.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {savedProf.researchAreas.slice(0, 4).map(area => (
                              <span key={area} className="rounded-md text-[10px] px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">{area}</span>
                            ))}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/koala/professors/${savedProf.id}`} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-[#1a2030] text-gray-700 dark:text-[#e8e4dc] hover:bg-gray-200 dark:hover:bg-[#252f40] transition">
                            <ExternalLink className="size-3" /> 查看详情
                          </Link>
                          <Link href={`/koala/chat?action=outreach&prof=${savedProf.id}&name=${encodeURIComponent(savedProf.name)}`} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10] hover:opacity-90 transition">
                            <FileEdit className="size-3" /> 写套磁信
                          </Link>
                          <Link href={`/koala/chat?action=interview&prof=${savedProf.id}&name=${encodeURIComponent(savedProf.name)}`} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border border-gray-300 dark:border-[rgba(212,168,67,0.2)] text-gray-700 dark:text-[#e8e4dc] hover:bg-gray-100 dark:hover:bg-[#1a2030] transition">
                            <Mic className="size-3" /> 模拟面试
                          </Link>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={idx} className={`px-4 py-3 flex items-start gap-3 ${c.universityMismatch ? 'opacity-60' : ''}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold truncate text-gray-900 dark:text-[#e8e4dc]">{c.name}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${sourceBadge.cls}`}>
                            {sourceBadge.label}
                          </span>
                          <span className={`text-[10px] ${confBadge.cls}`}>{confBadge.label}</span>
                          {c.universityMismatch && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                              大学不匹配 ⚠️
                            </span>
                          )}
                        </div>
                        <p className={`text-xs mt-0.5 ${c.universityMismatch ? 'text-red-500' : 'text-gray-500 dark:text-[#6a7a7e]'}`}>
                          {c.position && <span>{c.position} · </span>}
                          {c.university}
                          {c.universityMismatch && <span className="ml-1.5 font-semibold">[不推荐]</span>}
                        </p>
                        {c.researchAreas.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {c.researchAreas.slice(0, 4).map(area => (
                              <span key={area} className="rounded-md text-[10px] px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">
                                {area}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-3 mt-1.5 text-xs text-gray-500 dark:text-[#6a7a7e]">
                          {c.hIndex != null && <span className="text-amber-700 dark:text-[#D4A843] font-semibold">H:{c.hIndex}</span>}
                          {c.paperCount != null && <span>{c.paperCount}篇</span>}
                          {c.citationCount != null && <span>{fmtCitations(c.citationCount)}引</span>}
                        </div>
                      </div>
                      {!c.existsInDb && !c.universityMismatch && (
                        <button
                          onClick={() => !added && !adding && handleAddCandidate(c)}
                          disabled={added || adding}
                          className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition disabled:opacity-70 ${added ? 'bg-green-500/15 text-green-500' : 'bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]'}`}
                        >
                          {adding ? <><Loader2 className="size-3 animate-spin" /> 录入中</> : <><Plus className="size-3" /> 录入并使用</>}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {!searching && searchDone && candidates.length === 0 && (
              <div className="px-4 py-5 text-center space-y-3">
                <p className="text-sm text-gray-600 dark:text-[#8a9a9e]">全网搜索也未找到 &ldquo;{debouncedSearch}&rdquo; 相关教授</p>
                <button
                  onClick={() => {
                    setShowDeepSearch(true);
                    setDeepName(debouncedSearch);
                    setDeepUni(university);
                    handleDeepSearch(debouncedSearch, university);
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10] hover:opacity-90 transition"
                >
                  <Search className="size-4" />
                  AI 深度搜索 &ldquo;{debouncedSearch}&rdquo;
                </button>
                <p className="text-xs text-amber-600 dark:text-amber-500">AI 可以从大学官网和学术网络搜索，录入可获 <span className="font-bold">10 积分</span></p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Deep search banner — placed after results so it doesn't overlap search box */}
      {debouncedSearch && !loading && (
        <div className="px-4 pt-3 lg:px-0">
          {!showDeepSearch ? (
            <button
              onClick={() => { setShowDeepSearch(true); setDeepName(debouncedSearch); setDeepUni(university); }}
              className="w-full rounded-xl px-4 py-3 text-left text-xs leading-relaxed bg-gray-50 dark:bg-[#0F1419] border border-gray-200 dark:border-[rgba(212,168,67,0.12)] text-gray-500 dark:text-[#6a7a7e] hover:bg-gray-100 dark:hover:bg-[#141c28] transition"
            >
              不是你要找的教授？点击这里用 AI 深度搜索
            </button>
          ) : (
            <div className="rounded-xl overflow-hidden bg-white dark:bg-[#0F1419] border border-gray-200 dark:border-[rgba(212,168,67,0.15)]">
              <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100 dark:border-[rgba(212,168,67,0.08)]">
                <span className="text-sm font-semibold text-gray-900 dark:text-[#D4A843]">AI 深度搜索</span>
                <button onClick={() => { setShowDeepSearch(false); setDeepCandidates([]); }} className="text-xs text-gray-500 dark:text-[#6a7a7e]">收起</button>
              </div>
              <div className="px-4 py-3 space-y-2">
                <div className="flex items-center gap-1.5">
                  <input
                    type="text" value={deepName} onChange={e => setDeepName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleDeepSearch(); }}
                    placeholder="教授全名（英文）"
                    className="flex-1 rounded-lg px-3 py-2 text-sm outline-none bg-gray-100 dark:bg-[#0d1520] text-gray-900 dark:text-[#e8e4dc] border border-gray-200 dark:border-[rgba(212,168,67,0.15)]"
                  />
                  <VoiceInputButton
                    onTranscript={(text) => setDeepName(prev => prev + text)}
                    size="sm"
                    lang="en-US"
                  />
                </div>
                <input
                  type="text" value={deepUni} onChange={e => setDeepUni(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleDeepSearch(); }}
                  placeholder="大学名称（可选，帮助精确匹配）"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none bg-gray-100 dark:bg-[#0d1520] text-gray-900 dark:text-[#e8e4dc] border border-gray-200 dark:border-[rgba(212,168,67,0.15)]"
                />
                <button
                  onClick={() => handleDeepSearch()}
                  disabled={!deepName.trim() || deepSearching}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]"
                >
                  {deepSearching ? '正在从学术网络和大学官网搜索…' : 'AI 深度搜索'}
                </button>
              </div>
              {deepCandidates.length > 0 && (
                <div className="divide-y divide-gray-100 dark:divide-[rgba(212,168,67,0.06)] border-t border-gray-100 dark:border-[rgba(212,168,67,0.08)]">
                  {deepCandidates.map((c, idx) => {
                    const added = deepAddedIds.has(c.name) || c.existsInDb;
                    const adding = deepAddingName === c.name;
                    const sourceBadge = c.source === 'database'
                      ? { label: '✅ 已收录', cls: 'bg-green-500/15 text-green-500' }
                      : c.source === 'openalex'
                        ? { label: '📊 学术数据库', cls: 'bg-blue-400/15 text-blue-400' }
                        : { label: '🔍 网络搜索', cls: 'bg-amber-400/15 text-amber-600 dark:text-amber-400' };
                    const deepSavedKey = `${c.name}|${c.university}`;
                    const deepSavedProf = savedProfessors.get(deepSavedKey);

                    if (deepSavedProf) {
                      return (
                        <div key={idx} className="px-4 py-3 bg-green-50/50 dark:bg-green-900/10 border-l-2 border-green-500">
                          <div className="flex items-center gap-2 mb-2">
                            <Check className="size-4 text-green-500" />
                            <p className="text-sm font-semibold text-gray-900 dark:text-[#e8e4dc]">{deepSavedProf.name}</p>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-500">已录入</span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-[#6a7a7e] mb-2">
                            {deepSavedProf.positionTitle && <span>{deepSavedProf.positionTitle} · </span>}
                            {deepSavedProf.university}
                          </p>
                          {deepSavedProf.researchAreas.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {deepSavedProf.researchAreas.slice(0, 4).map(area => (
                                <span key={area} className="rounded-md text-[10px] px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">{area}</span>
                              ))}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2">
                            <Link href={`/koala/professors/${deepSavedProf.id}`} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-[#1a2030] text-gray-700 dark:text-[#e8e4dc] hover:bg-gray-200 dark:hover:bg-[#252f40] transition">
                              <ExternalLink className="size-3" /> 查看详情
                            </Link>
                            <Link href={`/koala/chat?action=outreach&prof=${deepSavedProf.id}&name=${encodeURIComponent(deepSavedProf.name)}`} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10] hover:opacity-90 transition">
                              <FileEdit className="size-3" /> 写套磁信
                            </Link>
                            <Link href={`/koala/chat?action=interview&prof=${deepSavedProf.id}&name=${encodeURIComponent(deepSavedProf.name)}`} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border border-gray-300 dark:border-[rgba(212,168,67,0.2)] text-gray-700 dark:text-[#e8e4dc] hover:bg-gray-100 dark:hover:bg-[#1a2030] transition">
                              <Mic className="size-3" /> 模拟面试
                            </Link>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={idx} className={`px-4 py-3 flex items-start gap-3 ${c.universityMismatch ? 'opacity-60' : ''}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold truncate text-gray-900 dark:text-[#e8e4dc]">{c.name}</p>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${sourceBadge.cls}`}>{sourceBadge.label}</span>
                          </div>
                          <p className="text-xs mt-0.5 text-gray-500 dark:text-[#6a7a7e]">
                            {c.position && <span>{c.position} · </span>}{c.university}
                          </p>
                          {c.researchAreas.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {c.researchAreas.slice(0, 4).map(area => (
                                <span key={area} className="rounded-md text-[10px] px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">{area}</span>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-3 mt-1.5 text-xs text-gray-500 dark:text-[#6a7a7e]">
                            {c.hIndex != null && <span className="text-amber-700 dark:text-[#D4A843] font-semibold">H:{c.hIndex}</span>}
                            {c.paperCount != null && <span>{c.paperCount}篇</span>}
                            {c.citationCount != null && <span>{fmtCitations(c.citationCount)}引</span>}
                          </div>
                        </div>
                        {c.existsInDb ? (
                          <span className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-500/15 text-green-500">
                            <Check className="size-3" /> 已收录
                          </span>
                        ) : !c.universityMismatch && (
                          <button
                            onClick={() => !added && !adding && handleDeepAddCandidate(c)}
                            disabled={added || adding}
                            className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition disabled:opacity-70 ${added ? 'bg-green-500/15 text-green-500' : 'bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]'}`}
                          >
                            {adding ? <><Loader2 className="size-3 animate-spin" /> 录入中</> : <><Plus className="size-3" /> 录入并使用</>}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {deepSearching && (
                <div className="px-4 py-6 text-center">
                  <Loader2 className="size-5 animate-spin mx-auto mb-2 text-amber-600 dark:text-[#D4A843]" />
                  <p className="text-xs text-gray-500 dark:text-[#6a7a7e]">正在从学术网络和大学官网搜索…</p>
                </div>
              )}
              {!deepSearching && deepCandidates.length === 0 && deepName && (
                <div className="px-4 py-5 text-center">
                  <p className="text-sm text-gray-500 dark:text-[#6a7a7e]">很抱歉，AI 也未找到 &ldquo;{deepName}&rdquo; 的信息</p>
                  <p className="text-xs text-gray-400 dark:text-[#6a7a7e] mt-1">请确认拼写是否正确，或尝试输入教授的英文全名</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Sentinel for infinite scroll - must be outside grid */}
      <div ref={sentinelRef} className="h-4 px-4" />

      {loadingMore && (
        <div className="flex justify-center py-4">
          <Loader2 className="size-5 animate-spin text-amber-600 dark:text-[#D4A843]" />
        </div>
      )}

      {!loading && !hasMore && professors.length > 0 && (
        <div className="px-4 pb-4 lg:px-0 space-y-3">
          <p className="text-center text-xs py-2 text-gray-500 dark:text-[#6a7a7e]">
            已加载全部 {professors.length.toLocaleString()} 位导师
          </p>
          <Link href="/koala/chat"
            className="mx-auto block text-center text-sm font-medium py-3 px-6 rounded-2xl no-underline bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]"
            style={{ maxWidth: 280 }}>
            没找到理想导师？让 Koala AI 精准匹配 →
          </Link>
          <div className="mt-4 px-2 py-3 rounded-xl text-[11px] leading-relaxed bg-gray-50 dark:bg-[#0F1419] text-gray-500 dark:text-[#6a7a7e] border border-gray-200 dark:border-[rgba(212,168,67,0.12)]">
            以上数据来自大学官网、Google Scholar 及公开数据库，仅供参考。经费与招生状态可能与实际情况存在差异，请直接联系导师核实。如发现信息有误，欢迎反馈至{' '}
            <a href="mailto:info@koalaphd.com" className="text-[#1A1A2E] dark:text-[#D4A843]">info@koalaphd.com</a>
          </div>
        </div>
      )}
      </div>{/* end right panel */}
      </div>{/* end lg:flex */}

      {/* Filter bottom sheet — mobile only */}
      <div
        className="lg:hidden fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 overflow-y-auto bg-white dark:bg-[#0d1520] border border-gray-200 dark:border-[rgba(212,168,67,0.12)]"
        style={{
          transform: filterOpen ? 'translateY(0)' : 'translateY(100%)',
          borderRadius: '20px 20px 0 0',
          maxHeight: '75vh',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.3)',
        }}
      >
        <div className="px-4 pt-3 pb-6">
          {/* Handle */}
          <div className="mx-auto mb-4 rounded-full bg-gray-300 dark:bg-[rgba(212,168,67,0.3)]" style={{ width: 36, height: 4 }} />

          <div className="flex justify-between items-center mb-5">
            <h2 className="font-bold text-base text-gray-900 dark:text-[#e8e4dc]">筛选 & 排序</h2>
            <button onClick={() => setFilterOpen(false)}>
              <X className="size-5 text-gray-500 dark:text-[#6a7a7e]" />
            </button>
          </div>

          {/* University */}
          <FilterSection label="大学">
            <select
              value={university}
              onChange={e => setUniversity(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg outline-none bg-gray-100 dark:bg-[#0F1419] text-gray-900 dark:text-[#e8e4dc] border border-gray-200 dark:border-[rgba(212,168,67,0.15)]"
            >
              <option value="">全部大学</option>
              {ALL_UNIVERSITIES.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </FilterSection>

          {/* Recruiting status */}
          <FilterSection label="招生状态">
            {[['', '全部'], ['yes', '🟢 招生中']].map(([v, label]) => (
              <FilterChip key={v} label={label} active={accepting === v} onClick={() => setAccepting(v)} />
            ))}
            <p className="w-full mt-1 text-[10px] text-gray-400 dark:text-[#b0a090]">
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
              onClick={() => { setAccepting(''); setHIndexMin(0); setSortBy('opportunity_score'); setUniversity(''); }}
              className="flex-1 py-3 rounded-2xl text-sm font-medium bg-gray-100 dark:bg-[#0F1419] text-gray-500 dark:text-[#a8b8ac] border border-gray-200 dark:border-[rgba(212,168,67,0.12)]">
              重置
            </button>
            <button
              onClick={() => setFilterOpen(false)}
              className="flex-2 flex-grow-[2] py-3 rounded-2xl text-sm font-bold bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]">
              应用筛选
            </button>
          </div>
        </div>
      </div>

      {/* Reward toast overlay */}
      {rewardToast && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setRewardToast(null)}>
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white dark:bg-[#0F1419] border border-gray-200 dark:border-[rgba(212,168,67,0.2)] shadow-2xl p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="text-4xl mb-3">🎉</div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-[#e8e4dc] mb-1">感谢你的贡献！</h3>
            <p className="text-sm text-gray-600 dark:text-[#8a9a9e] mb-4">
              你帮助我们完善了 <span className="font-semibold text-gray-900 dark:text-[#e8e4dc]">{rewardToast.profName}</span> 的信息
            </p>
            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/15 border border-amber-200/50 dark:border-amber-700/30 p-3 mb-4">
              <p className="text-2xl font-bold text-amber-600 dark:text-[#D4A843]">+{rewardToast.credits} 积分</p>
              <p className="text-xs text-amber-700/70 dark:text-amber-400/70 mt-0.5">当前余额 {rewardToast.newBalance} 积分</p>
            </div>
            {rewardToast.referralCode && (
              <div className="rounded-xl bg-gray-50 dark:bg-[#0d1520] border border-gray-200 dark:border-[rgba(212,168,67,0.15)] p-3 mb-4">
                <p className="text-xs text-gray-700 dark:text-[#8a9a9e] mb-1.5">分享给同学注册，每人再赚 15 积分！</p>
                <div className="flex items-center justify-center gap-2">
                  <code className="text-sm font-bold tracking-widest text-[#1A1A2E] dark:text-[#D4A843]">{rewardToast.referralCode}</code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(`https://koalaphd.com/koala/auth?ref=${rewardToast.referralCode}`); }}
                    className="text-[10px] px-2 py-1 rounded bg-gray-100 dark:bg-[#1a2030] text-gray-700 dark:text-[#e8e4dc] hover:bg-gray-200 dark:hover:bg-[#252f40] transition"
                  >
                    复制链接
                  </button>
                </div>
              </div>
            )}
            <button
              onClick={() => setRewardToast(null)}
              className="w-full py-2.5 rounded-xl text-sm font-semibold bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]"
            >
              知道了
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Professor Card ──────────────────────────────────────────────────────────

function getPositionStyle(title?: string): { bg: string; color: string } {
  if (!title) return { bg: 'rgba(106,122,126,0.1)', color: '#7a8a8e' };
  const t = title.toLowerCase();
  if (t.includes('professor') && !t.includes('associate')) return { bg: 'rgba(180,140,50,0.12)', color: '#9a7a28' };
  if (t.includes('associate professor')) return { bg: 'rgba(140,140,160,0.12)', color: '#8888a0' };
  if (t.includes('senior lecturer') || t.includes('senior research')) return { bg: 'rgba(96,150,220,0.12)', color: '#5088c0' };
  return { bg: 'rgba(106,122,126,0.1)', color: '#7a8a8e' };
}

function ProfCard({ p }: { p: Professor }) {
  const uni = getUniBadge(p.university);
  const statusBadge = getStatusBadge(p.acceptingStudents);
  const hasGrant = p.grantStatus === 'Active';
  const hasStats = p.hIndex || p.paperCount || p.citationCount;
  const posStyle = getPositionStyle(p.positionTitle);
  const isVerified = p.verificationStatus === 'Verified';

  return (
    <div className="rounded-2xl overflow-hidden bg-white dark:bg-[#0F1419] border border-gray-100 dark:border-white/10 hover:shadow-md hover:border-gray-200 dark:hover:border-[#D4A843]/30 transition-all duration-300 hover:-translate-y-0.5 group relative">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D4A843]/60 to-[#4ECDC4]/60 opacity-0 group-hover:opacity-100 transition-opacity" />
      {/* Top badges row */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 flex-wrap">
        {isVerified && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
            ✅ 已认证
          </span>
        )}
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
        {p.email && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(34,197,94,0.12)', color: '#4ade80' }}>
            📧 可联系
          </span>
        )}
        {p.opportunityScore != null && p.opportunityScore >= 70 && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full text-amber-700 dark:text-[#D4A843] bg-amber-50 dark:bg-[#D4A843]/10">
            ⭐ 推荐
          </span>
        )}
        <Bookmark className="size-4 ml-auto shrink-0 text-amber-600 dark:text-[#D4A843]" />
      </div>

      {/* Main info */}
      <div className="flex gap-3 px-4 pb-3">
        {/* University badge */}
        <div className="size-12 shrink-0 rounded-xl flex items-center justify-center text-xs font-bold"
          style={{ background: uni.bg, color: uni.fg }}>
          {uni.short}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-[15px] leading-5 truncate text-gray-900 dark:text-[#e8e4dc]">
            {p.name}
          </h3>
          <p className="text-xs mt-0.5 flex items-center gap-1.5 flex-wrap text-gray-500 dark:text-[#6a7a7e]">
            {p.positionTitle && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: posStyle.bg, color: posStyle.color }}>
                {p.positionTitle}
              </span>
            )}
            <span>{p.university}</span>
          </p>
        </div>
      </div>

      {/* Stats row */}
      {hasStats && (
        <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-white/10 px-4 pb-3 text-xs text-gray-500 dark:text-[#6a7a7e]">
          <div className="flex items-center gap-2 pr-3">
            {p.hIndex != null && (
              <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-[#D4A843]">
                <TrendingUp className="size-3" />
                H:{p.hIndex}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 pl-3">
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
        </div>
      )}

      {/* Suitable backgrounds */}
      {(p.suitableStudentBackgrounds ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1 px-4 pb-2">
          <span className="text-[10px] text-gray-500 dark:text-[#6a7a7e]">适合背景：</span>
          {p.suitableStudentBackgrounds.slice(0, 3).map(bg => (
            <span key={bg} className="text-[10px] px-1.5 py-0.5 rounded-full text-gray-500 dark:text-[#a8b8ac] bg-amber-50 dark:bg-[rgba(212,168,67,0.08)]">
              {bg}
            </span>
          ))}
        </div>
      )}

      {/* Research tags */}
      {(p.researchAreas ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1 px-4 pb-3">
          {p.researchAreas.slice(0, 3).map(area => (
            <span key={area} className="rounded-md text-[10px] px-2 py-0.5 bg-gray-50 dark:bg-amber-900/20 text-gray-600 dark:text-amber-400">
              {area}
            </span>
          ))}
        </div>
      )}

      {/* CTAs */}
      <div className="flex gap-2 px-4 pb-4">
        <Link href={`/koala/professors/${p.id}`}
          className="flex-1 text-center text-xs font-semibold py-2.5 rounded-xl no-underline text-gray-600 dark:text-[#D4A843] bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-[#D4A843] dark:hover:text-[#080C10] transition-all">
          查看详情
        </Link>
        <Link href={`/koala/chat?action=outreach&prof=${p.id}&name=${encodeURIComponent(p.name)}`}
          className="flex-1 text-center text-xs font-semibold py-2 rounded-xl no-underline flex items-center justify-center gap-1 bg-gray-700 hover:bg-gray-800 dark:bg-[#D4A843] text-white dark:text-[#080c10] transition-colors">
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
      <p className="text-xs font-semibold mb-2 text-gray-500 dark:text-[#a8b8ac]">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-full transition-colors ${active ? 'bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10] font-semibold' : 'bg-gray-100 dark:bg-[#0F1419] text-gray-700 dark:text-[#e8e4dc] border border-gray-200 dark:border-[rgba(212,168,67,0.15)]'}`}>
      {label}
    </button>
  );
}
