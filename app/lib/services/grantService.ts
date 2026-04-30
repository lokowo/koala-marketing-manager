import { supabaseAdmin } from '../supabase/server';
import type { Grant } from '../types';
import type { Database } from '../database.types';

type GrantRow = Database['public']['Tables']['grants']['Row'];

function fromRow(row: GrantRow): Grant {
  return {
    id: row.id,
    grantName: row.grant_name,
    fundingBody: row.funding_body,
    arcProjectId: row.arc_project_id ?? undefined,
    year: row.year,
    amount: row.amount ?? '',
    leadProfessor: row.lead_professor,
    leadProfessorId: row.lead_professor_id ?? undefined,
    university: row.university,
    industryPartner: row.industry_partner ?? '',
    projectTitle: row.project_title,
    projectAbstract: row.project_abstract ?? '',
    keywords: row.keywords ?? [],
    phdRelevance: row.phd_relevance as Grant['phdRelevance'],
    industryScholarshipPotential: row.industry_scholarship_potential as Grant['industryScholarshipPotential'],
    referenceUrl: row.reference_url ?? '',
    verificationStatus: row.verification_status as Grant['verificationStatus'],
    sourceCandidateId: row.source_candidate_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
  };
}

export async function listGrants(filters?: {
  fundingBody?: string;
  university?: string;
  verificationStatus?: string;
  phdRelevance?: string;
}): Promise<Grant[]> {
  let query = supabaseAdmin.from('grants').select('*').order('created_at', { ascending: false });
  if (filters?.fundingBody) query = query.eq('funding_body', filters.fundingBody);
  if (filters?.university) query = query.eq('university', filters.university);
  if (filters?.verificationStatus) query = query.eq('verification_status', filters.verificationStatus);
  if (filters?.phdRelevance) query = query.eq('phd_relevance', filters.phdRelevance);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(fromRow);
}

export async function getGrant(id: string): Promise<Grant | null> {
  const { data, error } = await supabaseAdmin.from('grants').select('*').eq('id', id).single();
  if (error) return null;
  return fromRow(data);
}

export async function createGrant(data: Omit<Grant, 'id' | 'createdAt' | 'updatedAt'>): Promise<Grant> {
  const { data: row, error } = await supabaseAdmin
    .from('grants')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({
      grant_name: data.grantName,
      funding_body: data.fundingBody,
      arc_project_id: data.arcProjectId || null,
      year: data.year,
      amount: data.amount || null,
      lead_professor: data.leadProfessor,
      lead_professor_id: data.leadProfessorId || null,
      university: data.university,
      industry_partner: data.industryPartner || null,
      project_title: data.projectTitle,
      project_abstract: data.projectAbstract || null,
      keywords: data.keywords,
      phd_relevance: data.phdRelevance,
      industry_scholarship_potential: data.industryScholarshipPotential,
      reference_url: data.referenceUrl || null,
      verification_status: data.verificationStatus,
      source_candidate_id: data.sourceCandidateId || null,
    } as unknown as never)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return fromRow(row);
}

export async function updateGrant(
  id: string,
  data: Partial<Omit<Grant, 'id' | 'createdAt'>>,
): Promise<Grant | null> {
  const patch: Record<string, unknown> = {};
  if (data.grantName !== undefined) patch.grant_name = data.grantName;
  if (data.fundingBody !== undefined) patch.funding_body = data.fundingBody;
  if (data.arcProjectId !== undefined) patch.arc_project_id = data.arcProjectId;
  if (data.year !== undefined) patch.year = data.year;
  if (data.amount !== undefined) patch.amount = data.amount;
  if (data.leadProfessor !== undefined) patch.lead_professor = data.leadProfessor;
  if (data.leadProfessorId !== undefined) patch.lead_professor_id = data.leadProfessorId;
  if (data.university !== undefined) patch.university = data.university;
  if (data.industryPartner !== undefined) patch.industry_partner = data.industryPartner;
  if (data.projectTitle !== undefined) patch.project_title = data.projectTitle;
  if (data.projectAbstract !== undefined) patch.project_abstract = data.projectAbstract;
  if (data.keywords !== undefined) patch.keywords = data.keywords;
  if (data.phdRelevance !== undefined) patch.phd_relevance = data.phdRelevance;
  if (data.industryScholarshipPotential !== undefined) patch.industry_scholarship_potential = data.industryScholarshipPotential;
  if (data.referenceUrl !== undefined) patch.reference_url = data.referenceUrl;
  if (data.verificationStatus !== undefined) patch.verification_status = data.verificationStatus;
  patch.updated_at = new Date().toISOString();

  const { data: row, error } = await supabaseAdmin
    .from('grants')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(patch as unknown as never)
    .eq('id', id)
    .select()
    .single();
  if (error) return null;
  return fromRow(row);
}

export async function deleteGrant(id: string): Promise<boolean> {
  const { error } = await supabaseAdmin.from('grants').delete().eq('id', id);
  return !error;
}
