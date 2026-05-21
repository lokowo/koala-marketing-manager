'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, X, ExternalLink } from 'lucide-react';
import { IconSun, IconMoon } from '@tabler/icons-react';

const TITLES: Record<string, string> = {
  '/dashboard/koala': '仪表盘',
  '/dashboard/koala/sales-overview': '分销总览',
  '/dashboard/koala/sales-agents': '销售人员',

  '/dashboard/koala/kpi-targets': 'KPI 目标',
  '/dashboard/koala/commission-review': '佣金审核',
  '/dashboard/koala/sales-audit': '审计日志',
  '/dashboard/koala/users': '用户管理',
  '/dashboard/koala/roles': '角色管理',
  '/dashboard/koala/growth': '用户增长',
  '/dashboard/koala/analytics': '数据分析',
  '/dashboard/koala/revenue': '收入分析',
  '/dashboard/koala/notifications': '站内信',
  '/dashboard/koala/blog': '博客管理',
  '/dashboard/koala/blog/edit': '编辑文章',
  '/dashboard/koala/topics': '话题管理',
  '/dashboard/koala/ai-content': 'AI 内容生成',
  '/dashboard/koala/ai-content/batch': 'AI 批量生成',
  '/dashboard/koala/banners': 'Banner 管理',
  '/dashboard/koala/surveys': '问卷管理',
  '/dashboard/koala/professors': '教授管理',
  '/dashboard/koala/professors/quality': '数据质量',
  '/dashboard/koala/grants': 'Grants',
  '/dashboard/koala/knowledge-base': '知识库',
  '/dashboard/koala/faq': 'FAQ 管理',
  '/dashboard/koala/ola-triggers': 'Ola 触发器',
  '/dashboard/koala/ola-analytics': 'Ola 分析',
  '/dashboard/koala/handoff': 'Handoff 队列',
  '/dashboard/koala/settings': '系统设置',
  '/dashboard/koala/work-logs': '工作日志',
  '/dashboard/koala/marketing-tools': '营销工具',
};

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export default function Header({ onMenuClick, theme, onToggleTheme }: { onMenuClick?: () => void; theme?: 'light' | 'dark'; onToggleTheme?: () => void }) {
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
        const res = await fetch(`/api/admin/work-logs?search=${encodeURIComponent(query)}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          setResults((data.logs || []).map((l: { id: string; action: string; target_type: string; target_name: string; created_at: string }) => ({
            id: l.id,
            title: `${l.action} ${l.target_name || ''}`.trim(),
            subtitle: `${l.target_type || ''} · ${new Date(l.created_at).toLocaleString('zh-CN')}`,
            href: '/dashboard/koala/work-logs',
          })));
        }
      } catch { /* ignore */ }
      setSearching(false);
    }, 300);
  }, [query]);

  function handleSelect(r: SearchResult) {
    router.push(`${r.href}?search=${encodeURIComponent(query)}`);
    setSearchOpen(false);
    setQuery('');
    setResults([]);
  }

  return (
    <header className="bg-white dark:bg-[#1E293B] border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 py-3 flex items-center gap-3 md:gap-4">
      {/* Mobile hamburger */}
      {onMenuClick && (
        <button onClick={onMenuClick} className="md:hidden p-1.5 -ml-1 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
        </button>
      )}
      <h2 className="text-base md:text-lg font-light tracking-tight text-gray-900 dark:text-gray-100 flex-1 truncate">{title}</h2>

      {/* Link to frontend */}
      <Link
        href="/koala/home"
        target="_blank"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors no-underline"
      >
        <ExternalLink className="size-3.5" />
        <span className="hidden sm:inline">前往前端</span>
      </Link>

      {/* Theme toggle */}
      {onToggleTheme && (
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
        >
          {theme === 'dark'
            ? <IconSun size={18} className="text-yellow-400" />
            : <IconMoon size={18} className="text-gray-500" />}
        </button>
      )}

      {/* Search trigger */}
      <button
        onClick={() => setSearchOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-sm text-gray-400 dark:text-gray-500 hover:border-gray-300 dark:hover:border-gray-500 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
      >
        <Search className="size-3.5" />
        <span className="hidden sm:inline">搜索操作日志...</span>
        <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 font-mono ml-2 hidden sm:inline">⌘K</kbd>
      </button>

      {/* Search overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          <div className="absolute inset-0 bg-black/30" onClick={() => { setSearchOpen(false); setQuery(''); setResults([]); }} />
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <Search className="size-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="搜索操作日志...（如「删除 Jones」「生成文章」）"
                className="flex-1 text-sm outline-none text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 bg-transparent"
              />
              {query && (
                <button onClick={() => { setQuery(''); setResults([]); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X className="size-4" />
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {searching && (
                <div className="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500">搜索中...</div>
              )}
              {!searching && query && results.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500">无结果</div>
              )}
              {results.map(r => (
                <button
                  key={r.id}
                  onClick={() => handleSelect(r)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <Search className="size-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{r.title}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 truncate">{r.subtitle}</div>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 flex-shrink-0">日志</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
