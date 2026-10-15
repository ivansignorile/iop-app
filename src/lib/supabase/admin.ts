import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "./types";

/** Client con service role: bypassa RLS. Usare SOLO in server action / route server. */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY mancante");
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}
