import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ------------------------------------------------------------
// Supabase client (lazy singleton).
//
// Env vars come from client/.env (Vite loads VITE_* into import.meta.env).
// When they are missing the game runs in DEV MODE: no accounts, progress
// stays in localStorage (the pre-account behavior). The rest of the app can
// ask `isSupabaseConfigured()` to decide which login flow to show.
// ------------------------------------------------------------

function envVar(key: string): string {
  try {
    const v = (import.meta.env as Record<string, string | undefined>)[key];
    return (v ?? '').trim();
  } catch {
    return '';
  }
}

const url = envVar('VITE_SUPABASE_URL');
const anonKey = envVar('VITE_SUPABASE_ANON_KEY');

export function isSupabaseConfigured(): boolean {
  return url.length > 0 && anonKey.length > 0;
}

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (client) return client;
  if (!isSupabaseConfigured()) return null;
  client = createClient(url, anonKey, {
    auth: {
      persistSession: true, // browser keeps the refresh token — reloads stay signed in
      autoRefreshToken: true,
      detectSessionInUrl: true, // handles email-confirm redirects
    },
  });
  return client;
}
