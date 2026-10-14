import "server-only";

import { notFound } from "next/navigation";

import { requireContext } from "@/lib/auth";

export function isPlatformAdmin(email: string | null | undefined) {
  const list = (process.env.IOP_ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return !!email && list.includes(email.toLowerCase());
}

export async function requirePlatformAdmin() {
  const ctx = await requireContext();
  if (!isPlatformAdmin(ctx.email)) notFound();
  return { email: ctx.email! };
}
