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

// Maps UI category tabs to research_areas array overlap keywords
const CATEGORY_RESEARCH_AREAS: Record<string, string[]> = {
  cs: ['Machine Learning', 'Artificial Intelligence', 'Computer Science', 'Deep Learning', 'Natural Language Processing', 'Computer Vision', 'Data Science', 'Software Engineering', 'Cybersecurity', 'Reinforcement Learning', 'Neural Networks', 'Information Technology'],
  bio: ['Biology', 'Biomedical Engineering', 'Genomics', 'Neuroscience', 'Biochemistry', 'Medicine', 'Pharmacology', 'Public Health', 'Bioinformatics', 'Molecular Biology', 'Immunology', 'Microbiology', 'Epidemiology', 'Oncology'],
  biz: ['Business', 'Finance', 'Economics', 'Management', 'Marketing', 'Accounting', 'Commerce', 'Supply Chain', 'Entrepreneurship', 'International Business', 'Organisational Behaviour'],
  eng: ['Engineering', 'Robotics', 'Mechanical Engineering', 'Electrical Engineering', 'Civil Engineering', 'Materials Science', 'Chemical Engineering', 'Aerospace', 'Nanotechnology', 'Structural Engineering', 'Environmental Engineering'],
  soc: ['Social Science', 'Psychology', 'Sociology', 'Education', 'Anthropology', 'History', 'Political Science', 'Law', 'Linguistics', 'Philosophy', 'Geography', 'Public Policy'],
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabaseAdmin
    .from('professors')
    .select('*')
    .order(sortField, { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);
  if (filters?.university) q = q.eq('university', filters.university);
  if (filters?.verificationStatus) q = q.eq('verification_status', filters.verificationStatus);
  if (filters?.researchArea) q = q.contains('research_areas', [filters.researchArea]);
  if (filters?.category && filters.category !== 'all' && CATEGORY_RESEARCH_AREAS[filters.category]) {
    q = q.overlaps('research_areas', CATEGORY_RESEARCH_AREAS[filters.category]);
  }
  if (filters?.acceptingStudents) q = q.eq('accepting_students', filters.acceptingStudents);
  if (filters?.grantStatus) q = q.eq('grant_status', filters.grantStatus);
  if (filters?.hIndexMin) q = q.gte('h_index', filters.hIndexMin);
  if (filters?.search) q = q.or(`name.ilike.%${filters.search}%,university.ilike.%${filters.search}%`);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map(fromRow);
}

export async function countProfessors(filters?: Omit<ProfessorFilters, 'limit' | 'offset' | 'sortBy'>): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabaseAdmin.from('professors').select('*', { count: 'exact', head: true });
  if (filters?.university) q = q.eq('university', filters.university);
  if (filters?.verificationStatus) q = q.eq('verification_status', filters.verificationStatus);
  if (filters?.researchArea) q = q.contains('research_areas', [filters.researchArea]);
  if (filters?.category && filters.category !== 'all' && CATEGORY_RESEARCH_AREAS[filters.category]) {
    q = q.overlaps('research_areas', CATEGORY_RESEARCH_AREAS[filters.category]);
  }
  if (filters?.acceptingStudents) q = q.eq('accepting_students', filters.acceptingStudents);
  if (filters?.grantStatus) q = q.eq('grant_status', filters.grantStatus);
  if (filters?.hIndexMin) q = q.gte('h_index', filters.hIndexMin);
  if (filters?.search) q = q.or(`name.ilike.%${filters.search}%,university.ilike.%${filters.search}%`);
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
