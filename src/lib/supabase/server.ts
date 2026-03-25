import 'server-only';
import { createClient } from '@supabase/supabase-js';

// Service-role client for API routes — bypasses RLS
export function createServiceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Verify a JWT token and return the user
export async function getUserFromToken(token: string | undefined) {
  if (!token) return null;
  
  const supabase = createServiceClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) return null;
  return user;
}

// Extract token from Authorization header or cookie
export function extractToken(request: Request): string | undefined {
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  const cookie = request.headers.get('cookie');
  if (cookie) {
    const match = cookie.match(/sb-access-token=([^;]+)/);
    if (match) return match[1];
  }

  return undefined;
}
