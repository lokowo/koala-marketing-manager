import { supabaseAdmin } from '../supabase/server';
import { createProfessor } from './professorService';
import type { Professor } from '../types';

interface OpenAlexAuthor {
  id: string;
  display_name: string;
  works_count: number;
  cited_by_count: number;
  summary_stats?: { h_index?: number; '2yr_mean_citedness'?: number };
  affiliations?: Array<{
    institution: { display_name: string; country_code: string; type: string };
    years: number[];
  }>;
  last_known_institutions?: Array<{
    display_name: string;
    country_code: string;
    type: string;
  }>;
  topics?: Array<{ display_name: string; subfield?: { display_name: string } }>;
  ids?: { openalex?: string; orcid?: string };
  x_concepts?: Array<{ display_name: string; score: number }>;
}

interface AutoSearchResult {
  source: 'db' | 'openalex' | 'web';
  professors: Professor[];
  created: number;
}

export async function findOrCreateProfessor(name: string, university?: string, options?: { skipDb?: boolean }): Promise<AutoSearchResult> {
  // Step 1: Search local DB (skip if explicitly requested, e.g. when user clicks "网络搜索")
  if (!options?.skipDb) {
    const dbResults = await searchLocalDB(name, university);
    if (dbResults.length > 0) {
      return { source: 'db', professors: dbResults, created: 0 };
    }
  }

  // Step 2: Search OpenAlex (always reached when skipDb=true)
  const openAlexResults = await searchOpenAlex(name, university);
  if (openAlexResults.length > 0) {
    const created: Professor[] = [];
    for (const prof of openAlexResults) {
      try {
        const saved = await createProfessor(prof);
        created.push(saved);
      } catch (e) {
        console.error('[professorAutoAdd] insert error:', e);
      }
    }
    if (created.length > 0) {
      return { source: 'openalex', professors: created, created: created.length };
    }
  }

  return { source: 'openalex', professors: [], created: 0 };
}

async function searchLocalDB(name: string, university?: string): Promise<Professor[]> {
  const terms = name.split(/\s+/).filter(t => t.length >= 2);
  if (terms.length === 0) return [];

  const orClauses = terms.map(t => `name.ilike.%${t}%`).join(',');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabaseAdmin
    .from('professors')
    .select('*')
    .or(orClauses)
    .order('opportunity_score', { ascending: false, nullsFirst: false })
    .limit(10);

  if (university) {
    q = q.ilike('university', `%${university}%`);
  }

  const { data, error } = await q;
  if (error || !data) return [];

  // Re-rank: exact name match scores higher
  const lower = name.toLowerCase();
  const sorted = data.sort((a: { name: string }, b: { name: string }) => {
    const aExact = a.name.toLowerCase().includes(lower) ? 1 : 0;
    const bExact = b.name.toLowerCase().includes(lower) ? 1 : 0;
    return bExact - aExact;
  });

  return sorted.map(fromRow);
}

async function searchOpenAlex(name: string, university?: string): Promise<Omit<Professor, 'id' | 'createdAt' | 'updatedAt'>[]> {
  const query = encodeURIComponent(name);
  const url = `https://api.openalex.org/authors?search=${query}&per_page=5&mailto=koalaphd@gmail.com`;

  let data: { results: OpenAlexAuthor[] };
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    data = await res.json();
  } catch {
    return [];
  }

  if (!data.results || data.results.length === 0) return [];

  const professors: Omit<Professor, 'id' | 'createdAt' | 'updatedAt'>[] = [];

  for (const author of data.results) {
    const institution = pickInstitution(author, university);
    if (!institution) continue;

    const researchAreas = extractResearchAreas(author);

    professors.push({
      name: author.display_name,
      university: institution,
      faculty: '',
      title: '',
      positionTitle: undefined,
      researchAreas,
      email: '',
      profileUrl: '',
      googleScholarUrl: '',
      grantStatus: 'Inactive',
      suitableStudentBackgrounds: [],
      potentialRpTopics: [],
      references: '',
      verificationStatus: 'Pending',
      hIndex: author.summary_stats?.h_index ?? undefined,
      paperCount: author.works_count ?? undefined,
      citationCount: author.cited_by_count ?? undefined,
      acceptingStudents: 'unknown',
      dataSources: ['manual'],
      semanticScholarId: author.ids?.orcid ?? undefined,
    });
  }

  return professors;
}

function pickInstitution(author: OpenAlexAuthor, preferredUni?: string): string | null {
  const institutions = author.last_known_institutions ?? [];
  const affiliations = author.affiliations ?? [];

  if (preferredUni) {
    const lower = preferredUni.toLowerCase();
    const match = institutions.find(i => i.display_name.toLowerCase().includes(lower));
    if (match) return match.display_name;
    const affMatch = affiliations.find(a => a.institution.display_name.toLowerCase().includes(lower));
    if (affMatch) return affMatch.institution.display_name;
  }

  if (institutions.length > 0) return institutions[0].display_name;
  if (affiliations.length > 0) return affiliations[0].institution.display_name;
  return null;
}

function extractResearchAreas(author: OpenAlexAuthor): string[] {
  const areas: string[] = [];

  if (author.topics) {
    for (const t of author.topics.slice(0, 8)) {
      areas.push(t.display_name);
    }
  }

  if (areas.length < 3 && author.x_concepts) {
    for (const c of author.x_concepts.filter(c => c.score > 30).slice(0, 5)) {
      if (!areas.includes(c.display_name)) {
        areas.push(c.display_name);
      }
    }
  }

  return areas.slice(0, 8);
}

function fromRow(row: Record<string, unknown>): Professor {
  return {
    id: row.id as string,
    name: row.name as string,
    university: row.university as string,
    faculty: (row.faculty as string) ?? '',
    title: (row.title as string) ?? '',
    positionTitle: row.position_title as Professor['positionTitle'],
    researchAreas: (row.research_areas as string[]) ?? [],
    email: (row.email as string) ?? '',
    profileUrl: (row.profile_url as string) ?? '',
    googleScholarUrl: (row.google_scholar_url as string) ?? '',
    linkedinUrl: (row.linkedin_url as string) ?? undefined,
    labUrl: (row.lab_url as string) ?? undefined,
    grantStatus: (row.grant_status as Professor['grantStatus']) ?? 'Inactive',
    suitableStudentBackgrounds: (row.suitable_student_backgrounds as string[]) ?? [],
    potentialRpTopics: (row.potential_rp_topics as string[]) ?? [],
    references: (row['references'] as string) ?? '',
    verificationStatus: (row.verification_status as Professor['verificationStatus']) ?? 'Pending',
    sourceCandidateId: (row.source_candidate_id as string) ?? undefined,
    arcProjectIds: (row.arc_project_ids as string[]) ?? undefined,
    semanticScholarId: (row.semantic_scholar_id as string) ?? undefined,
    hIndex: (row.h_index as number) ?? undefined,
    paperCount: (row.paper_count as number) ?? undefined,
    citationCount: (row.citation_count as number) ?? undefined,
    acceptingStudents: (row.accepting_students as Professor['acceptingStudents']) ?? undefined,
    dataSources: (row.data_sources as Professor['dataSources']) ?? undefined,
    lastSyncedAt: (row.last_synced_at as string) ?? undefined,
    opportunityScore: (row.opportunity_score as number) ?? undefined,
    opportunityBreakdown: (row.opportunity_breakdown as Professor['opportunityBreakdown']) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: (row.updated_at as string) ?? undefined,
  };
}
