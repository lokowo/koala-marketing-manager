'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, ExternalLink, Sparkles } from 'lucide-react';

interface Professor {
  id: string;
  name: string;
  university: string;
  faculty: string | null;
  position_title: string | null;
  research_areas: string[];
  email: string | null;
  profile_url: string | null;
  google_scholar_url: string | null;
  h_index: number | null;
  paper_count: number | null;
  citation_count: number | null;
  accepting_students: string | null;
  grant_status: string | null;
  opportunity_score: number | null;
  is_verified: boolean;
  verified_at: string | null;
  professor_message: string | null;
  professor_message_updated_at: string | null;
  looking_for: string | null;
  slug: string;
  ai_summary: string | null;
  suitable_student_backgrounds: string[];
  potential_rp_topics: string[];
}

interface Paper {
  id: string;
  title: string;
  year: number | null;
  citation_count: number;
  journal: string | null;
  doi_url: string | null;
}

const CARD = 'rounded-xl bg-white border border-gray-200 shadow-sm';

function StatusBadge({ status }: { status: string | null }) {
  if (status === 'yes') return <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-green-50 text-green-700">Accepting Students</span>;
  if (status === 'likely') return <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">Limited Spots</span>;
  if (status === 'no') return <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-red-50 text-red-600">Not Accepting</span>;
  return <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">Status Unknown</span>;
}

function StatCell({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="text-center">
      <div className="text-lg font-medium text-gray-900 tabular-nums">{value ?? '—'}</div>
      <div className="text-[11px] text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

export default function ProfessorPublicClient({
  professor: prof,
  papers,
  activeGrantCount,
}: {
  professor: Professor;
  papers: Paper[];
  activeGrantCount: number;
}) {
  const [polishing, setPolishing] = useState(false);
  const [polishedMsg, setPolishedMsg] = useState<string | null>(null);

  async function handlePolish() {
    if (!prof.professor_message) return;
    setPolishing(true);
    try {
      const res = await fetch('/api/professor/ai-polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: prof.professor_message, targetLang: 'en' }),
      });
      const data = await res.json();
      if (data.polished_text) setPolishedMsg(data.polished_text);
    } catch { /* ignore */ }
    setPolishing(false);
  }

  const messageText = polishedMsg ?? prof.professor_message;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Banner */}
      <div className="h-20 bg-gradient-to-r from-[#1A1A2E] to-[#2a3a52]" />

      <div className="max-w-3xl mx-auto px-4 -mt-8 pb-16">
        {/* Profile header */}
        <div className={`${CARD} p-6`}>
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-medium text-blue-700 shrink-0 -mt-10 border-4 border-white shadow-sm">
              {prof.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-light text-gray-900 tracking-tight">{prof.name}</h1>
                {prof.is_verified && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                    <Check size={12} /> Verified
                  </span>
                )}
              </div>
              {prof.position_title && (
                <p className="text-sm text-gray-600 mt-0.5">{prof.position_title}</p>
              )}
              <p className="text-sm text-gray-500 mt-0.5">
                {prof.university}
                {prof.faculty && ` · ${prof.faculty}`}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <StatusBadge status={prof.accepting_students} />
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mt-5 pt-5 border-t border-gray-100">
            <StatCell label="H-index" value={prof.h_index} />
            <StatCell label="Papers" value={prof.paper_count} />
            <StatCell label="Citations" value={prof.citation_count ? prof.citation_count.toLocaleString() : null} />
            <StatCell label="Active Grants" value={activeGrantCount || '—'} />
          </div>

          {/* External links */}
          <div className="flex gap-2 mt-4 flex-wrap">
            {prof.profile_url && (
              <a href={prof.profile_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline no-underline">
                <ExternalLink size={12} /> University Profile
              </a>
            )}
            {prof.google_scholar_url && (
              <a href={prof.google_scholar_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline no-underline">
                <ExternalLink size={12} /> Google Scholar
              </a>
            )}
          </div>
        </div>

        {/* Research areas */}
        {prof.research_areas.length > 0 && (
          <div className={`${CARD} p-5 mt-4`}>
            <h2 className="text-sm font-medium text-gray-900 mb-3">Research Areas</h2>
            <div className="flex flex-wrap gap-1.5">
              {prof.research_areas.map((area) => (
                <span key={area} className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                  {area}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Professor says */}
        {messageText && (
          <div className={`${CARD} p-5 mt-4`}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-gray-900">From the Professor</h2>
              {prof.is_verified && prof.professor_message && !polishedMsg && (
                <button
                  onClick={handlePolish}
                  disabled={polishing}
                  className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 bg-transparent disabled:opacity-50"
                >
                  <Sparkles size={12} /> {polishing ? 'Polishing…' : 'AI Polish'}
                </button>
              )}
            </div>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{messageText}</p>
            {prof.professor_message_updated_at && (
              <p className="text-[11px] text-gray-400 mt-2">
                Last updated: {new Date(prof.professor_message_updated_at).toLocaleDateString('en-AU', { year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
            )}
          </div>
        )}

        {/* Looking for */}
        {prof.looking_for && (
          <div className={`${CARD} p-5 mt-4`}>
            <h2 className="text-sm font-medium text-gray-900 mb-3">Looking For</h2>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{prof.looking_for}</p>
          </div>
        )}

        {/* Suitable backgrounds + RP topics */}
        {(prof.suitable_student_backgrounds.length > 0 || prof.potential_rp_topics.length > 0) && (
          <div className={`${CARD} p-5 mt-4`}>
            {prof.suitable_student_backgrounds.length > 0 && (
              <div className="mb-4">
                <h2 className="text-sm font-medium text-gray-900 mb-2">Suitable Student Backgrounds</h2>
                <ul className="space-y-1">
                  {prof.suitable_student_backgrounds.map((bg, i) => (
                    <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span> {bg}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {prof.potential_rp_topics.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-gray-900 mb-2">Potential Research Topics</h2>
                <ul className="space-y-1">
                  {prof.potential_rp_topics.map((topic, i) => (
                    <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span> {topic}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Papers */}
        {papers.length > 0 && (
          <div className={`${CARD} p-5 mt-4`}>
            <h2 className="text-sm font-medium text-gray-900 mb-3">Recent Publications</h2>
            <div className="space-y-3">
              {papers.map((paper) => (
                <div key={paper.id} className="pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                  <p className="text-sm font-medium text-gray-800 leading-snug">{paper.title}</p>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500">
                    {paper.journal && <span>{paper.journal}</span>}
                    {paper.year && <span>{paper.year}</span>}
                    <span className="tabular-nums">{paper.citation_count} citations</span>
                    {paper.doi_url && (
                      <a href={paper.doi_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 no-underline hover:underline">
                        DOI ↗
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI summary */}
        {prof.ai_summary && (
          <div className={`${CARD} p-5 mt-4`}>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-medium text-gray-900">AI Summary</h2>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-500">AI</span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{prof.ai_summary}</p>
          </div>
        )}

        {/* CTA */}
        <div className={`${CARD} p-5 mt-4 text-center`}>
          <p className="text-sm text-gray-600 mb-3">Interested in working with {prof.name}?</p>
          <Link
            href={`/koala/chat?professor=${prof.id}`}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors no-underline min-h-[44px]"
          >
            Chat with Ola about this Professor →
          </Link>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-gray-400 mt-6">
          Powered by <Link href="/koala/home" className="text-blue-500 no-underline hover:underline">Koala PhD</Link>
        </p>
      </div>
    </div>
  );
}
