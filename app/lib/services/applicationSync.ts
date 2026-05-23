import { supabaseAdmin } from '../supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const STAGE_ORDER = ['saved', 'drafted', 'sent', 'replied', 'preparing', 'submitted', 'interview', 'decided'] as const;

function stageIndex(stage: string): number {
  return STAGE_ORDER.indexOf(stage as typeof STAGE_ORDER[number]);
}

export async function upsertApplicationForEmail(
  userId: string,
  professorId: string,
  coldEmailId: string,
  university?: string,
): Promise<void> {
  try {
    const { data: existing } = await db
      .from('applications')
      .select('id, stage, drafted_at')
      .eq('user_id', userId)
      .eq('professor_id', professorId)
      .maybeSingle();

    const now = new Date().toISOString();

    if (!existing) {
      await db.from('applications').insert({
        user_id: userId,
        professor_id: professorId,
        cold_email_id: coldEmailId,
        university: university ?? null,
        stage: 'drafted',
        drafted_at: now,
        created_at: now,
        updated_at: now,
      });
      return;
    }

    const updates: Record<string, unknown> = {
      cold_email_id: coldEmailId,
      updated_at: now,
    };

    if (!existing.drafted_at) {
      updates.drafted_at = now;
    }

    if (stageIndex(existing.stage) < stageIndex('drafted')) {
      updates.stage = 'drafted';
    }

    await db
      .from('applications')
      .update(updates)
      .eq('id', existing.id);
  } catch (err) {
    console.error('[applicationSync] upsertApplicationForEmail:', err);
  }
}

export async function upsertApplicationForSave(
  userId: string,
  professorId: string,
  university?: string | null,
): Promise<void> {
  try {
    const { data: existing } = await db
      .from('applications')
      .select('id')
      .eq('user_id', userId)
      .eq('professor_id', professorId)
      .maybeSingle();

    if (existing) return;

    const now = new Date().toISOString();
    await db.from('applications').insert({
      user_id: userId,
      professor_id: professorId,
      university: university ?? null,
      stage: 'saved',
      saved_at: now,
      created_at: now,
      updated_at: now,
    });
  } catch (err) {
    console.error('[applicationSync] upsertApplicationForSave:', err);
  }
}
