import { notFound } from 'next/navigation';
import { getProfessor } from '../../../lib/services/professorService';
import { supabaseAdmin } from '../../../lib/supabase/server';
import ProfessorDetailClient from './ProfessorDetailClient';

export const revalidate = 3600;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export default async function ProfessorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const professor = await getProfessor(id);
  if (!professor) notFound();

  const { data: papersRaw } = await db
    .from('papers')
    .select('id, title, year, citation_count, journal, doi, doi_url, ss_url')
    .eq('professor_id', id)
    .order('citation_count', { ascending: false })
    .limit(20);

  const papers = papersRaw ?? [];

  const sameAs = [
    professor.googleScholarUrl,
    professor.linkedinUrl,
    professor.profileUrl,
  ].filter(Boolean);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: professor.name,
    jobTitle: professor.positionTitle || 'Academic',
    affiliation: {
      '@type': 'Organization',
      name: professor.university,
    },
    url: `https://koalaphd.com/koala/professors/${id}`,
    ...(sameAs.length > 0 && { sameAs }),
    ...(professor.researchAreas.length > 0 && { knowsAbout: professor.researchAreas }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProfessorDetailClient professor={professor} papers={papers} />
    </>
  );
}
