'use client';

interface DontKnowResponseProps {
  searchQueries?: string[];
  topic?: string;
  suggestedQuestions?: string[];
  onUpload?: () => void;
  onSuggestedQuestion?: (q: string) => void;
}

export function DontKnowResponse({
  searchQueries = [],
  topic,
  suggestedQuestions = [],
  onUpload,
  onSuggestedQuestion,
}: DontKnowResponseProps) {
  const defaultSuggestions = suggestedQuestions.length > 0 ? suggestedQuestions : [
    '这个方向的主流研究方法有哪些？',
    '相关领域的最新进展概述',
    '澳洲有哪些教授在做类似研究？',
  ];

  const primaryQuery = searchQueries[0] ?? topic ?? '';
  const gsUrl = primaryQuery
    ? `https://scholar.google.com/scholar?q=${encodeURIComponent(primaryQuery)}`
    : 'https://scholar.google.com';
  const ssUrl = primaryQuery
    ? `https://www.semanticscholar.org/search?q=${encodeURIComponent(primaryQuery)}&sort=Relevance`
    : 'https://www.semanticscholar.org';

  return (
    <div className="rounded-2xl p-3 mt-2 space-y-3 bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/10">
      <div className="flex items-start gap-2">
        <span className="text-base flex-shrink-0">⚠️</span>
        <div>
          <div className="text-xs font-semibold text-gray-900 dark:text-[#e8e4dc]">
            {topic ? `关于"${topic}"，` : ''}我的知识库暂无足够可靠的信息
          </div>
          <div className="text-[11px] mt-0.5 text-gray-500 dark:text-[#6a7a7e]">
            我不想给你不准确的回答。以下是我建议的查找方式：
          </div>
        </div>
      </div>

      {/* Search links */}
      <div className="space-y-2">
        <div className="text-[10px] font-semibold text-[#D4A843]">🔍 直接搜索</div>
        <div className="space-y-1.5">
          <a
            href={gsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-xl px-3 py-2 no-underline bg-[#D4A843]/[0.06] border border-[#D4A843]/10"
          >
            <span className="text-[11px] font-medium text-gray-900 dark:text-[#e8e4dc]">📗 Google Scholar</span>
            {primaryQuery && (
              <span className="text-[10px] truncate max-w-[60%] ml-2 text-gray-500 dark:text-[#6a7a7e]">
                &ldquo;{primaryQuery}&rdquo;
              </span>
            )}
            <span className="text-[10px] ml-1 flex-shrink-0 text-[#5a8060]">→</span>
          </a>
          <a
            href={ssUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-xl px-3 py-2 no-underline bg-[#D4A843]/[0.06] border border-[#D4A843]/10"
          >
            <span className="text-[11px] font-medium text-gray-900 dark:text-[#e8e4dc]">📘 Semantic Scholar</span>
            {primaryQuery && (
              <span className="text-[10px] truncate max-w-[60%] ml-2 text-gray-500 dark:text-[#6a7a7e]">
                &ldquo;{primaryQuery}&rdquo;
              </span>
            )}
            <span className="text-[10px] ml-1 flex-shrink-0 text-[#5a8060]">→</span>
          </a>
        </div>
      </div>

      {/* Upload option */}
      {onUpload && (
        <div>
          <div className="text-[10px] font-semibold mb-1.5 text-[#D4A843]">📄 或者上传你正在读的论文</div>
          <button
            onClick={onUpload}
            className="w-full rounded-xl py-2 text-[11px] font-medium bg-[#D4A843]/[0.06] border border-gray-300 dark:border-[#d8c8a8] text-[#D4A843]"
          >
            📎 上传论文 PDF，我来帮你分析
          </button>
        </div>
      )}

      {/* Suggested rephrasing */}
      <div>
        <div className="text-[10px] font-semibold mb-1.5 text-[#D4A843]">💡 换个角度问我</div>
        <div className="space-y-1">
          {defaultSuggestions.map((q, i) => (
            <button
              key={i}
              onClick={() => onSuggestedQuestion?.(q)}
              className="w-full text-left rounded-xl px-3 py-2 text-[11px] bg-white dark:bg-[#080c10] border border-gray-200 dark:border-white/10 text-gray-700 dark:text-[#a8b8ac]"
            >
              · {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
