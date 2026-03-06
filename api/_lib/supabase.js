import { createClient } from '@supabase/supabase-js';

let _client = null;

/**
 * Get a Supabase client using service_role key (server-side only).
 * Reuses the same client instance across invocations within a single
 * serverless function container.
 */
export function getSupabase() {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  }

  _client = createClient(url, key, {
    auth: { persistSession: false },
  });

  return _client;
}
