import { supabaseAdmin } from '../supabase/server';
import type { ContentCard } from '../types';
import type { GeneratedContent } from '../ai/generateContent';
import type { Database } from '../database.types';

type ContentCardRow = Database['public']['Tables']['content_cards']['Row'];

function fromRow(row: ContentCardRow): ContentCard {
  return {
    id: row.id,
    title: row.title,
    status: row.status as ContentCard['status'],
    sourceType: (row.source_type as ContentCard['sourceType']) ?? undefined,
    sourceEntityId: row.source_entity_id ?? undefined,
    xiaohongshuPost: row.xiaohongshu_post ?? undefined,
    xiaohongshuCarousel: row.xiaohongshu_carousel ?? undefined,
    wechatMoment: row.wechat_moment ?? undefined,
    websiteArticle: row.website_article ?? undefined,
    linkedinPost: row.linkedin_post ?? undefined,
    imagePrompt: row.image_prompt ?? undefined,
    reference: row.reference ?? undefined,
    complianceCheck: row.compliance_check ?? undefined,
    generatedBy: (row.generated_by as ContentCard['generatedBy']) ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
  };
}

export async function listContentCards(filters?: {
  status?: string;
  sourceType?: string;
}): Promise<ContentCard[]> {
  let query = supabaseAdmin.from('content_cards').select('*').order('created_at', { ascending: false });
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.sourceType) query = query.eq('source_type', filters.sourceType);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(fromRow);
}

export async function getContentCard(id: string): Promise<ContentCard | null> {
  const { data, error } = await supabaseAdmin.from('content_cards').select('*').eq('id', id).single();
  if (error) return null;
  return fromRow(data);
}

export async function createContentCard(
  title: string,
  sourceType: ContentCard['sourceType'],
  generated: GeneratedContent,
  sourceEntityId?: string,
): Promise<ContentCard> {
  const now = new Date().toISOString();
  const { data: row, error } = await supabaseAdmin
    .from('content_cards')
    .insert({
      title,
      status: 'Pending',
      source_type: sourceType || null,
      source_entity_id: sourceEntityId || null,
      xiaohongshu_post: generated.xiaohongshuPost || null,
      xiaohongshu_carousel: generated.xiaohongshuCarousel || null,
      wechat_moment: generated.wechatMoment || null,
      website_article: generated.websiteArticle || null,
      linkedin_post: generated.linkedinPost || null,
      image_prompt: generated.imagePrompt || null,
      reference: generated.reference || null,
      compliance_check: generated.complianceCheck || null,
      generated_by: 'AI',
      updated_at: now,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as unknown as never)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return fromRow(row);
}

export async function updateContentCard(
  id: string,
  data: Partial<Omit<ContentCard, 'id' | 'createdAt'>>,
): Promise<ContentCard | null> {
  const patch: Record<string, unknown> = {};
  if (data.title !== undefined) patch.title = data.title;
  if (data.status !== undefined) patch.status = data.status;
  if (data.sourceType !== undefined) patch.source_type = data.sourceType;
  if (data.sourceEntityId !== undefined) patch.source_entity_id = data.sourceEntityId;
  if (data.xiaohongshuPost !== undefined) patch.xiaohongshu_post = data.xiaohongshuPost;
  if (data.xiaohongshuCarousel !== undefined) patch.xiaohongshu_carousel = data.xiaohongshuCarousel;
  if (data.wechatMoment !== undefined) patch.wechat_moment = data.wechatMoment;
  if (data.websiteArticle !== undefined) patch.website_article = data.websiteArticle;
  if (data.linkedinPost !== undefined) patch.linkedin_post = data.linkedinPost;
  if (data.imagePrompt !== undefined) patch.image_prompt = data.imagePrompt;
  if (data.reference !== undefined) patch.reference = data.reference;
  if (data.complianceCheck !== undefined) patch.compliance_check = data.complianceCheck;
  if (data.generatedBy !== undefined) patch.generated_by = data.generatedBy;
  patch.updated_at = new Date().toISOString();

  const { data: row, error } = await supabaseAdmin
    .from('content_cards')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(patch as unknown as never)
    .eq('id', id)
    .select()
    .single();
  if (error) return null;
  return fromRow(row);
}
