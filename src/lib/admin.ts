import "server-only";

import { notFound } from "next/navigation";

import { isPlatformAdmin } from "@/lib/admin-check";
import { createClient } from "@/lib/supabase/server";

export async function getIsPlatformAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return isPlatformAdmin(user);
}

export async function requirePlatformAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isPlatformAdmin(user)) notFound();
  return { email: user.email! };
}
