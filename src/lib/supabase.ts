/**
 * supabase — browser client, lazily created only when configured.
 *
 * The app works with OR without a backend:
 *   • env set  → live data + SOS sync via Supabase Realtime (cross-device)
 *   • env unset → the existing client-side collection runs (single-device)
 *
 * Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env to enable.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let client: SupabaseClient | null = null;

export function isBackendEnabled(): boolean {
  return Boolean(url && anonKey);
}

export function getSupabase(): SupabaseClient | null {
  if (!isBackendEnabled()) return null;
  if (!client) {
    client = createClient(url!, anonKey!, {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecond: 5 } },
    });
  }
  return client;
}
