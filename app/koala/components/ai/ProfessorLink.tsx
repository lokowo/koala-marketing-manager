'use client';
import Link from 'next/link';

interface ProfessorLinkProps {
  professorId: string;
  name: string;
  institution: string;
  positionTitle?: string;
  researchTags?: string[];
  matchScore?: number;
  opportunityLabel?: string;
  compact?: boolean;
}

export function ProfessorLink({
  professorId,
  name,
  institution,
  positionTitle,
  researchTags = [],
  matchScore,
  opportunityLabel,
  compact = false,
}: ProfessorLinkProps) {
  const colorClass = matchScore
    ? (matchScore >= 75 ? 'text-[#5a8060]' : matchScore >= 50 ? 'text-amber-600 dark:text-[#D4A843]' : 'text-[#b06040]')
    : 'text-amber-600 dark:text-[#D4A843]';

  if (compact) {
    return (
      <Link
        href={`/koala/professors/${professorId}`}
        className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 no-underline bg-amber-50 dark:bg-[#D4A843]/10 border border-amber-200/50 dark:border-[#D4A843]/10"
      >
        <span className="text-sm">🎓</span>
        <span className="text-xs font-medium text-gray-900 dark:text-[#e8e4dc]">{name}</span>
        <span className="text-[11px] text-gray-500 dark:text-[#6a7a7e]">{institution}</span>
        {matchScore && <span className={`ml-auto text-xs font-bold ${colorClass}`}>{matchScore}%</span>}
      </Link>
    );
  }

  return (
    <Link
      href={`/koala/professors/${professorId}`}
      className="block rounded-2xl p-3 no-underline bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-gray-900 dark:text-[#e8e4dc]">🎓 {name}</div>
          <div className="text-[11px] mt-0.5 text-gray-500 dark:text-[#6a7a7e]">{institution}</div>
          {positionTitle && (
            <div className="text-[10px] mt-0.5 text-gray-500 dark:text-[#b09878]">{positionTitle}</div>
          )}
          {researchTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {researchTags.slice(0, 3).map(tag => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-[#D4A843]/10 text-amber-700 dark:text-[#D4A843]">
                  {tag}
                </span>
              ))}
            </div>
          )}
          {opportunityLabel && (
            <span className="inline-block text-[10px] px-2 py-0.5 rounded-full mt-1.5 bg-[#f0f8f2] text-[#5a8060]">
              {opportunityLabel}
            </span>
          )}
        </div>
        {matchScore !== undefined && (
          <div className="flex-shrink-0 text-center">
            <div className={`text-lg font-bold ${colorClass}`}>{matchScore}</div>
            <div className="text-[10px] text-gray-500 dark:text-[#b09878]">匹配</div>
          </div>
        )}
      </div>
    </Link>
  );
}
