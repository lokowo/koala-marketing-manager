import { supabaseAdmin } from './supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function notifyUser(userId: string, title: string, content: string, type: string = 'info', link?: string) {
  await db.from('notifications').insert({
    user_id: userId, title, content, type, link, is_read: false,
  }).catch((e: Error) => console.error('[notify] Failed:', e.message));
}

export async function notifySuperAdmins(title: string, content: string, type: string = 'admin', link?: string) {
  const { data: admins } = await db.from('user_roles').select('user_id').eq('role', 'super_admin');
  if (!admins?.length) return;
  await db.from('notifications').insert(
    admins.map((a: { user_id: string }) => ({ user_id: a.user_id, title, content, type, link, is_read: false }))
  ).catch((e: Error) => console.error('[notify] Failed:', e.message));
}

export async function notifyAdmins(title: string, content: string, type: string = 'admin', link?: string) {
  const { data: admins } = await db.from('user_roles').select('user_id').in('role', ['admin', 'super_admin']);
  if (!admins?.length) return;
  await db.from('notifications').insert(
    admins.map((a: { user_id: string }) => ({ user_id: a.user_id, title, content, type, link, is_read: false }))
  ).catch((e: Error) => console.error('[notify] Failed:', e.message));
}

export async function notifyRelatedSales(customerId: string, title: string, content: string, type: string = 'sales') {
  const { data: relations } = await db.from('sales_customers').select('sales_id').eq('customer_id', customerId);
  if (!relations?.length) return;
  const salesIds = [...new Set(relations.map((r: { sales_id: string }) => r.sales_id))] as string[];
  await db.from('notifications').insert(
    salesIds.map(sid => ({ user_id: sid, title, content, type, is_read: false }))
  ).catch((e: Error) => console.error('[notify] Failed:', e.message));
}

export async function notifyUserAction(params: {
  actionBy: string;
  actionByName: string;
  action: string;
  targetUserId: string;
  targetUserEmail: string;
  details?: string;
}) {
  const { actionBy, actionByName, action, targetUserId, targetUserEmail, details } = params;
  const content = `${actionByName} ${action} ${targetUserEmail}${details ? '：' + details : ''}`;

  await notifySuperAdmins(`用户操作：${action}`, content);
  await notifyAdmins(`用户操作：${action}`, content);
  await notifyRelatedSales(targetUserId, `客户动态：${action}`, content, 'sales');

  if (targetUserId !== actionBy) {
    await notifyUser(targetUserId, '账号通知', details || content);
  }
}
