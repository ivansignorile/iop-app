import "server-only";

import { createHash } from "node:crypto";
import { headers } from "next/headers";

import { createAdminClient } from "@/lib/supabase/admin";

import { MAX_INVIA_ORA_IP, MAX_PREPARA_ORA_IP } from "./limiti";

export const TROPPE_RICHIESTE = "Troppe richieste, riprova più tardi.";
const MAX = { prepara: MAX_PREPARA_ORA_IP, invia: MAX_INVIA_ORA_IP } as const;

async function ipHash() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || "unknown";
  return createHash("sha256").update(ip).digest("hex");
}

/** Conta le azioni dell'ultima ora per IP (hash) e, se sotto soglia, ne registra una. */
export async function consentiAzione(azione: "prepara" | "invia"): Promise<boolean> {
  const supabase = createAdminClient();
  const hash = await ipHash();
  const unOraFa = new Date(Date.now() - 3600_000).toISOString();
  const { count, error } = await supabase
    .from("richieste_rate_log")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", hash)
    .eq("azione", azione)
    .gte("created_at", unOraFa);
  if (error || (count ?? 0) >= MAX[azione]) return false;
  const { error: insError } = await supabase.from("richieste_rate_log").insert({ ip_hash: hash, azione });
  return !insError;
}
