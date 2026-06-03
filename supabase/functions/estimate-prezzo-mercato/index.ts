// Edge function: estimate-prezzo-mercato
// Stima il prezzo unitario di mercato per una lavorazione edile,
// usando il prezzario regionale (prezzi_unitari globali) come riferimento.
// verify_jwt = true.

import { createClient } from "npm:@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-opus-4-7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    prezzo_mercato: { type: "number" },
    fonte: { type: "string" },
    note: { type: "string" },
  },
  required: ["prezzo_mercato", "fonte"],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { lavorazione, unita, comune } = await req.json();
    if (!lavorazione)
      return json({ error: "lavorazione richiesta" }, 400);

    const { data: prezzi } = await supabase
      .from("prezzi_unitari")
      .select("voce, unita, prezzo, categoria")
      .is("org_id", null);

    const listino = (prezzi ?? [])
      .map((p) => `- ${p.voce} (${p.unita}): ${p.prezzo} €`)
      .join("\n");

    const body = {
      model: MODEL,
      max_tokens: 600,
      system: [
        {
          type: "text",
          text:
            "Sei un computista edile. Stima il PREZZO UNITARIO DI MERCATO per la lavorazione indicata, " +
            `riferito a ristrutturazione di facciate in Italia (zona: ${comune ?? "Italia"}). ` +
            "Usa come riferimento questo prezzario regionale; se la voce non c'è, deduci un valore realistico per analogia. " +
            "Restituisci un singolo numero in euro coerente con l'unità richiesta." +
            "\n\nPREZZARIO:\n" +
            listino,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content:
            `Lavorazione: ${lavorazione}\nUnità: ${unita ?? "corpo"}\nStima il prezzo unitario di mercato e indica la fonte/criterio.`,
        },
      ],
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
    };

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!aiRes.ok) return json({ error: "Errore AI", detail: await aiRes.text() }, 502);
    const aiData = await aiRes.json();
    const textBlock = (aiData.content ?? []).find((b: { type: string }) => b.type === "text");
    if (!textBlock) return json({ error: "Risposta AI non valida" }, 502);
    return json({ ok: true, stima: JSON.parse(textBlock.text) });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}
