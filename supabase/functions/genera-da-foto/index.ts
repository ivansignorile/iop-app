// Edge function: genera-da-foto
// Da una foto annotata con punti numerati genera interventi pre-compilati.
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
    interventi: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          titolo: { type: "string" },
          descrizione: { type: "string" },
          unita: { type: "string", enum: ["corpo", "mq", "ml", "mc", "giorno", "cad", "kg"] },
          quantita: { type: "number" },
          prezzo_unitario: { type: "number" },
        },
        required: ["titolo", "descrizione", "unita", "quantita", "prezzo_unitario"],
      },
    },
  },
  required: ["interventi"],
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

    const { image_base64, media_type, image_url, punti, legenda } = await req.json();
    if (!image_base64 && !image_url)
      return json({ error: "image_base64 o image_url richiesti" }, 400);

    // Libreria cicli (RLS: org + global)
    const { data: cicli } = await supabase
      .from("cicli_lavorazione")
      .select("titolo, categoria, unita_default, prezzo_default, descrizione_fasi");

    const libreria = (cicli ?? [])
      .map(
        (c) =>
          `- ${c.titolo} (${c.unita_default}, ${c.prezzo_default ?? "?"} €): ${c.descrizione_fasi}`,
      )
      .join("\n");

    // Listino prezzi unitari (RLS: org + global)
    const { data: prezzi } = await supabase
      .from("prezzi_unitari")
      .select("voce, unita, prezzo");

    const listino = (prezzi ?? [])
      .map((p) => `- ${p.voce} (${p.unita}): ${p.prezzo} €`)
      .join("\n");

    const imageSource = image_url
      ? { type: "url", url: image_url }
      : { type: "base64", media_type: media_type ?? "image/jpeg", data: image_base64 };

    const body = {
      model: MODEL,
      max_tokens: 4000,
      system: [
        {
          type: "text",
          text:
            "Sei un computista edile. L'utente ha annotato una foto di facciata con punti numerati; " +
            "ogni numero indica una porzione e un tipo di lavorazione. " +
            "Genera un elenco di interventi pre-compilati (titolo, descrizione, unità, quantità, prezzo unitario) " +
            "coerenti con le annotazioni e con la foto. " +
            "Usa PRIMA i cicli e i prezzi della libreria; se mancano, deduci valori realistici. " +
            "Le quantità sono stime modificabili." +
            "\n\nLIBRERIA CICLI:\n" +
            (libreria || "(nessun ciclo disponibile)") +
            "\n\nLISTINO:\n" +
            (listino || "(nessun prezzo disponibile)"),
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
              text:
                "Annotazioni utente (JSON):\n" +
                JSON.stringify({ punti: punti ?? [], legenda: legenda ?? {} }) +
                "\n\nGenera gli interventi.",
            },
          ],
        },
      ],
      output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
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
    return json({ ok: true, risultato: JSON.parse(textBlock.text) });
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
