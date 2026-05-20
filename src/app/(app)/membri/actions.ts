"use server";

import { revalidatePath } from "next/cache";

import { requireContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type Role = Database["public"]["Enums"]["membership_role"];
export type InviteState = { error?: string; message?: string };

export async function inviteMemberAction(
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const { org } = await requireContext();
  const email = String(formData.get("email") ?? "").trim();
  const role = (String(formData.get("role") ?? "member") as Role);
  if (!email) return { error: "Inserisci un'email." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("invite_member", {
    target_org: org.id,
    member_email: email,
    member_role: role,
  });
  if (error) {
    return {
      error: error.message.includes("Utente non trovato")
        ? "Nessun utente IOP con questa email. Deve prima registrarsi."
        : "Invito non riuscito (servono permessi admin).",
    };
  }
  revalidatePath("/membri");
  return { message: `${email} aggiunto al workspace.` };
}

export async function removeMemberAction(formData: FormData) {
  const { org } = await requireContext();
  const userId = String(formData.get("user_id") ?? "");
  const supabase = await createClient();
  await supabase
    .from("memberships")
    .delete()
    .eq("org_id", org.id)
    .eq("user_id", userId);
  revalidatePath("/membri");
}

export async function changeRoleAction(formData: FormData) {
  const { org } = await requireContext();
  const userId = String(formData.get("user_id") ?? "");
  const role = String(formData.get("role") ?? "member") as Role;
  const supabase = await createClient();
  await supabase
    .from("memberships")
    .update({ role })
    .eq("org_id", org.id)
    .eq("user_id", userId);
  revalidatePath("/membri");
}
