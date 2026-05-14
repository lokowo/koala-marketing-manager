'use client';
import { useState } from 'react';
import { PaperCitationCard, type PaperData } from './PaperCitationCard';

interface ExtendedReadingPanelProps {
  papers: PaperData[];
  searchQueries?: string[];
  sources?: string[];
  totalFound?: number;
  defaultExpanded?: boolean;
}

export function ExtendedReadingPanel({
  papers,
  searchQueries = [],
  sources = [],
  totalFound,
  defaultExpanded = false,
}: ExtendedReadingPanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [showAll, setShowAll] = useState(false);

  const displayedPapers = showAll ? papers : papers.slice(0, 3);

  if (!papers.length) return null;

  return (
    <div className="rounded-xl overflow-hidden mt-2 border border-gray-200 dark:border-white/10">
      <button
        className="w-full flex items-center justify-between px-3 py-2.5 bg-amber-50 dark:bg-[#D4A843]/10"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">📚</span>
          <span className="text-[11px] font-medium text-amber-600 dark:text-[#D4A843]">
            延伸阅读 · 共检索到 {totalFound ?? papers.length} 篇论文
          </span>
        </div>
        <div className="flex items-center gap-2">
          {sources.length > 0 && (
            <span className="text-[10px] text-gray-500 dark:text-[#b09878]">
              {sources.join(' + ')}
            </span>
          )}
          <span className="text-[11px] text-amber-600 dark:text-[#D4A843]">
            {expanded ? '▲' : '▼'}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3">
          {searchQueries.length > 0 && (
            <div className="py-2 text-[10px] text-gray-500 dark:text-[#b09878] border-b border-amber-200/50 dark:border-[#D4A843]/[0.06]">
              搜索关键词：{searchQueries.map(q => `"${q}"`).join(' · ')}
            </div>
          )}

          <div className="space-y-1 mt-2">
            {displayedPapers.map((paper, i) => (
              <PaperCitationCard key={i} paper={paper} compact={false} index={i} />
            ))}
          </div>

          {papers.length > 3 && (
            <button
              onClick={() => setShowAll(s => !s)}
              className="w-full mt-2 py-2 rounded-xl text-[11px] font-medium bg-amber-50 dark:bg-[#D4A843]/10 text-amber-600 dark:text-[#D4A843] border border-amber-200/50 dark:border-[#D4A843]/10"
            >
              {showAll ? '收起 ▲' : `查看全部 ${papers.length} 篇 ▼`}
            </button>
          )}

          <p className="text-[10px] mt-2 leading-relaxed text-gray-500 dark:text-[#b09878]">
            📡 数据实时获取 · Koala 不对论文内容的准确性负责，请自行验证。
            检索时间：{new Date().toLocaleTimeString('zh-CN')} AEST
          </p>
        </div>
      )}
    </div>
  );
}
