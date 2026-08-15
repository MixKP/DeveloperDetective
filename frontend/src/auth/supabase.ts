import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Null when the build has no Supabase credentials. The app still works —
 * it simply stays on the anonymous learner id from ADR 0006, with no
 * sign-in UI. That keeps `docker compose up` and CI usable with no project.
 */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey, { auth: { persistSession: true } }) : null;

export const authEnabled = supabase !== null;
