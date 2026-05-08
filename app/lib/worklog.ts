import { supabaseAdmin } from './supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export type WorkLogRole = 'admin' | 'sales';

export async function logWork(params: {
  userId: string;
  role: WorkLogRole;
  action: string;
  actionCategory: string;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  details?: Record<string, unknown>;
}) {
  try {
    await db.from('admin_work_logs').insert({
      user_id: params.userId,
      action: params.action,
      action_category: params.actionCategory,
      target_type: params.targetType || null,
      target_id: params.targetId || null,
      target_name: params.targetName || null,
      details: { ...params.details, role: params.role },
    });
  } catch (e) {
    console.error('[worklog] Failed to log:', e);
  }
}

/** @deprecated Use logWork instead */
export async function logAdminAction(
  userId: string,
  action: string,
  targetType: string,
  targetId: string | null,
  details?: Record<string, unknown>,
) {
  await logWork({
    userId,
    role: 'admin',
    action,
    actionCategory: 'admin_general',
    targetType,
    targetId: targetId || undefined,
    details,
  });
}
