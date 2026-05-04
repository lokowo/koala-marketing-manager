import { supabaseAdmin } from '../supabase/server';
import type { Professor } from '../types';
import type { Database } from '../database.types';

type ProfessorRow = Database['public']['Tables']['professors']['Row'];

function fromRow(row: ProfessorRow): Professor {
  return {
    id: row.id,
    name: row.name,
    university: row.university,
    faculty: row.faculty ?? '',
    title: row.title ?? '',
    positionTitle: row.position_title as Professor['positionTitle'],
    researchAreas: row.research_areas ?? [],
    email: row.email ?? '',
    profileUrl: row.profile_url ?? '',
    googleScholarUrl: row.google_scholar_url ?? '',
    linkedinUrl: row.linkedin_url ?? undefined,
    labUrl: row.lab_url ?? undefined,
    grantStatus: row.grant_status as Professor['grantStatus'],
    suitableStudentBackgrounds: row.suitable_student_backgrounds ?? [],
    potentialRpTopics: row.potential_rp_topics ?? [],
    references: row['references'] ?? '',
    verificationStatus: row.verification_status as Professor['verificationStatus'],
    sourceCandidateId: row.source_candidate_id ?? undefined,
    arcProjectIds: row.arc_project_ids ?? undefined,
    semanticScholarId: row.semantic_scholar_id ?? undefined,
    hIndex: row.h_index ?? undefined,
    paperCount: row.paper_count ?? undefined,
    citationCount: row.citation_count ?? undefined,
    acceptingStudents: (row.accepting_students as Professor['acceptingStudents']) ?? undefined,
    dataSources: (row.data_sources as Professor['dataSources']) ?? undefined,
    lastSyncedAt: row.last_synced_at ?? undefined,
    opportunityScore: row.opportunity_score ?? undefined,
    opportunityBreakdown: (row.opportunity_breakdown as Professor['opportunityBreakdown']) ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
  };
}

function toInsert(data: Omit<Professor, 'id' | 'createdAt' | 'updatedAt'>) {
  return {
    name: data.name,
    university: data.university,
    faculty: data.faculty || null,
    title: data.title || null,
    position_title: data.positionTitle || null,
    research_areas: data.researchAreas,
    email: data.email || null,
    profile_url: data.profileUrl || null,
    google_scholar_url: data.googleScholarUrl || null,
    linkedin_url: data.linkedinUrl || null,
    lab_url: data.labUrl || null,
    grant_status: data.grantStatus,
    suitable_student_backgrounds: data.suitableStudentBackgrounds,
    potential_rp_topics: data.potentialRpTopics,
    'references': data.references || null,
    verification_status: data.verificationStatus,
    source_candidate_id: data.sourceCandidateId || null,
    arc_project_ids: data.arcProjectIds || null,
    semantic_scholar_id: data.semanticScholarId || null,
    h_index: data.hIndex || null,
    paper_count: data.paperCount || null,
    citation_count: data.citationCount || null,
    accepting_students: data.acceptingStudents || null,
    data_sources: data.dataSources || null,
    last_synced_at: data.lastSyncedAt || null,
    opportunity_score: data.opportunityScore || null,
    opportunity_breakdown: data.opportunityBreakdown || null,
  };
}

