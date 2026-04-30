'use client';
import { useState } from 'react';

export interface PaperData {
  title: string;
  authors: string | string[];
  year: number;
  journal?: string;
  doi?: string;
  doiUrl?: string;
  openAccessUrl?: string;
  arxivId?: string;
  arxivUrl?: string;
  referenceLink?: string;
  citations?: number;
  abstract?: string;
}

interface PaperCitationCardProps {
  paper: PaperData;
  compact?: boolean;
  index?: number;
}

function formatAuthors(authors: string | string[]): string {
  if (typeof authors === 'string') return authors;
  if (authors.length === 0) return 'Unknown';
  if (authors.length === 1) return authors[0];
  if (authors.length === 2) return `${authors[0]} & ${authors[1]}`;
  return `${authors[0]} et al.`;
}

function formatAPA(paper: PaperData): string {
  const authors = formatAuthors(paper.authors);
  const journal = paper.journal ? `. ${paper.journal}` : '';
  const doi = paper.doi ? `. https://doi.org/${paper.doi}` : '';
  return `${authors} (${paper.year}). ${paper.title}${journal}${doi}`;
}

export function PaperCitationCard({ paper, compact = false, index }: PaperCitationCardProps) {
  const [copied, setCopied] = useState(false);
  const [showAbstract, setShowAbstract] = useState(false);

  const primaryLink = paper.openAccessUrl ?? paper.arxivUrl ?? paper.doiUrl ?? paper.referenceLink;
  const hasFreeAccess = !!(paper.openAccessUrl || paper.arxivUrl);
  const authorsStr = formatAuthors(paper.authors);

  async function copyAPA() {
    try {
      await navigator.clipboard.writeText(formatAPA(paper));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement('textarea');
      el.value = formatAPA(paper);
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (compact) {
    return (
      <a
        href={primaryLink ?? '#'}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-start gap-2 rounded-xl p-2.5 no-underline mt-1.5 block"
        style={{ background: '#fff', border: '1px solid #e8dcc8' }}
      >
        <span className="text-sm flex-shrink-0 mt-0.5">📄</span>
        <div className="min-w-0">
          <div className="text-xs font-medium leading-snug line-clamp-2" style={{ color: '#1a2332' }}>{paper.title}</div>
          <div className="text-[10px] mt-0.5" style={{ color: '#907858' }}>
            {authorsStr} · {paper.year}
            {paper.journal && ` · ${paper.journal}`}
            {hasFreeAccess && <span style={{ color: '#5a8060' }}> · 免费获取</span>}
          </div>
        </div>
      </a>
    );
  }

  return (
    <div
      className="rounded-xl overflow-hidden mt-2"
      style={{ background: '#fff', border: '1px solid #e8dcc8' }}
    >
      <div className="p-3">
        <div className="flex items-start gap-2">
          <span className="text-base flex-shrink-0 mt-0.5">
            {index !== undefined ? (
              <span
                className="inline-flex items-center justify-center size-5 rounded-full text-[10px] font-bold text-white"
                style={{ background: '#7d6340' }}
              >
                {index + 1}
              </span>
            ) : '📄'}
          </span>
          <div className="min-w-0 flex-1">
            {primaryLink ? (
              <a
                href={primaryLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold leading-snug no-underline hover:underline"
                style={{ color: '#1a2332' }}
              >
                {paper.title}
              </a>
            ) : (
              <div className="text-xs font-semibold leading-snug" style={{ color: '#1a2332' }}>{paper.title}</div>
            )}
            <div className="text-[11px] mt-0.5" style={{ color: '#907858' }}>
              {authorsStr} · {paper.year}
              {paper.journal && ` · ${paper.journal}`}
            </div>
            {paper.citations !== undefined && paper.citations > 0 && (
              <div className="text-[10px] mt-0.5" style={{ color: '#b09878' }}>引用 {paper.citations} 次</div>
            )}
            {paper.doi && (
              <div className="text-[10px] mt-0.5 font-mono" style={{ color: '#c0a878' }}>DOI: {paper.doi}</div>
            )}
          </div>
        </div>

        {paper.abstract && (
          <div className="mt-2">
            <button
              onClick={() => setShowAbstract(s => !s)}
              className="text-[10px]"
              style={{ color: '#c4a050' }}
            >
              {showAbstract ? '收起摘要 ▲' : '查看摘要 ▼'}
            </button>
            {showAbstract && (
              <p className="text-[11px] leading-relaxed mt-1" style={{ color: '#584838' }}>
                {paper.abstract.slice(0, 400)}{paper.abstract.length > 400 ? '...' : ''}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1.5 px-3 pb-3">
        {primaryLink && (
          <a
            href={primaryLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-1.5 rounded-lg text-[11px] font-medium text-center no-underline"
            style={{
              background: hasFreeAccess ? '#f0f8f2' : '#f2ead6',
              color: hasFreeAccess ? '#5a8060' : '#7d6340',
              border: `1px solid ${hasFreeAccess ? '#c0e0c8' : '#e8dcc8'}`,
            }}
          >
            🔗 {hasFreeAccess ? '查看全文' : '查看论文'}
          </a>
        )}
        {hasFreeAccess && (
          <a
            href={paper.openAccessUrl ?? paper.arxivUrl ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-1.5 rounded-lg text-[11px] font-medium text-center no-underline"
            style={{ background: '#f2ead6', color: '#7d6340', border: '1px solid #e8dcc8' }}
          >
            📥 PDF
          </a>
        )}
        <button
          onClick={copyAPA}
          className="flex-1 py-1.5 rounded-lg text-[11px] font-medium"
          style={{
            background: copied ? '#f0f8f2' : '#f2ead6',
            color: copied ? '#5a8060' : '#7d6340',
            border: `1px solid ${copied ? '#c0e0c8' : '#e8dcc8'}`,
          }}
        >
          {copied ? '✅ 已复制' : '📋 复制引用'}
        </button>
      </div>
    </div>
  );
}
