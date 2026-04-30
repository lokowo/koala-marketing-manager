import { createClient } from '@supabase/supabase-js';
import type { Database } from '../database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server-only client — uses the service role key (bypasses RLS).
// ONLY import this in app/api/ routes or app/lib/server/ files.
// NEVER import in Client Components or pages — it would expose the service key.
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