// Maps UI category tabs to keywords for ilike substring search on research_areas::text
// Values must appear as substrings within the descriptive phrases stored in research_areas
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  health:  ['Cancer', 'Health', 'Disease', 'Clinical', 'Stroke', 'Alzheimer', 'Dementia', 'Mental Health', 'Blood Pressure', 'Diabetes', 'Obesity', 'Immune', 'Immunotherapy', 'HIV', 'Nursing', 'Pharmaceutical', 'Vaccine', 'Epidemiology', 'Public Health', 'Malaria', 'Melanoma', 'Asthma', 'Oncology', 'Psychiatric'],
  physics: ['Astrophysics', 'Astronomy', 'Cosmology', 'Particle physics', 'Quantum', 'Gravitational', 'Dark Matter', 'Gamma-ray', 'Pulsar', 'Supernova', 'Galaxy', 'Stellar', 'Photonic', 'Laser', 'High-Energy', 'Gravitational Wave', 'Atomic and Molecular'],
  bio:     ['Genomics', 'Ecology', 'Genetics', 'Molecular Biology', 'Evolution', 'Phylogenetic', 'Microbiology', 'Virology', 'Biodiversity', 'Conservation', 'Plant Water', 'Plant Stress', 'Wildlife', 'Animal Behavior', 'Epigenetics', 'DNA', 'RNA', 'Protein'],
  earth:   ['Geology', 'Geophysics', 'Geochemistry', 'earthquake', 'tectonic', 'Climate', 'Ocean', 'Atmospheric', 'Soil', 'Mineral', 'Paleoclimatology', 'Geologic'],
  neuro:   ['Neuroscience', 'Neurology', 'Brain', 'Cognitive', 'Schizophrenia', 'Depression', 'Autism', 'Epilepsy', 'Neuroimaging', 'Functional Brain', 'Neuropharmacology'],
  cs:      ['Machine Learning', 'Artificial Intelligence', 'Deep Learning', 'Computer', 'Neural Network', 'Data Science', 'Algorithm', 'Cybersecurity', 'Natural Language Processing', 'Computer Vision', 'Bioinformatics', 'Robotics', 'Software'],
  eng:     ['Engineering', 'Materials Science', 'Battery', 'Energy storage', 'Nanotechnology', 'Semiconductor', 'Aerospace', 'Fiber Laser', 'Crystallization', 'X-ray Diffraction', 'Chemical Physics'],
  soc:     ['Psychology', 'Sociology', 'Education', 'Law', 'Politics', 'Policy', 'Economics', 'Business', 'Finance', 'Management', 'Social Science', 'Anthropology', 'Linguistics', 'History', 'Nutritional'],
};

type ProfessorFilters = {
  university?: string;
  verificationStatus?: string;
  researchArea?: string;
  category?: string;
  search?: string;
  acceptingStudents?: string;
  grantStatus?: string;
  hIndexMin?: number;
  sortBy?: string;
  limit?: number;
  offset?: number;
};

export async function listProfessors(filters?: ProfessorFilters): Promise<Professor[]> {
  const limit = filters?.limit ?? 20;
  const offset = filters?.offset ?? 0;
  const sortField = filters?.sortBy ?? 'opportunity_score';
  const hasCategory = filters?.category && filters.category !== 'all' && CATEGORY_KEYWORDS[filters.category];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabaseAdmin
    .from('professors')
    .select('*')
    .order(sortField, { ascending: false, nullsFirst: false });

  // When category filter is active, fetch more rows and filter in JS
  // (PostgREST can't do ilike on text[] columns)
  if (!hasCategory) {
    q = q.range(offset, offset + limit - 1);
  } else {
    q = q.limit(500);
  }

  if (filters?.university) q = q.eq('university', filters.university);
  if (filters?.verificationStatus) q = q.eq('verification_status', filters.verificationStatus);
  if (filters?.researchArea) q = q.contains('research_areas', [filters.researchArea]);
  if (filters?.acceptingStudents) q = q.eq('accepting_students', filters.acceptingStudents);
  if (filters?.hIndexMin) q = q.gte('h_index', filters.hIndexMin);
  const searchTerm = filters?.search?.trim();
  if (searchTerm) {
    q = q.or(`name.ilike.%${searchTerm}%,university.ilike.%${searchTerm}%,faculty.ilike.%${searchTerm}%`);
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);

  let results = (data ?? []).map(fromRow);

  // Also filter by research_areas in JS (PostgREST can't ilike on text[])
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    const nameUniMatched = new Set(results.map((p: Professor) => p.id));
    // If we got results from the DB query, also add professors whose research areas match
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let allQ: any = supabaseAdmin.from('professors').select('*').order(sortField, { ascending: false, nullsFirst: false }).limit(500);
    if (filters?.university) allQ = allQ.eq('university', filters.university);
    if (filters?.acceptingStudents) allQ = allQ.eq('accepting_students', filters.acceptingStudents);
    if (filters?.hIndexMin) allQ = allQ.gte('h_index', filters.hIndexMin);
    const { data: allData } = await allQ;
    if (allData) {
      const areaMatched = allData.map(fromRow).filter((p: Professor) => {
        if (nameUniMatched.has(p.id)) return false;
        const areasText = p.researchAreas.join(' ').toLowerCase();
        return areasText.includes(term);
      });
      results = [...results, ...areaMatched];
    }
  }

  if (hasCategory) {
    const categoryKeywords = CATEGORY_KEYWORDS[filters!.category!].map(k => k.toLowerCase());
    results = results.filter((p: Professor) => {
      const areasText = p.researchAreas.join(' ').toLowerCase();
      return categoryKeywords.some(k => areasText.includes(k));
    });
  }

  results = results.slice(offset, offset + limit);
  return results;
}

