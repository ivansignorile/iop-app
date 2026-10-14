"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string };

/** Accetta solo path interni (no open redirect): "/x" sì, "//x" e "/\\x" no. */
function safeRedirectPath(value: FormDataEntryValue | null): string | null {
  const v = typeof value === "string" ? value : "";
  if (!v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\")) return null;
  return v;
}

export async function signInAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Credenziali non valide. Riprova." };

  redirect(safeRedirectPath(formData.get("redirect")) ?? "/dashboard");
}

export async function signUpAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();

  if (password.length < 8) {
    return { error: "La password deve avere almeno 8 caratteri." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error) return { error: error.message };

  // Email confirmation attiva: nessuna sessione finché non si conferma.
  if (!data.session) {
    return {
      message:
        "Ti abbiamo inviato un'email di conferma. Apri il link per attivare l'account.",
    };
  }

  redirect("/onboarding");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
