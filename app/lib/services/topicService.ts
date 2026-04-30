import { supabaseAdmin } from '../supabase/server';
import type { Topic } from '../types';
import type { Database } from '../database.types';

type TopicRow = Database['public']['Tables']['topics']['Row'];

function fromRow(row: TopicRow): Topic {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    researchField: row.research_field ?? undefined,
    relatedProfessorIds: row.related_professor_ids ?? undefined,
    relatedGrantIds: row.related_grant_ids ?? undefined,
    createdAt: row.created_at,
  };
}

export async function listTopics(filters?: { researchField?: string }): Promise<Topic[]> {
  let query = supabaseAdmin.from('topics').select('*').order('created_at', { ascending: false });
  if (filters?.researchField) query = query.eq('research_field', filters.researchField);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(fromRow);
}

export async function getTopic(id: string): Promise<Topic | null> {
  const { data, error } = await supabaseAdmin.from('topics').select('*').eq('id', id).single();
  if (error) return null;
  return fromRow(data);
}

export async function createTopic(data: Omit<Topic, 'id' | 'createdAt'>): Promise<Topic> {
  const { data: row, error } = await supabaseAdmin
    .from('topics')
    .insert({
      name: data.name,
      description: data.description,
      research_field: data.researchField || null,
      related_professor_ids: data.relatedProfessorIds || null,
      related_grant_ids: data.relatedGrantIds || null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as unknown as never)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return fromRow(row);
}

export async function updateTopic(
  id: string,
  data: Partial<Omit<Topic, 'id' | 'createdAt'>>,
): Promise<Topic | null> {
  const patch: Record<string, unknown> = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.description !== undefined) patch.description = data.description;
  if (data.researchField !== undefined) patch.research_field = data.researchField;
  if (data.relatedProfessorIds !== undefined) patch.related_professor_ids = data.relatedProfessorIds;
  if (data.relatedGrantIds !== undefined) patch.related_grant_ids = data.relatedGrantIds;

  const { data: row, error } = await supabaseAdmin
    .from('topics')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(patch as unknown as never)
    .eq('id', id)
    .select()
    .single();
  if (error) return null;
  return fromRow(row);
}

export async function deleteTopic(id: string): Promise<boolean> {
  const { error } = await supabaseAdmin.from('topics').delete().eq('id', id);
  return !error;
}
