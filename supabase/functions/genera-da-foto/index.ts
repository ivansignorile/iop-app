// Edge function: genera-da-foto
// Da una foto annotata con punti (livello 1-9) genera interventi pre-compilati.
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
          livello: { type: "integer" },
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

    const { image_base64, media_type, image_url, punti, mappa } = await req.json();
    if (!image_base64 && !image_url)
      return json({ error: "image_base64 o image_url richiesti" }, 400);

    // Libreria cicli (RLS: org + global) — contesto extra
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
            "Sei un computista edile. L'utente ha annotato una foto di facciata con punti, ognuno con un LIVELLO di degrado 1-9. " +
            "Per ogni livello è dato il CICLO associato (titolo, fasi, unità, prezzo). Genera gli interventi così: " +
            "1) Per ogni punto con livello da 1 a 6: una voce con il ciclo associato a quel livello; stima la QUANTITÀ guardando la foto, coerente con l'unità del ciclo; usa il prezzo del ciclo. " +
            "2) Se ALMENO UN punto ha livello >= 7: genera UNA SOLA voce di pitturazione totale dell'intera superficie usando il ciclo associato al livello >=7; stima i mq totali della facciata dalla foto (1 fila di finestre ~ 1 piano ~3 m, finestra larga 1-1,20 m); NON generare voci singole per i punti >=7. " +
            "Le quantità sono stime modificabili." +
            "\n\nMAPPA LIVELLO->CICLO:\n" + JSON.stringify(mappa ?? {}) +
            "\n\nLIBRERIA CICLI:\n" +
            (libreria || "(nessuno)") +
            "\n\nLISTINO:\n" +
            (listino || "(nessuno)"),
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
                JSON.stringify({ punti: punti ?? [] }) +
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
