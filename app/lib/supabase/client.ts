import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '../database.types';

// Cookie-based browser client — session is stored in cookies so middleware can read it.
export const supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
