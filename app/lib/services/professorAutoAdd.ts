import { supabaseAdmin } from '../supabase/server';
import type { Professor } from '../types';

// ─── Types ───────────────────────────────────────────────────────────────────

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

export interface ProfessorCandidate {
  name: string;
  university: string;
  position?: string;
  faculty?: string;
  researchAreas: string[];
  hIndex?: number;
  paperCount?: number;
  citationCount?: number;
  email?: string;
  profileUrl?: string;
  googleScholarUrl?: string;
  source: 'database' | 'openalex' | 'claude_web_search';
  confidence: 'high' | 'medium' | 'low';
  universityMismatch?: boolean;
  existsInDb: boolean;
  dbId?: string;
}

// ─── University Aliases ──────────────────────────────────────────────────────

const UNI_ALIASES: Record<string, string> = {
  'UNSW': 'UNSW Sydney',
  'USyd': 'University of Sydney',
  'UniMelb': 'University of Melbourne',
  'UQ': 'University of Queensland',
  'ANU': 'Australian National University',
  'UWA': 'University of Western Australia',
  'Monash': 'Monash University',
  'Adelaide': 'University of Adelaide',
  'QUT': 'Queensland University of Technology',
  'UTS': 'University of Technology Sydney',
  'RMIT': 'RMIT University',
  'Macquarie': 'Macquarie University',
  'Deakin': 'Deakin University',
  'Griffith': 'Griffith University',
  'Curtin': 'Curtin University',
  'Swinburne': 'Swinburne University of Technology',
  'Wollongong': 'University of Wollongong',
  'UOW': 'University of Wollongong',
  'La Trobe': 'La Trobe University',
  'Flinders': 'Flinders University',
  'Newcastle': 'University of Newcastle',
  'Tasmania': 'University of Tasmania',
  'UTAS': 'University of Tasmania',
  'Western Sydney': 'Western Sydney University',
  'WSU': 'Western Sydney University',
  'JCU': 'James Cook University',
  'ECU': 'Edith Cowan University',
  'CDU': 'Charles Darwin University',
  'USQ': 'University of Southern Queensland',
  'UniSQ': 'University of Southern Queensland',
  'ACU': 'Australian Catholic University',
  'Bond': 'Bond University',
  'CQU': 'Central Queensland University',
  'SCU': 'Southern Cross University',
  'UNE': 'University of New England',
  'Murdoch': 'Murdoch University',
  'VU': 'Victoria University',
};

