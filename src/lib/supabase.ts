import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    typeof supabaseUrl === 'string' &&
    supabaseUrl.startsWith('https://') &&
    supabaseUrl.includes('.supabase.co')
);

let client: SupabaseClient;

try {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
    );
  }

  const configuredUrl = supabaseUrl;
  const configuredAnonKey = supabaseAnonKey;
  if (!configuredUrl || !configuredAnonKey) throw new Error('Supabase configuration is unavailable.');

  client = createClient(configuredUrl, configuredAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      storageKey: 'flip-auth',
      flowType: 'pkce',
    },
    global: {
      headers: { 'x-application-name': 'flip' },
    },
    realtime: {
      params: { eventsPerSecond: 5 },
    },
  });
} catch (err) {
  console.error('[Flip] Supabase client initialization failed:', err);
  // Fallback placeholder so the rest of the bundle can load without crashing.
  // All real Supabase calls will fail until valid env vars are provided.
  client = createClient(
    'https://invalid.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid',
    { auth: { storageKey: 'flip-auth' } }
  );
}

export const supabase = client;
