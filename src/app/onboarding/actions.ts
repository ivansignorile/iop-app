"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type OnboardingState = { error?: string };

export async function createOrgAction(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Inserisci un nome valido." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.rpc("create_organization", {
    org_name: name,
  });
  if (error) return { error: "Impossibile creare l'impresa. Riprova." };

  redirect("/dashboard");
}
