import { supabaseAdmin } from '../supabase/server';
import type { PublishingItem } from '../types';
import type { Database } from '../database.types';

type PublishingRow = Database['public']['Tables']['publishing_items']['Row'];

export interface PublishingStats {
  totalViews: number;
  totalDMs: number;
  totalConsultations: number;
  byPlatform: Record<string, { views: number; dms: number; consultations: number }>;
  bestPlatform: string;
}

function fromRow(row: PublishingRow): PublishingItem {
  return {
    id: row.id,
    platform: row.platform as PublishingItem['platform'],
    contentTitle: row.content_title,
    publishDate: row.publish_date,
    publishUrl: row.publish_url,
    views: row.views,
    likes: row.likes,
    saves: row.saves,
    comments: row.comments,
    dms: row.dms,
    wechatAdds: row.wechat_adds,
    consultations: row.consultations,
    conversionNotes: row.conversion_notes ?? '',
    contentCardId: row.content_card_id ?? undefined,
    createdAt: row.created_at,
  };
}

export async function listPublishing(filters?: {
  platform?: string;
  contentCardId?: string;
}): Promise<PublishingItem[]> {
  let query = supabaseAdmin.from('publishing_items').select('*').order('created_at', { ascending: false });
  if (filters?.platform) query = query.eq('platform', filters.platform);
  if (filters?.contentCardId) query = query.eq('content_card_id', filters.contentCardId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(fromRow);
}

export async function getPublishingRecord(id: string): Promise<PublishingItem | null> {
  const { data, error } = await supabaseAdmin.from('publishing_items').select('*').eq('id', id).single();
  if (error) return null;
  return fromRow(data);
}

export async function createPublishingRecord(data: Omit<PublishingItem, 'id' | 'createdAt'>): Promise<PublishingItem> {
  const { data: row, error } = await supabaseAdmin
    .from('publishing_items')
    .insert({
      platform: data.platform,
      content_title: data.contentTitle,
      publish_date: data.publishDate,
      publish_url: data.publishUrl,
      views: data.views ?? 0,
      likes: data.likes ?? 0,
      saves: data.saves ?? 0,
      comments: data.comments ?? 0,
      dms: data.dms ?? 0,
      wechat_adds: data.wechatAdds ?? 0,
      consultations: data.consultations ?? 0,
      conversion_notes: data.conversionNotes || null,
      content_card_id: data.contentCardId || null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as unknown as never)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return fromRow(row);
}

export async function updatePublishingRecord(
  id: string,
  data: Partial<Omit<PublishingItem, 'id' | 'createdAt'>>,
): Promise<PublishingItem | null> {
  const patch: Record<string, unknown> = {};
  if (data.platform !== undefined) patch.platform = data.platform;
  if (data.contentTitle !== undefined) patch.content_title = data.contentTitle;
  if (data.publishDate !== undefined) patch.publish_date = data.publishDate;
  if (data.publishUrl !== undefined) patch.publish_url = data.publishUrl;
  if (data.views !== undefined) patch.views = data.views;
  if (data.likes !== undefined) patch.likes = data.likes;
  if (data.saves !== undefined) patch.saves = data.saves;
  if (data.comments !== undefined) patch.comments = data.comments;
  if (data.dms !== undefined) patch.dms = data.dms;
  if (data.wechatAdds !== undefined) patch.wechat_adds = data.wechatAdds;
  if (data.consultations !== undefined) patch.consultations = data.consultations;
  if (data.conversionNotes !== undefined) patch.conversion_notes = data.conversionNotes;
  if (data.contentCardId !== undefined) patch.content_card_id = data.contentCardId;

  const { data: row, error } = await supabaseAdmin
    .from('publishing_items')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(patch as unknown as never)
    .eq('id', id)
    .select()
    .single();
  if (error) return null;
  return fromRow(row);
}

export async function deletePublishingRecord(id: string): Promise<boolean> {
  const { error } = await supabaseAdmin.from('publishing_items').delete().eq('id', id);
  return !error;
}

export async function getPublishingStats(): Promise<PublishingStats> {
  const { data, error } = await supabaseAdmin.from('publishing_items').select('*');
  if (error) throw new Error(error.message);
  const records = (data ?? []).map(fromRow);

  const byPlatform: PublishingStats['byPlatform'] = {};
  records.forEach(r => {
    if (!byPlatform[r.platform]) byPlatform[r.platform] = { views: 0, dms: 0, consultations: 0 };
    byPlatform[r.platform].views += r.views;
    byPlatform[r.platform].dms += r.dms;
    byPlatform[r.platform].consultations += r.consultations;
  });

  let bestPlatform = 'N/A';
  let bestViews = 0;
  Object.entries(byPlatform).forEach(([platform, stats]) => {
    if (stats.views > bestViews) { bestViews = stats.views; bestPlatform = platform; }
  });

  return {
    totalViews: records.reduce((s, r) => s + r.views, 0),
    totalDMs: records.reduce((s, r) => s + r.dms, 0),
    totalConsultations: records.reduce((s, r) => s + r.consultations, 0),
    byPlatform,
    bestPlatform,
  };
}
