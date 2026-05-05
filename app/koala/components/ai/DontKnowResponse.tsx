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
    <div
      className="rounded-2xl p-3 mt-2 space-y-3"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,169,110,0.1)' }}
    >
      <div className="flex items-start gap-2">
        <span className="text-base flex-shrink-0">⚠️</span>
        <div>
          <div className="text-xs font-semibold" style={{ color: '#e8e4dc' }}>
            {topic ? `关于"${topic}"，` : ''}我的知识库暂无足够可靠的信息
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: '#6a7a7e' }}>
            我不想给你不准确的回答。以下是我建议的查找方式：
          </div>
        </div>
      </div>

      {/* Search links */}
      <div className="space-y-2">
        <div className="text-[10px] font-semibold" style={{ color: '#c9a96e' }}>🔍 直接搜索</div>
        <div className="space-y-1.5">
          <a
            href={gsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-xl px-3 py-2 no-underline"
            style={{ background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.1)' }}
          >
            <span className="text-[11px] font-medium" style={{ color: '#e8e4dc' }}>📗 Google Scholar</span>
            {primaryQuery && (
              <span className="text-[10px] truncate max-w-[60%] ml-2" style={{ color: '#6a7a7e' }}>
                &ldquo;{primaryQuery}&rdquo;
              </span>
            )}
            <span className="text-[10px] ml-1 flex-shrink-0" style={{ color: '#5a8060' }}>→</span>
          </a>
          <a
            href={ssUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-xl px-3 py-2 no-underline"
            style={{ background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.1)' }}
          >
            <span className="text-[11px] font-medium" style={{ color: '#e8e4dc' }}>📘 Semantic Scholar</span>
            {primaryQuery && (
              <span className="text-[10px] truncate max-w-[60%] ml-2" style={{ color: '#6a7a7e' }}>
                &ldquo;{primaryQuery}&rdquo;
              </span>
            )}
            <span className="text-[10px] ml-1 flex-shrink-0" style={{ color: '#5a8060' }}>→</span>
          </a>
        </div>
      </div>

      {/* Upload option */}
      {onUpload && (
        <div>
          <div className="text-[10px] font-semibold mb-1.5" style={{ color: '#c9a96e' }}>📄 或者上传你正在读的论文</div>
          <button
            onClick={onUpload}
            className="w-full rounded-xl py-2 text-[11px] font-medium"
            style={{ background: 'rgba(201,169,110,0.06)', border: '1px solid #d8c8a8', color: '#c9a96e' }}
          >
            📎 上传论文 PDF，我来帮你分析
          </button>
        </div>
      )}

      {/* Suggested rephrasing */}
      <div>
        <div className="text-[10px] font-semibold mb-1.5" style={{ color: '#c9a96e' }}>💡 换个角度问我</div>
        <div className="space-y-1">
          {defaultSuggestions.map((q, i) => (
            <button
              key={i}
              onClick={() => onSuggestedQuestion?.(q)}
              className="w-full text-left rounded-xl px-3 py-2 text-[11px]"
              style={{ background: '#080c10', border: '1px solid rgba(201,169,110,0.1)', color: '#a8b8ac' }}
            >
              · {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
