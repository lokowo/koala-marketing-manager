import { supabaseAdmin } from '../supabase/server';
import type { Professor } from '../types';
import type { Database } from '../database.types';
import type { StudentContext } from '../server/student-context';

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
    research_areas: data.researchAreas ?? [],
    email: data.email || null,
    profile_url: data.profileUrl || null,
    google_scholar_url: data.googleScholarUrl || null,
    linkedin_url: data.linkedinUrl || null,
    lab_url: data.labUrl || null,
    grant_status: data.grantStatus || 'unknown',
    suitable_student_backgrounds: data.suitableStudentBackgrounds ?? [],
    potential_rp_topics: data.potentialRpTopics ?? [],
    'references': data.references || null,
    verification_status: data.verificationStatus || 'unverified',
    source_candidate_id: data.sourceCandidateId || null,
    arc_project_ids: data.arcProjectIds ?? null,
    semantic_scholar_id: data.semanticScholarId || null,
    h_index: data.hIndex ?? null,
    paper_count: data.paperCount ?? null,
    citation_count: data.citationCount ?? null,
    accepting_students: data.acceptingStudents || null,
    data_sources: data.dataSources ?? null,
    last_synced_at: data.lastSyncedAt || null,
    opportunity_score: data.opportunityScore ?? null,
    opportunity_breakdown: data.opportunityBreakdown ?? null,
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
  showAll?: boolean;
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

  if (!filters?.showAll) {
    q = q.not('position_title', 'is', null);
    q = q.eq('verification_status', 'Verified');
  }
  if (filters?.university) q = q.eq('university', filters.university);
  if (filters?.verificationStatus) q = q.eq('verification_status', filters.verificationStatus);
  if (filters?.researchArea) q = q.contains('research_areas', [filters.researchArea]);
  if (filters?.acceptingStudents) q = q.eq('accepting_students', filters.acceptingStudents);
  if (filters?.hIndexMin) q = q.gte('h_index', filters.hIndexMin);
  const UNI_ABBREVIATIONS: Record<string, string> = {
    uts: 'University of Technology Sydney',
    unsw: 'UNSW Sydney',
    anu: 'Australian National University',
    uq: 'University of Queensland',
    uwa: 'University of Western Australia',
    usyd: 'University of Sydney',
    unimelb: 'University of Melbourne',
    monash: 'Monash University',
    rmit: 'RMIT University',
    qut: 'Queensland University of Technology',
    deakin: 'Deakin University',
    macquarie: 'Macquarie University',
    griffith: 'Griffith University',
    latrobe: 'La Trobe University',
    curtin: 'Curtin University',
    flinders: 'Flinders University',
    jcu: 'James Cook University',
    swinburne: 'Swinburne University of Technology',
    wsu: 'Western Sydney University',
    adelaide: 'University of Adelaide',
    wollongong: 'University of Wollongong',
    newcastle: 'University of Newcastle',
  };

  const CHINESE_STOP_WORDS = ['的', '中国', '教授', '老师', '导师', '大学', '学校', '澳洲', '澳大利亚'];

  const searchTerm = filters?.search?.trim();
  if (searchTerm) {
    const parts = searchTerm.split(/[\s,;，；]+/).filter(s => s.length > 0);

    const expandedParts: string[] = [];
    for (const part of parts) {
      const lower = part.toLowerCase();
      if (UNI_ABBREVIATIONS[lower]) {
        expandedParts.push(UNI_ABBREVIATIONS[lower]);
      }
      const chineseChars = part.replace(new RegExp(`[${CHINESE_STOP_WORDS.join('')}]`, 'g'), '');
      if (chineseChars.length > 0 && chineseChars !== part) {
        expandedParts.push(chineseChars);
      }
    }

    const allTerms = Array.from(new Set([...parts, ...expandedParts]))
      .filter(t => !CHINESE_STOP_WORDS.includes(t) && t.length > 0);

    const orClauses = allTerms.map(t => `name.ilike.%${t}%,university.ilike.%${t}%,faculty.ilike.%${t}%`).join(',');
    q = q.or(orClauses);
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);

  let results = (data ?? []).map(fromRow);

  if (searchTerm) {
    const parts = searchTerm.split(/[\s,;，；]+/).filter(s => s.length > 0);
    const searchTerms = parts.map(t => t.toLowerCase());
    const nameUniMatched = new Set(results.map((p: Professor) => p.id));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let allQ: any = supabaseAdmin.from('professors').select('*').order(sortField, { ascending: false, nullsFirst: false }).limit(500);
    if (!filters?.showAll) {
      allQ = allQ.not('position_title', 'is', null);
      allQ = allQ.eq('verification_status', 'Verified');
    }
    if (filters?.university) allQ = allQ.eq('university', filters.university);
    if (filters?.acceptingStudents) allQ = allQ.eq('accepting_students', filters.acceptingStudents);
    if (filters?.hIndexMin) allQ = allQ.gte('h_index', filters.hIndexMin);
    const { data: allData } = await allQ;
    if (allData) {
      const areaMatched = allData.map(fromRow).filter((p: Professor) => {
        if (nameUniMatched.has(p.id)) return false;
        const areasText = p.researchAreas.join(' ').toLowerCase();
        return searchTerms.some(t => areasText.includes(t));
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
    if (!filters?.showAll) {
      q = q.not('position_title', 'is', null);
      q = q.eq('verification_status', 'Verified');
    }
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
    if (!filters?.showAll) {
      q = q.not('position_title', 'is', null);
      q = q.eq('verification_status', 'Verified');
    }
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
  if (!filters?.showAll) {
    q = q.not('position_title', 'is', null);
    q = q.eq('verification_status', 'Verified');
  }
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
  if (!data.name?.trim()) throw new Error('name is required');
  if (!data.university?.trim()) throw new Error('university is required');

  const { data: existing } = await supabaseAdmin
    .from('professors')
    .select('*')
    .eq('name', data.name)
    .eq('university', data.university)
    .maybeSingle();
  if (existing) return fromRow(existing);

  const { data: row, error } = await supabaseAdmin
    .from('professors')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert(toInsert(data) as unknown as never)
    .select()
    .single();
  if (error) throw new Error(`创建教授失败 (professors): ${error.message} | ${error.details || ''} | ${error.hint || ''}`);
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

interface StudentMatchProfile {
  languagePreference?: string;
  personalityTags?: string[];
  careerGoal?: string;
  preferredCity?: string[];
  budget?: string;
  major?: string;
  researchDescription?: string;
  targetUniversities?: string[];
}

export async function searchProfessorsForAI(params: {
  researchArea: string;
  university?: string;
  limit?: number;
  studentProfile?: StudentMatchProfile;
  studentContext?: StudentContext | null;
  userId?: string;
}): Promise<{ professor: Professor; score: number; reasons: string[] }[]> {
  const limit = Math.min(params.limit ?? 8, 15);

  // 1. Build query text for embedding (combine research area + student background)
  const queryParts = [`Research interests: ${params.researchArea}`];
  if (params.studentProfile?.major) queryParts.push(`Student major: ${params.studentProfile.major}`);
  if (params.studentProfile?.researchDescription) queryParts.push(`Research experience: ${params.studentProfile.researchDescription}`);
  const queryText = queryParts.join('. ');

  const ctx = params.studentContext;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let results: (Professor & { _similarity?: number })[] = [];

  // 2. Try semantic vector search first
  try {
    const { createEmbedding } = await import('../server/embedding');
    const embedding = await createEmbedding(queryText);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin as any).rpc('match_professors_semantic', {
      query_embedding: embedding,
      match_threshold: 0.4,
      match_count: limit * 3,
      uni_filter: params.university || null,
    });

    if (!error && data?.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      results = data.map((row: any) => ({
        ...fromRow(row),
        _similarity: row.similarity,
      }));
    }
  } catch (e) {
    console.error('[searchProfessorsForAI] Semantic search failed, falling back to keyword:', e);
  }

  // 3. Fallback to keyword matching if semantic search returned nothing
  if (results.length === 0) {
    const keywords = params.researchArea
      .split(/[,;，；\s]+/)
      .map(k => k.trim().toLowerCase())
      .filter(k => k.length >= 2);

    if (keywords.length === 0) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = supabaseAdmin
      .from('professors')
      .select('*')
      .eq('verification_status', 'Verified')
      .order('h_index', { ascending: false, nullsFirst: false })
      .limit(500);

    if (params.university) {
      q = q.ilike('university', `%${params.university}%`);
    }

    const { data } = await q;
    results = (data ?? []).map(fromRow).filter((p: Professor) => {
      const areasText = p.researchAreas.join(' ').toLowerCase();
      return keywords.some(k => areasText.includes(k));
    });
  }

  // 4. Filter out professors the user has already contacted or rejected
  let interactedIds: Set<string> = new Set();
  if (params.userId) {
    try {
      const { data: interactions } = await supabaseAdmin
        .from('professor_interactions')
        .select('professor_id, interaction_type')
        .eq('user_id', params.userId);
      interactedIds = new Set((interactions ?? [])
        .filter((i: { interaction_type: string }) => ['email_sent', 'rejected'].includes(i.interaction_type))
        .map((i: { professor_id: string }) => i.professor_id));
    } catch { /* table may not exist yet */ }
  }

  // 5. Multi-dimensional scoring with match reasons
  const sp = params.studentProfile;
  const scored = results
    .filter(p => !interactedIds.has(p.id))
    .map(p => {
      let score = 0;
      const reasons: string[] = [];

      // Research match 40% (semantic similarity)
      const similarity = (p as { _similarity?: number })._similarity ?? 0.5;
      score += similarity * 40;
      if (similarity > 0.7) reasons.push(`研究方向高度吻合（${Math.round(similarity * 100)}%）`);
      else if (similarity > 0.5) reasons.push('研究方向相关');

      // Academic impact 20%
      const hIndex = p.hIndex ?? 0;
      if (hIndex >= 50) { score += 20; reasons.push(`学术影响力很强（H-index ${hIndex}）`); }
      else if (hIndex >= 30) { score += 15; reasons.push(`学术实力扎实（H-index ${hIndex}）`); }
      else if (hIndex >= 20) score += 10;

      // Recruitment likelihood 15%
      if (p.grantStatus === 'Active') { score += 15; reasons.push('近期有科研经费，招生可能性高'); }
      else if (p.acceptingStudents === 'yes') { score += 12; reasons.push('目前在招收博士生'); }
      else score += 5;

      // Target university match 10%
      const targetUnis = ctx?.targetUniversities ?? sp?.targetUniversities;
      if (targetUnis?.length) {
        const tUnis = targetUnis.map(u => u.toLowerCase());
        if (tUnis.some(u => p.university.toLowerCase().includes(u))) {
          score += 10;
          reasons.push(`${p.university} 在你的目标学校名单里`);
        }
      }

      // Has email 5%
      if (p.email) { score += 5; reasons.push('有公开联系邮箱'); }

      // Publication activity 5%
      if ((p.paperCount ?? 0) > 100) { score += 5; reasons.push(`发表 ${p.paperCount} 篇论文，非常活跃`); }

      // Geographic preference bonus
      const cities = ctx?.preferredCity ?? sp?.preferredCity;
      if (cities?.length) {
        const uniLower = p.university.toLowerCase();
        const cityMatch = cities.some(c => {
          const cl = c.toLowerCase();
          if (cl.includes('sydney') || cl.includes('悉尼')) return uniLower.includes('sydney') || uniLower.includes('unsw') || uniLower.includes('uts') || uniLower.includes('macquarie');
          if (cl.includes('melbourne') || cl.includes('墨尔本')) return uniLower.includes('melbourne') || uniLower.includes('monash') || uniLower.includes('rmit');
          if (cl.includes('brisbane') || cl.includes('布里斯班')) return uniLower.includes('queensland') || uniLower.includes('qut') || uniLower.includes('griffith');
          return uniLower.includes(cl);
        });
        if (cityMatch) { score += 3; reasons.push('位于你偏好的城市'); }
      }

      // Budget match
      const budgetVal = ctx?.budget ?? sp?.budget;
      if (budgetVal === '必须全奖' && p.grantStatus === 'Active') {
        score += 10;
        reasons.push('有活跃科研经费，全奖可能性高');
      }

      // Research background overlap from rich context
      if (ctx?.researchDescription || ctx?.parsedDocuments?.length) {
        const areasText = p.researchAreas.join(' ').toLowerCase();
        const bgKeywords: string[] = [];
        if (ctx!.researchDescription) bgKeywords.push(...ctx!.researchDescription.toLowerCase().split(/[\s,;，；]+/).filter(w => w.length >= 3));
        for (const doc of ctx!.parsedDocuments) {
          if (doc.parsedData?.researchSummary) bgKeywords.push(...String(doc.parsedData.researchSummary).toLowerCase().split(/[\s,;，；]+/).filter(w => w.length >= 3));
        }
        const bgHits = bgKeywords.filter(k => areasText.includes(k)).length;
        if (bgHits > 0) {
          score += Math.min(bgHits * 2, 12);
          reasons.push('与你的研究背景有关联');
        }
      }

      return { professor: p, score: Math.round(score), reasons };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}
