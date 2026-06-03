// Edge function: rileva-punti-mancanti
// Data una foto di facciata + i punti già segnalati, rileva le aree di degrado non coperte.
// verify_jwt = true.

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
    sospetti: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          x: { type: "number" },
          y: { type: "number" },
          livello_suggerito: { type: "integer" },
          motivo: { type: "string" },
        },
        required: ["x", "y", "livello_suggerito", "motivo"],
      },
    },
  },
  required: ["sospetti"],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { image_base64, media_type, image_url, punti } = await req.json();
    if (!image_base64 && !image_url)
      return json({ error: "image_base64 o image_url richiesti" }, 400);

    const imageSource = image_url
      ? { type: "url", url: image_url }
      : { type: "base64", media_type: media_type ?? "image/jpeg", data: image_base64 };

    const body = {
      model: MODEL,
      max_tokens: 1500,
      system: [
        {
          type: "text",
          text:
            "Sei un tecnico edile esperto di facciate. Analizza la foto e individua le AREE DI DEGRADO visibili che NON sono già coperte dai punti che l'utente ha segnalato. " +
            "Per ciascuna area mancante restituisci coordinate normalizzate (x,y tra 0 e 1, origine in alto a sinistra), un livello di degrado suggerito 1-9 (1=minimo, 9=severo) e un motivo breve. " +
            "Considera 'già coperta' un'area entro ~10% di distanza da un punto utente esistente. " +
            "Se la foto è già ben coperta o non vedi altro degrado, restituisci sospetti vuoto.",
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
                "Punti già segnalati (JSON, coord normalizzate 0-1):\n" +
                JSON.stringify(punti ?? []) +
                "\n\nElenca solo le aree di degrado MANCANTI.",
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
    const parsed = JSON.parse(textBlock.text);
    return json({ ok: true, sospetti: parsed.sospetti ?? [] });
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