export async function countProfessors(filters?: Omit<ProfessorFilters, 'limit' | 'offset' | 'sortBy'>): Promise<number> {
  const hasCategory = filters?.category && filters.category !== 'all' && CATEGORY_KEYWORDS[filters.category];

  if (hasCategory) {
    // Can't count with ilike on text[] in PostgREST — fetch and count in JS
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = supabaseAdmin.from('professors').select('research_areas').limit(3000);
    if (filters?.university) q = q.eq('university', filters.university);
    if (filters?.verificationStatus) q = q.eq('verification_status', filters.verificationStatus);
    if (filters?.acceptingStudents) q = q.eq('accepting_students', filters.acceptingStudents);
    if (filters?.hIndexMin) q = q.gte('h_index', filters.hIndexMin);
    if (filters?.search) q = q.or(`name.ilike.%${filters.search}%,university.ilike.%${filters.search}%`);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const categoryKeywords = CATEGORY_KEYWORDS[filters!.category!].map(k => k.toLowerCase());
    return (data ?? []).filter((row: { research_areas: string[] | null }) => {
      const areasText = (row.research_areas ?? []).join(' ').toLowerCase();
      return categoryKeywords.some(k => areasText.includes(k));
    }).length;
  }

  const searchTerm = filters?.search?.trim();

  // If search term exists, we need to count matches including research_areas (JS filter)
  if (searchTerm) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = supabaseAdmin.from('professors').select('name,university,research_areas').limit(3000);
    if (filters?.university) q = q.eq('university', filters.university);
    if (filters?.verificationStatus) q = q.eq('verification_status', filters.verificationStatus);
    if (filters?.acceptingStudents) q = q.eq('accepting_students', filters.acceptingStudents);
    if (filters?.hIndexMin) q = q.gte('h_index', filters.hIndexMin);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const term = searchTerm.toLowerCase();
    return (data ?? []).filter((row: { name: string; university: string; research_areas: string[] | null }) => {
      if (row.name.toLowerCase().includes(term)) return true;
      if (row.university.toLowerCase().includes(term)) return true;
      const areasText = (row.research_areas ?? []).join(' ').toLowerCase();
      return areasText.includes(term);
    }).length;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabaseAdmin.from('professors').select('*', { count: 'exact', head: true });
  if (filters?.university) q = q.eq('university', filters.university);
  if (filters?.verificationStatus) q = q.eq('verification_status', filters.verificationStatus);
  if (filters?.researchArea) q = q.contains('research_areas', [filters.researchArea]);
  if (filters?.acceptingStudents) q = q.eq('accepting_students', filters.acceptingStudents);
  if (filters?.hIndexMin) q = q.gte('h_index', filters.hIndexMin);
  const { count, error } = await q;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getProfessor(id: string): Promise<Professor | null> {
  const { data, error } = await supabaseAdmin.from('professors').select('*').eq('id', id).single();
  if (error) return null;
  return fromRow(data);
}

export async function createProfessor(data: Omit<Professor, 'id' | 'createdAt' | 'updatedAt'>): Promise<Professor> {
  const { data: row, error } = await supabaseAdmin
    .from('professors')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert(toInsert(data) as unknown as never)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return fromRow(row);
}

export async function updateProfessor(
  id: string,
  data: Partial<Omit<Professor, 'id' | 'createdAt'>>,
): Promise<Professor | null> {
  const patch: Record<string, unknown> = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.university !== undefined) patch.university = data.university;
  if (data.faculty !== undefined) patch.faculty = data.faculty;
  if (data.title !== undefined) patch.title = data.title;
  if (data.positionTitle !== undefined) patch.position_title = data.positionTitle;
  if (data.researchAreas !== undefined) patch.research_areas = data.researchAreas;
  if (data.email !== undefined) patch.email = data.email;
  if (data.profileUrl !== undefined) patch.profile_url = data.profileUrl;
  if (data.googleScholarUrl !== undefined) patch.google_scholar_url = data.googleScholarUrl;
  if (data.linkedinUrl !== undefined) patch.linkedin_url = data.linkedinUrl;
  if (data.labUrl !== undefined) patch.lab_url = data.labUrl;
  if (data.grantStatus !== undefined) patch.grant_status = data.grantStatus;
  if (data.suitableStudentBackgrounds !== undefined) patch.suitable_student_backgrounds = data.suitableStudentBackgrounds;
  if (data.potentialRpTopics !== undefined) patch.potential_rp_topics = data.potentialRpTopics;
  if (data.references !== undefined) patch['references'] = data.references;
  if (data.verificationStatus !== undefined) patch.verification_status = data.verificationStatus;
  if (data.acceptingStudents !== undefined) patch.accepting_students = data.acceptingStudents;
  if (data.opportunityScore !== undefined) patch.opportunity_score = data.opportunityScore;
  if (data.opportunityBreakdown !== undefined) patch.opportunity_breakdown = data.opportunityBreakdown;
  patch.updated_at = new Date().toISOString();

  const { data: row, error } = await supabaseAdmin
    .from('professors')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(patch as unknown as never)
    .eq('id', id)
    .select()
    .single();
  if (error) return null;
  return fromRow(row);
}

