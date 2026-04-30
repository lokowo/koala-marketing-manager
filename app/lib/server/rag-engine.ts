import { createEmbedding } from './embedding';
import { createClient } from '@supabase/supabase-js';
import type { KnowledgeChunk } from '../types';

function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars missing');
  return createClient(url, key);
}

// Search all knowledge chunks (papers + professor profiles)
export async function searchKnowledgeBase(query: string, limit = 10): Promise<KnowledgeChunk[]> {
  try {
    const supabase = getServerSupabase();
    const embedding = await createEmbedding(query);

    const { data, error } = await supabase.rpc('match_knowledge', {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: limit,
    });

    if (error) {
      console.error('[RAG] match_knowledge error:', error);
      return [];
    }

    return (data ?? []).map((row: { id: string; source_type: string; source_title: string; content: string; similarity: number }) => ({
      id: row.id,
      sourceType: row.source_type,
      sourceTitle: row.source_title,
      content: row.content,
      similarity: row.similarity,
    })) as KnowledgeChunk[];
  } catch (e) {
    console.error('[RAG] searchKnowledgeBase failed:', e);
    return [];
  }
}

// Search only paper abstracts (source_title starts with [PAPER])
export async function searchPaperAbstracts(query: string, limit = 10): Promise<KnowledgeChunk[]> {
  try {
    const supabase = getServerSupabase();
    const embedding = await createEmbedding(query);
    const { data, error } = await supabase.rpc('match_knowledge', {
      query_embedding: embedding,
      match_threshold: 0.65,
      match_count: limit * 2,
    });
    if (error || !data) return [];
    return (data as Array<{ id: string; source_type: string; source_title: string; content: string; similarity: number }>)
      .filter(row => row.source_title.startsWith('[PAPER]'))
      .slice(0, limit)
      .map(row => ({
        id: row.id,
        sourceType: row.source_type,
        sourceTitle: row.source_title,
        content: row.content,
        similarity: row.similarity,
      })) as KnowledgeChunk[];
  } catch {
    return [];
  }
}

// Search only professor profiles (source_title starts with [PROF])
export async function searchProfessorProfiles(query: string, limit = 5): Promise<KnowledgeChunk[]> {
  try {
    const supabase = getServerSupabase();
    const embedding = await createEmbedding(query);
    const { data, error } = await supabase.rpc('match_knowledge', {
      query_embedding: embedding,
      match_threshold: 0.65,
      match_count: limit * 3,
    });
    if (error || !data) return [];
    return (data as Array<{ id: string; source_type: string; source_title: string; content: string; similarity: number }>)
      .filter(row => row.source_title.startsWith('[PROF]'))
      .slice(0, limit)
      .map(row => ({
        id: row.id,
        sourceType: row.source_type,
        sourceTitle: row.source_title,
        content: row.content,
        similarity: row.similarity,
      })) as KnowledgeChunk[];
  } catch {
    return [];
  }
}

// Deep search all papers by a specific professor name (for outreach email generation)
export async function searchProfessorPapers(professorName: string, limit = 10): Promise<KnowledgeChunk[]> {
  try {
    const supabase = getServerSupabase();
    // Search by professor name in content (paper chunks contain "Author: <name>")
    const embedding = await createEmbedding(`papers by ${professorName} research publications`);
    const { data, error } = await supabase.rpc('match_knowledge', {
      query_embedding: embedding,
      match_threshold: 0.55,
      match_count: 40,
    });
    if (error || !data) return [];

    const nameLower = professorName.toLowerCase();
    const nameParts = nameLower.split(/\s+/);
    const lastName = nameParts[nameParts.length - 1];

    return (data as Array<{ id: string; source_type: string; source_title: string; content: string; similarity: number }>)
      .filter(row =>
        row.source_title.startsWith('[PAPER]') &&
        row.content.toLowerCase().includes(lastName)
      )
      .slice(0, limit)
      .map(row => ({
        id: row.id,
        sourceType: row.source_type,
        sourceTitle: row.source_title,
        content: row.content,
        similarity: row.similarity,
      })) as KnowledgeChunk[];
  } catch {
    return [];
  }
}

export async function searchProfessorsByTags(query: string, limit = 5): Promise<Array<{
  id: string;
  name: string;
  university: string;
  positionTitle: string;
  researchAreas: string[];
}>> {
  try {
    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from('professors')
      .select('id, name, university, position_title, research_areas')
      .textSearch('research_areas', query.split(' ').join(' | '))
      .eq('verification_status', 'Verified')
      .limit(limit);

    if (error || !data) return [];

    return data.map(p => ({
      id: p.id,
      name: p.name,
      university: p.university,
      positionTitle: p.position_title ?? '',
      researchAreas: p.research_areas ?? [],
    }));
  } catch {
    return [];
  }
}

export function assembleRAGContext(params: {
  knowledgeChunks: KnowledgeChunk[];
  papers: Array<{ title: string; authors: string; year: number; journal: string; doi: string }>;
  professors: Array<{ name: string; university: string; researchAreas: string[] }>;
}): string {
  const parts: string[] = [];

  if (params.knowledgeChunks.length > 0) {
    parts.push('## 知识库参考\n' + params.knowledgeChunks
      .map(c => `[${c.sourceTitle}]\n${c.content}`)
      .join('\n\n'));
  }

  if (params.papers.length > 0) {
    parts.push('## 相关论文\n' + params.papers
      .map(p => `- ${p.title} (${p.authors}, ${p.year}, ${p.journal}${p.doi ? `, DOI: ${p.doi}` : ''})`)
      .join('\n'));
  }

  if (params.professors.length > 0) {
    parts.push('## 相关澳洲教授\n' + params.professors
      .map(p => `- ${p.name} (${p.university}): ${p.researchAreas.join(', ')}`)
      .join('\n'));
  }

  return parts.join('\n\n');
}
