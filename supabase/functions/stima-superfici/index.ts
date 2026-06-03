// Edge function: stima-superfici
// Da una foto di facciata stima la superficie in mq usando riferimenti dimensionali.
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
    superficie_mq: { type: "number" },
    larghezza_m: { type: "number" },
    altezza_m: { type: "number" },
    piani_stimati: { type: "integer" },
    finestre_contate: { type: "integer" },
    ragionamento: { type: "string" },
  },
  required: ["superficie_mq", "ragionamento"],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { image_base64, media_type, image_url } = await req.json();
    if (!image_base64 && !image_url)
      return json({ error: "image_base64 o image_url richiesti" }, 400);

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
            "Sei un tecnico edile. Stima la SUPERFICIE della facciata in mq dalla foto, " +
            "usando questi riferimenti dimensionali quando possibile: " +
            "ogni fila di finestre indica un piano; un piano è alto circa 3 metri; " +
            "una finestra è larga da 1 a 1,20 m. " +
            "Conta finestre e piani, stima larghezza e altezza, poi calcola la superficie. " +
            "Spiega brevemente il ragionamento. Tutti i valori sono stime modificabili.",
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
              text: "Stima la superficie di questa facciata.",
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