export async function deleteProfessor(id: string): Promise<boolean> {
  const { error } = await supabaseAdmin.from('professors').delete().eq('id', id);
  return !error;
}

export async function searchProfessorsForAI(params: {
  researchArea: string;
  university?: string;
  limit?: number;
}): Promise<Professor[]> {
  const limit = Math.min(params.limit ?? 8, 15);
  const keywords = params.researchArea
    .split(/[,;，；\s]+/)
    .map(k => k.trim().toLowerCase())
    .filter(k => k.length >= 2);

  if (keywords.length === 0) return [];

  // PostgREST can't do ilike on text[] casts, so we fetch a broad set
  // ordered by score and filter by keyword match in JS.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabaseAdmin
    .from('professors')
    .select('*')
    .order('opportunity_score', { ascending: false, nullsFirst: false })
    .order('h_index', { ascending: false, nullsFirst: false })
    .limit(500);

  if (params.university) {
    q = q.ilike('university', `%${params.university}%`);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const allProfessors = (data ?? []).map(fromRow);

  // Filter: professor's research_areas must contain at least one keyword
  const matched = allProfessors.filter((p: Professor) => {
    const areasText = p.researchAreas.join(' ').toLowerCase();
    return keywords.some(k => areasText.includes(k));
  });

  // Sort: accepting > keyword hit count > opportunity_score > h_index
  matched.sort((a: Professor, b: Professor) => {
    const aAccepting = a.acceptingStudents === 'yes' || a.acceptingStudents === 'likely' ? 1 : 0;
    const bAccepting = b.acceptingStudents === 'yes' || b.acceptingStudents === 'likely' ? 1 : 0;
    if (aAccepting !== bAccepting) return bAccepting - aAccepting;
    const aHits = keywords.filter(k => a.researchAreas.join(' ').toLowerCase().includes(k)).length;
    const bHits = keywords.filter(k => b.researchAreas.join(' ').toLowerCase().includes(k)).length;
    if (aHits !== bHits) return bHits - aHits;
    const aOpp = a.opportunityScore ?? 0;
    const bOpp = b.opportunityScore ?? 0;
    if (aOpp !== bOpp) return bOpp - aOpp;
    return (b.hIndex ?? 0) - (a.hIndex ?? 0);
  });

  return matched.slice(0, limit);
}