function normalizeProfessorName(raw: string): string {
  let name = raw.replace(/([a-z])([A-Z])/g, '$1 $2');
  name = name.replace(/\s+/g, ' ').trim();
  return name
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function expandUniversity(university?: string): string | undefined {
  if (!university) return undefined;
  const trimmed = university.trim();
  const match = UNI_ALIASES[trimmed] || UNI_ALIASES[trimmed.toUpperCase()] ||
    Object.entries(UNI_ALIASES).find(([k]) => trimmed.toLowerCase().includes(k.toLowerCase()))?.[1];
  return match || trimmed;
}

// ─── Main: Search All Sources (parallel) ─────────────────────────────────────

export async function searchProfessorAllSources(name: string, university?: string): Promise<ProfessorCandidate[]> {
  const expandedUni = expandUniversity(university);
  const normalizedName = normalizeProfessorName(name);
  const candidates: ProfessorCandidate[] = [];

  // === Source 1: Local database ===
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let dbQuery: any = supabaseAdmin
    .from('professors')
    .select('*')
    .ilike('name', `%${normalizedName}%`);
  if (expandedUni) dbQuery = dbQuery.ilike('university', `%${expandedUni}%`);
  const { data: dbResults } = await dbQuery.limit(5);

  if (dbResults?.length) {
    for (const p of dbResults) {
      candidates.push({
        name: p.name,
        university: p.university,
        position: p.position_title || undefined,
        faculty: p.faculty || undefined,
        researchAreas: p.research_areas || [],
        hIndex: p.h_index || undefined,
        paperCount: p.paper_count || undefined,
        citationCount: p.citation_count || undefined,
        email: p.email || undefined,
        profileUrl: p.profile_url || undefined,
        googleScholarUrl: p.google_scholar_url || undefined,
        source: 'database',
        confidence: 'high',
        existsInDb: true,
        dbId: p.id,
      });
    }
  }

  // === Source 2 & 3: OpenAlex + Claude Web Search (parallel) ===
  const oaPromise = searchOpenAlexCandidates(name, expandedUni);
  const claudePromise = searchClaudeCandidates(name, expandedUni).catch(e => {
    console.error('[searchProfessorAllSources] Claude failed:', e);
    return [] as ProfessorCandidate[];
  });

  const [oaResults, claudeResults] = await Promise.all([oaPromise, claudePromise]);
  candidates.push(...oaResults, ...claudeResults);

  // Deduplicate: same name + university keeps highest confidence / database source
  const deduped = new Map<string, ProfessorCandidate>();
  for (const c of candidates) {
    const key = `${c.name.toLowerCase()}|${c.university.toLowerCase()}`;
    const existing = deduped.get(key);
    if (!existing || c.source === 'database' ||
      (c.confidence === 'high' && existing.confidence !== 'high' && existing.source !== 'database')) {
      deduped.set(key, c);
    }
  }

  // Sort: database > claude_web_search(high) > openalex(high) > rest
  const priority: Record<string, number> = { database: 0, claude_web_search: 1, openalex: 2 };
  const confPriority: Record<string, number> = { high: 0, medium: 1, low: 2 };

  return Array.from(deduped.values()).sort((a, b) => {
    return (priority[a.source] - priority[b.source]) || (confPriority[a.confidence] - confPriority[b.confidence]);
  });
}

// ─── Deep Search: DB + Claude only (skip OpenAlex) ──────────────────────────

export async function searchProfessorDeep(name: string, university?: string): Promise<ProfessorCandidate[]> {
  const expandedUni = expandUniversity(university);
  const normalizedName = normalizeProfessorName(name);
  const candidates: ProfessorCandidate[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let dbQuery: any = supabaseAdmin
    .from('professors')
    .select('*')
    .ilike('name', `%${normalizedName}%`);
  if (expandedUni) dbQuery = dbQuery.ilike('university', `%${expandedUni}%`);
  const { data: dbResults } = await dbQuery.limit(5);

  if (dbResults?.length) {
    for (const p of dbResults) {
      candidates.push({
        name: p.name,
        university: p.university,
        position: p.position_title || undefined,
        faculty: p.faculty || undefined,
        researchAreas: p.research_areas || [],
        hIndex: p.h_index || undefined,
        paperCount: p.paper_count || undefined,
        citationCount: p.citation_count || undefined,
        email: p.email || undefined,
        profileUrl: p.profile_url || undefined,
        googleScholarUrl: p.google_scholar_url || undefined,
        source: 'database',
        confidence: 'high',
        existsInDb: true,
        dbId: p.id,
      });
    }
  }

  const claudeResults = await searchClaudeCandidates(name, expandedUni);
  candidates.push(...claudeResults);

  const deduped = new Map<string, ProfessorCandidate>();
  for (const c of candidates) {
    const key = `${c.name.toLowerCase()}|${c.university.toLowerCase()}`;
    const existing = deduped.get(key);
    if (!existing || c.source === 'database' ||
      (c.confidence === 'high' && existing.confidence !== 'high' && existing.source !== 'database')) {
      deduped.set(key, c);
    }
  }

  const priority: Record<string, number> = { database: 0, claude_web_search: 1 };
  const confPriority: Record<string, number> = { high: 0, medium: 1, low: 2 };

  return Array.from(deduped.values()).sort((a, b) => {
    return ((priority[a.source] ?? 9) - (priority[b.source] ?? 9)) || (confPriority[a.confidence] - confPriority[b.confidence]);
  });
}

// ─── Save Candidate to DB ────────────────────────────────────────────────────

export async function saveCandidateToDb(candidate: ProfessorCandidate, userId?: string): Promise<Professor | null> {
  // Check duplicate
  const { data: existing } = await supabaseAdmin
    .from('professors')
    .select('*')
    .eq('name', candidate.name)
    .eq('university', candidate.university)
    .maybeSingle();
  if (existing) return fromRow(existing);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseAdmin as any)
    .from('professors')
    .insert({
      name: candidate.name,
      university: candidate.university,
      position_title: candidate.position || 'Researcher',
      faculty: candidate.faculty || null,
      research_areas: candidate.researchAreas,
      h_index: candidate.hIndex || null,
      paper_count: candidate.paperCount || null,
      citation_count: candidate.citationCount || null,
      email: candidate.email || null,
      profile_url: candidate.profileUrl || null,
      google_scholar_url: candidate.googleScholarUrl || null,
      verification_status: 'Verified',
      data_sources: [candidate.source],
      ...(userId ? { contributed_by: userId, contributed_at: new Date().toISOString() } : {}),
    })
    .select()
    .single();

  if (error) {
    console.error('[saveCandidateToDb]', error);
    return null;
  }
  return data ? fromRow(data) : null;
}

// ─── Backward-compatible wrapper (used by AI chat) ───────────────────────────

export async function findOrCreateProfessor(name: string, university?: string): Promise<{ source: string; professors: Professor[]; created: number }> {
  const candidates = await searchProfessorAllSources(name, university);
  if (candidates.length === 0) {
    return { source: 'openalex', professors: [], created: 0 };
  }

  // Auto-select the best candidate for AI chat (needs fast response)
  const best = candidates[0];
  if (best.existsInDb && best.dbId) {
    const { data } = await supabaseAdmin.from('professors').select('*').eq('id', best.dbId).single();
    if (data) return { source: best.source, professors: [fromRow(data)], created: 0 };
  }

  // Auto-save best candidate
  const saved = await saveCandidateToDb(best);
  if (saved) return { source: best.source, professors: [saved], created: 1 };
  return { source: best.source, professors: [], created: 0 };
}

// ─── OpenAlex search (returns candidates, does NOT save to DB) ───────────────

async function searchOpenAlexCandidates(name: string, university?: string): Promise<ProfessorCandidate[]> {
  const query = encodeURIComponent(name);
  // Always search by name only — no institution filter — so we find all matches
  const url = `https://api.openalex.org/authors?search=${query}&per_page=15&mailto=koalaphd@gmail.com`;

  let data: { results: OpenAlexAuthor[] };
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    data = await res.json();
  } catch {
    return [];
  }

  if (!data.results || data.results.length === 0) return [];

  const candidates: ProfessorCandidate[] = [];

  for (const author of data.results) {
    const allInstitutions = [
      ...(author.last_known_institutions ?? []).map(i => i.display_name),
      ...(author.affiliations ?? []).map(a => a.institution.display_name),
    ];

    const institution = author.last_known_institutions?.[0]?.display_name
      || author.affiliations?.[0]?.institution.display_name
      || 'Unknown';

    let confidence: ProfessorCandidate['confidence'] = 'medium';
    let universityMismatch = false;

    if (university) {
      const isMatch = allInstitutions.some(
        inst => inst.toLowerCase().includes(university.toLowerCase())
      );
      if (isMatch) {
        confidence = 'high';
      } else {
        confidence = 'low';
        universityMismatch = true;
      }
    }

    const researchAreas: string[] = [];
    if (author.topics) {
      for (const t of author.topics.slice(0, 5)) {
        researchAreas.push(t.display_name);
      }
    }
    if (researchAreas.length < 3 && author.x_concepts) {
      for (const c of author.x_concepts.filter(c => c.score > 30).slice(0, 3)) {
        if (!researchAreas.includes(c.display_name)) researchAreas.push(c.display_name);
      }
    }

    candidates.push({
      name: author.display_name,
      university: institution,
      researchAreas,
      hIndex: author.summary_stats?.h_index ?? undefined,
      paperCount: author.works_count ?? undefined,
      citationCount: author.cited_by_count ?? undefined,
      source: 'openalex',
      confidence,
      universityMismatch,
      existsInDb: false,
    });
  }

  return candidates;
}

