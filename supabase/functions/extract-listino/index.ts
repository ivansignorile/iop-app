// Edge function: extract-listino
// Da 2-3 vecchi preventivi (PDF) deduce cicli di lavorazione e prezzi unitari
// ricorrenti dell'impresa e li inserisce nel listino org-scoped. verify_jwt=true.

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
    cicli: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          titolo: { type: "string" },
          categoria: { type: ["string", "null"] },
          unita_default: { type: "string", enum: ["corpo", "mq", "ml", "mc", "giorno", "cad", "kg"] },
          prezzo_default: { type: ["number", "null"] },
          descrizione_fasi: { type: "string" },
        },
        required: ["titolo", "categoria", "unita_default", "prezzo_default", "descrizione_fasi"],
      },
    },
    prezzi: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          voce: { type: "string" },
          unita: { type: "string", enum: ["corpo", "mq", "ml", "mc", "giorno", "cad", "kg"] },
          prezzo: { type: "number" },
          categoria: { type: ["string", "null"] },
        },
        required: ["voce", "unita", "prezzo", "categoria"],
      },
    },
  },
  required: ["cicli", "prezzi"],
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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Non autenticato" }, 401);
    const { data: profile } = await supabase
      .from("profiles")
      .select("current_org_id")
      .eq("id", user.id)
      .single();
    const orgId = profile?.current_org_id;
    if (!orgId) return json({ error: "Nessuna organizzazione" }, 400);

    const { files } = await req.json();
    if (!Array.isArray(files) || files.length === 0) {
      return json({ error: "Carica almeno un preventivo (PDF)" }, 400);
    }

    const content: unknown[] = [];
    for (const f of files.slice(0, 3)) {
      if (f.media_type === "application/pdf") {
        content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: f.base64 } });
      } else if (String(f.media_type).startsWith("image/")) {
        content.push({ type: "image", source: { type: "base64", media_type: f.media_type, data: f.base64 } });
      }
    }
    content.push({
      type: "text",
      text:
        "Da questi preventivi/offerte dell'impresa, deduci il LISTINO ricorrente. " +
        "Estrai: (1) i cicli di lavorazione (titolo, categoria, unità, prezzo di default, descrizione delle fasi sintetica ma completa) e " +
        "(2) i prezzi unitari (voce, unità €/mq·ml·corpo·cad·giorno, prezzo, categoria). " +
        "Deduplica voci equivalenti; se uno stesso prezzo ricorre con valori diversi, usa il valore mediano. " +
        "Normalizza le unità. Restituisci JSON.",
    });

    const body = {
      model: MODEL,
      max_tokens: 8000,
      system: [
        {
          type: "text",
          text:
            "Sei un analista di capitolati edili (lavori su corda). Il tuo compito è ricostruire il listino prezzi e i cicli di lavorazione tipici di un'impresa a partire dai suoi preventivi passati.",
        },
      ],
      messages: [{ role: "user", content }],
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
    if (!textBlock) return json({ error: "Risposta AI vuota" }, 502);
    const parsed = JSON.parse(textBlock.text);

    // Dedup contro listino esistente (case-insensitive)
    const { data: exCicli } = await supabase
      .from("cicli_lavorazione")
      .select("titolo")
      .eq("org_id", orgId);
    const { data: exPrezzi } = await supabase
      .from("prezzi_unitari")
      .select("voce")
      .eq("org_id", orgId);
    const cicliSet = new Set((exCicli ?? []).map((c) => c.titolo.toLowerCase().trim()));
    const prezziSet = new Set((exPrezzi ?? []).map((p) => p.voce.toLowerCase().trim()));

    const cicliRows = (parsed.cicli ?? [])
      .filter((c: { titolo: string }) => c.titolo && !cicliSet.has(c.titolo.toLowerCase().trim()))
      .map((c: Record<string, unknown>) => ({ org_id: orgId, ...c }));
    const prezziRows = (parsed.prezzi ?? [])
      .filter((p: { voce: string }) => p.voce && !prezziSet.has(p.voce.toLowerCase().trim()))
      .map((p: Record<string, unknown>) => ({ org_id: orgId, ...p }));

    if (cicliRows.length) await supabase.from("cicli_lavorazione").insert(cicliRows);
    if (prezziRows.length) await supabase.from("prezzi_unitari").insert(prezziRows);

    return json({
      ok: true,
      cicli_creati: cicliRows.length,
      prezzi_creati: prezziRows.length,
      usage: aiData.usage,
    });
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
