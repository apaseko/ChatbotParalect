import { createClient } from '@supabase/supabase-js';

// Public client — used ONLY for Supabase Auth on client side and Realtime subscriptions
let client: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return client;
}
