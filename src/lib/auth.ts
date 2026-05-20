import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";

export type AppContext = {
  userId: string;
  email: string;
  profile: Tables<"profiles"> | null;
  org: Tables<"organizations"> | null;
};

/**
 * Carica utente, profilo e organizzazione corrente.
 * Reindirizza a /login se non autenticato, a /onboarding se senza org.
 */
export async function requireContext(): Promise<AppContext & { org: Tables<"organizations"> }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  let org: Tables<"organizations"> | null = null;
  if (profile?.current_org_id) {
    const { data } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", profile.current_org_id)
      .maybeSingle();
    org = data;
  }

  if (!org) redirect("/onboarding");

  return { userId: user.id, email: user.email ?? "", profile, org };
}

/** Variante senza guardia org (per /onboarding). */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}
