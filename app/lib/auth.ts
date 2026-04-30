// Server-side auth helpers — only import in Server Components or API routes.
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin } from './supabase/server';
import type { User } from '@supabase/supabase-js';

export type UserRole = 'super_admin' | 'admin' | 'viewer';

async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch { /* Read-only context in Server Components */ }
        },
      },
    }
  );
}

export async function getServerUser(): Promise<User | null> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getUserRole(userId: string): Promise<UserRole | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabaseAdmin as any)
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();
  return (data?.role as UserRole) ?? null;
}

export async function getServerUserWithRole(): Promise<{ user: User; role: UserRole } | null> {
  const user = await getServerUser();
  if (!user) return null;
  const role = await getUserRole(user.id);
  if (!role) return null;
  return { user, role };
}

export async function requireAdmin(): Promise<{ user: User; role: UserRole }> {
  const result = await getServerUserWithRole();
  if (!result) throw new Error('Unauthorized');
  if (!['super_admin', 'admin'].includes(result.role)) throw new Error('Forbidden');
  return result;
}

export async function requireSuperAdmin(): Promise<{ user: User; role: UserRole }> {
  const result = await getServerUserWithRole();
  if (!result) throw new Error('Unauthorized');
  if (result.role !== 'super_admin') throw new Error('Forbidden');
  return result;
}
