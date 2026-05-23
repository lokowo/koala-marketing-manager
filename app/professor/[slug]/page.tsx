import { notFound } from 'next/navigation';
import { supabaseAdmin } from '../../lib/supabase/server';
import ProfessorPublicClient from './ProfessorPublicClient';
import type { Metadata } from 'next';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export const revalidate = 1800;

interface ProfessorRow {
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

interface PaperRow {
  id: string;
  title: string;
  year: number | null;
  citation_count: number;
  journal: string | null;
  doi_url: string | null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { data: prof } = await db
    .from('professors')
    .select('name, university, research_areas, position_title')
    .eq('slug', slug)
    .maybeSingle();

  if (!prof) return { title: 'Professor Not Found' };

  return {
    title: `${prof.name} — ${prof.university} | Koala PhD`,
    description: `${prof.position_title || 'Researcher'} at ${prof.university}. Research: ${(prof.research_areas ?? []).slice(0, 3).join(', ')}`,
  };
}

export default async function ProfessorPublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const { data: professor } = await db
    .from('professors')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (!professor) notFound();

  const prof = professor as ProfessorRow;

  const { data: papersRaw } = await db
    .from('papers')
    .select('id, title, year, citation_count, journal, doi_url')
    .eq('professor_id', prof.id)
    .order('year', { ascending: false })
    .limit(10);

  const papers: PaperRow[] = papersRaw ?? [];

  // Count active grants
  const { count: grantCount } = await db
    .from('grants')
    .select('*', { count: 'exact', head: true })
    .eq('lead_professor_id', prof.id);

  return (
    <ProfessorPublicClient
      professor={prof}
      papers={papers}
      activeGrantCount={grantCount ?? 0}
    />
  );
}
