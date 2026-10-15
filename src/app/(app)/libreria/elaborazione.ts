import type { createClient } from "@/lib/supabase/client";

/** Logica client condivisa tra l'import (import-preventivi.tsx) e il "Riprova"
 * dei documenti (voci-proprie.tsx): avvio della edge function e polling. */

export type EsitoElaborazione =
  | { stato: "ok"; voci: number }
  | { stato: "lento" }
  | { stato: "errore"; messaggio: string };

type Client = ReturnType<typeof createClient>;

const POLL_MS = 3000;
const POLL_TIMEOUT_MS = 6 * 60 * 1000;
const IN_CORSO = "Elaborazione già in corso";

const attendi = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function messaggioErrore(error: unknown): Promise<string> {
  const ctx = (error as { context?: Response })?.context;
  if (ctx && typeof ctx.json === "function") {
    try {
      const body = await ctx.json();
      if (body?.error) return String(body.error);
    } catch {
      /* risposta non JSON */
    }
  }
  return "Estrazione non riuscita";
}

/** Interroga documenti_libreria finché il documento non è elaborato o in errore. */
async function segui(supabase: Client, id: string): Promise<EsitoElaborazione> {
  const fine = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < fine) {
    await attendi(POLL_MS);
    const { data } = await supabase
      .from("documenti_libreria")
      .select("stato, voci_estratte, errore")
      .eq("id", id)
      .maybeSingle();
    if (!data) return { stato: "errore", messaggio: "Documento non trovato" };
    if (data.stato === "elaborato") return { stato: "ok", voci: data.voci_estratte };
    if (data.stato === "errore") {
      return { stato: "errore", messaggio: data.errore ?? "Elaborazione non riuscita" };
    }
  }
  return { stato: "lento" };
}

/** Avvia l'elaborazione del documento e ne segue l'avanzamento. Se è già in corso
 * (409) segue quella; gli altri rifiuti (già elaborato, quota, ...) tornano come errore. */
export async function avviaESegui(supabase: Client, id: string): Promise<EsitoElaborazione> {
  const { error } = await supabase.functions.invoke("importa-preventivi", {
    body: { documento_id: id },
  });
  if (error) {
    const messaggio = await messaggioErrore(error);
    const status = (error as { context?: Response }).context?.status;
    if (status !== 409 || messaggio !== IN_CORSO) return { stato: "errore", messaggio };
  }
  return segui(supabase, id);
}
