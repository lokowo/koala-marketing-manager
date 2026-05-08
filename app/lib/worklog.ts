import { supabaseAdmin } from './supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function logAdminAction(
  userId: string,
  action: string,
  targetType: string,
  targetId: string | null,
  details?: Record<string, unknown>,
) {
  try {
    await db.from('admin_work_logs').insert({
      user_id: userId,
      action,
      target_type: targetType,
      target_id: targetId,
      details: details ?? null,
    });
  } catch (e) {
    console.error('[worklog]', e);
  }
}