// ─── Claude Web Search (returns candidates, does NOT save to DB) ─────────────

async function searchClaudeCandidates(name: string, university?: string): Promise<ProfessorCandidate[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return [];

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey });

    const normalized = normalizeProfessorName(name);

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }],
      messages: [{
        role: 'user',
        content: `Find the academic profile of a professor. The user typed: "${name}" (normalized: "${normalized}")${university ? `, university: ${university}` : ', likely at an Australian university'}.

The input may be misspelled, oddly cased, or missing spaces. Try reasonable name variations.

Search strategy — try these queries in order until you find results:
1. "${normalized}"${university ? ` ${university}` : ''} professor
2. "${normalized}" site:.edu.au
3. "${normalized}" researcher Australia

Look for official university staff pages (*.edu.au), Google Scholar profiles, or ResearchGate.

When you find the professor, return ONLY a JSON object:
{"found":true,"name":"full English name","university":"full official university name (e.g. University of Sydney)","position":"exact title","faculty":"department or school","researchAreas":["area1","area2","area3"],"email":"if publicly listed","profileUrl":"official staff page URL","googleScholarUrl":"Google Scholar URL if found","hIndex":null,"paperCount":null}

If not found after trying all queries: {"found":false}
Only return verified info from official sources. Do NOT guess or fabricate.`,
      }],
    });

    const textBlocks = response.content.filter(b => b.type === 'text');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const text = textBlocks.map((b: any) => b.text).join('');
    if (!text) return [];

    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];

    const info = JSON.parse(jsonMatch[0]);
    if (!info.found || !info.name) return [];

    return [{
      name: info.name,
      university: info.university || university || 'Unknown',
      position: info.position || undefined,
      faculty: info.faculty || undefined,
      researchAreas: info.researchAreas || [],
      hIndex: info.hIndex ?? undefined,
      paperCount: info.paperCount ?? undefined,
      email: info.email || undefined,
      profileUrl: info.profileUrl || undefined,
      googleScholarUrl: info.googleScholarUrl || undefined,
      source: 'claude_web_search',
      confidence: 'high',
      existsInDb: false,
    }];
  } catch (e) {
    console.error('[professorSearch] Claude search failed:', e);
    throw new Error(`Claude 搜索失败: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
    contributedBy: (row.contributed_by as string) ?? undefined,
    contributedAt: (row.contributed_at as string) ?? undefined,
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
