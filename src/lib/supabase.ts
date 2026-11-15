import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || '';

export const isSupabaseClientConfigured = (): boolean =>
  Boolean(
    supabaseUrl &&
      supabaseAnonKey &&
      !supabaseUrl.includes('YOUR_PROJECT_ID') &&
      !supabaseAnonKey.includes('YOUR_SUPABASE_ANON_KEY')
  );

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseClientConfigured()) return null;
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return client;
}
