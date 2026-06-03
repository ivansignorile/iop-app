// Edge function: suggest-materiali
// Data una lavorazione, suggerisce il prodotto tipico (Kerakoll/Mapei/ecc.)
// attingendo alla mappa materiali. verify_jwt = true.

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
    prodotto: { type: "string" },
    marca: { type: ["string", "null"] },
    alternativa: { type: ["string", "null"] },
    motivazione: { type: "string" },
    scheda_tecnica_url: { type: "string" },
  },
  required: ["prodotto", "marca", "alternativa", "motivazione"],
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

    const { lavorazione } = await req.json();
    if (!lavorazione) return json({ error: "lavorazione richiesta" }, 400);

    const { data: materiali } = await supabase
      .from("materiali_prodotti")
      .select("lavorazione_keyword, prodotto, marca, alternativa, note, scheda_tecnica_url");

    const mappa = (materiali ?? [])
      .map(
        (m) =>
          `- ${m.lavorazione_keyword} → ${m.prodotto}${m.marca ? ` (${m.marca})` : ""}${
            m.alternativa ? `, alt: ${m.alternativa}` : ""
          }${m.scheda_tecnica_url ? ` [scheda: ${m.scheda_tecnica_url}]` : ""}`,
      )
      .join("\n");

    const body = {
      model: MODEL,
      max_tokens: 600,
      system: [
        {
          type: "text",
          text:
            "Sei un tecnico edile. Data una lavorazione, suggerisci il prodotto più adatto basandoti sulla mappa materiali. " +
            "Se non c'è corrispondenza esatta, scegli il prodotto più pertinente e spiega brevemente.\n\n" +
            "Se nella mappa materiali è presente l'URL della scheda tecnica del prodotto consigliato (campo [scheda: ...]), " +
            "riportalo nel campo scheda_tecnica_url. Se non è presente in mappa ma conosci l'URL ufficiale della scheda tecnica " +
            "o della pagina prodotto del produttore, forniscilo. Altrimenti lascia scheda_tecnica_url vuoto.\n\n" +
            "MAPPA MATERIALI:\n" +
            mappa,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: `Lavorazione: ${lavorazione}` }],
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
    return json({ ok: true, suggerimento: JSON.parse(textBlock.text) });
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
