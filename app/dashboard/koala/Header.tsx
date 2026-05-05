'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';

const TITLES: Record<string, string> = {
  '/dashboard/koala': '仪表盘',
  '/dashboard/koala/blog': '博客管理',
  '/dashboard/koala/blog/edit': '编辑文章',
  '/dashboard/koala/ai-content': 'AI 内容生成',
  '/dashboard/koala/ai-content/batch': 'AI 批量生成',
  '/dashboard/koala/professors': '教授库管理',
  '/dashboard/koala/professors/quality': '数据质量',
  '/dashboard/koala/users': '用户管理',
  '/dashboard/koala/analytics': '数据分析',
  '/dashboard/koala/settings': '系统设置',
};

interface SearchResult {
  type: 'professor' | 'blog' | 'user';
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  let title = TITLES[pathname] || '';
  if (!title && pathname.startsWith('/dashboard/koala/professors/')) title = '教授详情';
  if (!title && pathname.startsWith('/dashboard/koala/users/')) title = '用户详情';
  if (!title) title = '仪表盘';

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
        }
      } catch { /* ignore */ }
      setSearching(false);
    }, 300);
  }, [query]);

  function handleSelect(r: SearchResult) {
    router.push(r.href);
    setSearchOpen(false);
    setQuery('');
    setResults([]);
  }

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-4">
      <h2 className="text-lg font-semibold text-slate-900 flex-1">{title}</h2>

      {/* Search trigger */}
      <button
        onClick={() => setSearchOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-400 hover:border-slate-300 hover:text-slate-500 transition-colors"
      >
        <Search className="size-3.5" />
        <span>搜索教授、文章、用户...</span>
        <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 font-mono ml-4">⌘K</kbd>
      </button>

      {/* Search overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          <div className="absolute inset-0 bg-black/30" onClick={() => { setSearchOpen(false); setQuery(''); setResults([]); }} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
              <Search className="size-4 text-slate-400 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="搜索教授名、文章标题、用户邮箱..."
                className="flex-1 text-sm outline-none text-slate-800 placeholder:text-slate-400"
              />
              {query && (
                <button onClick={() => { setQuery(''); setResults([]); }} className="text-slate-400 hover:text-slate-600">
                  <X className="size-4" />
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {searching && (
                <div className="px-4 py-6 text-center text-sm text-slate-400">搜索中...</div>
              )}
              {!searching && query && results.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-slate-400">无结果</div>
              )}
              {results.map(r => (
                <button
                  key={`${r.type}-${r.id}`}
                  onClick={() => handleSelect(r)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                >
                  <span className="text-sm flex-shrink-0">
                    {r.type === 'professor' ? '👨\u200D🏫' : r.type === 'blog' ? '📝' : '👤'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800 truncate">{r.title}</div>
                    <div className="text-xs text-slate-400 truncate">{r.subtitle}</div>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 flex-shrink-0">
                    {r.type === 'professor' ? '教授' : r.type === 'blog' ? '文章' : '用户'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
