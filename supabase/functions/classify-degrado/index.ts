// Edge function: classify-degrado
// Da una foto di facciata/porzione di fabbricato stima il grado di degrado (1-9)
// e l'intervento suggerito, usando i livelli di riferimento come few-shot. Vision.
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
    livello: { type: "integer" },
    intervento: { type: "string" },
    descrizione: { type: "string" },
  },
  required: ["livello", "intervento", "descrizione"],
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

    // image_base64 (senza prefisso data:) + media_type, oppure image_url
    const { image_base64, media_type, image_url } = await req.json();
    if (!image_base64 && !image_url)
      return json({ error: "image_base64 o image_url richiesti" }, 400);

    const { data: livelli } = await supabase
      .from("degrado_samples")
      .select("livello, intervento, descrizione")
      .order("livello", { ascending: true });

    const scala = (livelli ?? [])
      .map((l) => `- Livello ${l.livello}: ${l.intervento} — ${l.descrizione}`)
      .join("\n");

    const imageSource = image_url
      ? { type: "url", url: image_url }
      : { type: "base64", media_type: media_type ?? "image/jpeg", data: image_base64 };

    const body = {
      model: MODEL,
      max_tokens: 800,
      system: [
        {
          type: "text",
          text:
            "Sei un tecnico edile esperto di facciate. Valuta dalla foto il grado di ammaloramento su scala 1-9 " +
            "(1 = degrado minimo/solo pittura, 9 = degrado severo/ricostruzione) e indica l'intervento adatto. " +
            "Usa questa scala di riferimento:\n" +
            scala,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: imageSource },
            {
              type: "text",
              text: "Classifica il grado di degrado di questa facciata/porzione e proponi l'intervento.",
            },
          ],
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
    return json({ ok: true, valutazione: JSON.parse(textBlock.text) });
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
