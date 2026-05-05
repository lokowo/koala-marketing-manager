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
  const color = matchScore ? (matchScore >= 75 ? '#5a8060' : matchScore >= 50 ? '#c9a96e' : '#b06040') : '#c9a96e';

  if (compact) {
    return (
      <Link
        href={`/koala/professors/${professorId}`}
        className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 no-underline"
        style={{ background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.1)' }}
      >
        <span className="text-sm">🎓</span>
        <span className="text-xs font-medium" style={{ color: '#e8e4dc' }}>{name}</span>
        <span className="text-[11px]" style={{ color: '#6a7a7e' }}>{institution}</span>
        {matchScore && <span className="ml-auto text-xs font-bold" style={{ color }}>{matchScore}%</span>}
      </Link>
    );
  }

  return (
    <Link
      href={`/koala/professors/${professorId}`}
      className="block rounded-2xl p-3 no-underline"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,169,110,0.1)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-semibold" style={{ color: '#e8e4dc' }}>🎓 {name}</div>
          <div className="text-[11px] mt-0.5" style={{ color: '#6a7a7e' }}>{institution}</div>
          {positionTitle && (
            <div className="text-[10px] mt-0.5" style={{ color: '#b09878' }}>{positionTitle}</div>
          )}
          {researchTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {researchTags.slice(0, 3).map(tag => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(201,169,110,0.06)', color: '#c9a96e' }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
          {opportunityLabel && (
            <span className="inline-block text-[10px] px-2 py-0.5 rounded-full mt-1.5" style={{ background: '#f0f8f2', color: '#5a8060' }}>
              {opportunityLabel}
            </span>
          )}
        </div>
        {matchScore !== undefined && (
          <div className="flex-shrink-0 text-center">
            <div className="text-lg font-bold" style={{ color }}>{matchScore}</div>
            <div className="text-[10px]" style={{ color: '#b09878' }}>匹配</div>
          </div>
        )}
      </div>
    </Link>
  );
}
