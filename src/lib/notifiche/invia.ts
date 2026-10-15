import "server-only";

import type { RichiestaInput } from "@/lib/richieste/valida";

import { testoRichiesta } from "./messaggio-richiesta";

async function inviaEmail(oggetto: string, testo: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.RICHIESTE_EMAIL_FROM,
      to: (process.env.RICHIESTE_EMAIL_TO ?? "").split(",").map((s) => s.trim()).filter(Boolean),
      subject: oggetto,
      text: testo,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`resend ${res.status}`);
}

async function inviaWhatsApp(testo: string) {
  const { GREEN_API_URL, GREEN_API_INSTANCE, GREEN_API_TOKEN, RICHIESTE_WHATSAPP_CHAT_ID } = process.env;
  const res = await fetch(`${GREEN_API_URL}/waInstance${GREEN_API_INSTANCE}/sendMessage/${GREEN_API_TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId: RICHIESTE_WHATSAPP_CHAT_ID, message: testo }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`greenapi ${res.status}`);
}

export async function notificaRichiesta(r: RichiestaInput & { id: string }) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const { oggetto, testo } = testoRichiesta(r, `${base}/admin/richieste/${r.id}`);
  const [email, whatsapp] = await Promise.allSettled([inviaEmail(oggetto, testo), inviaWhatsApp(`*${oggetto}*\n\n${testo}`)]);
  const canali = { email, whatsapp } as const;
  for (const [canale, esito] of Object.entries(canali)) {
    if (esito.status === "rejected") {
      const msg = esito.reason instanceof Error ? esito.reason.message : String(esito.reason);
      console.error(`notifica richiesta: canale ${canale} fallito: ${msg}`);
    }
  }
  return { email: email.status === "fulfilled", whatsapp: whatsapp.status === "fulfilled" };
}
