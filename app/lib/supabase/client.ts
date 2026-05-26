import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '../database.types';

const isProduction = typeof window !== 'undefined' && window.location.hostname.endsWith('koalaphd.com');

export const supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookieOptions: {
      domain: isProduction ? '.koalaphd.com' : undefined,
      path: '/',
      sameSite: 'lax',
      secure: isProduction,
    },
  }
);
