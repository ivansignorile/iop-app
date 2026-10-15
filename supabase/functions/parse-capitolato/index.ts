// Edge function: parse-capitolato
// Trasforma un capitolato/computo metrico (testo incollato O file PDF caricato)
// in interventi di preventivo ricchi e dettagliati (lavori su corda), usando
// Claude con la libreria cicli come grounding. verify_jwt = true.

import { createClient } from "npm:@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-opus-4-7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    oggetto: { type: "string" },
    relazione: { type: "string" },
    cliente: {
      type: "object",
      additionalProperties: false,
      properties: {
        tipo: { type: "string", enum: ["condominio", "privato", "azienda"] },
        nome: { type: "string" },
        amministratore: { type: ["string", "null"] },
      },
      required: ["tipo", "nome", "amministratore"],
    },
    edificio: {
      type: "object",
      additionalProperties: false,
      properties: {
        indirizzo: { type: ["string", "null"] },
        comune: { type: ["string", "null"] },
        cap: { type: ["string", "null"] },
        provincia: { type: ["string", "null"] },
        piani: { type: ["integer", "null"] },
      },
      required: ["indirizzo", "comune", "cap", "provincia", "piani"],
    },
    interventi: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          titolo: { type: "string" },
          gruppo: { type: ["string", "null"] },
          descrizione: { type: "string" },
          unita: {
            type: "string",
            enum: ["corpo", "mq", "ml", "mc", "giorno", "cad", "kg"],
          },
          quantita: { type: "number" },
          prezzo_unitario: { type: "number" },
        },
        required: ["titolo", "gruppo", "descrizione", "unita", "quantita", "prezzo_unitario"],
      },
    },
  },
  required: ["oggetto", "relazione", "cliente", "edificio", "interventi"],
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

    const { preventivo_id, testo, file_base64, media_type, filename } = await req.json();
    const hasText = typeof testo === "string" && testo.trim().length >= 20;
    const hasFile = typeof file_base64 === "string" && file_base64.length > 0;
    if (!preventivo_id || (!hasText && !hasFile)) {
      return json({ error: "preventivo_id e (testo o file) richiesti" }, 400);
    }

    const { data: prev, error: prevErr } = await supabase
      .from("preventivi")
      .select("id, org_id, cliente_id, edificio_id")
      .eq("id", preventivo_id)
      .single();
    if (prevErr || !prev) return json({ error: "Preventivo non trovato" }, 404);

    const { data: cicli } = await supabase
      .from("cicli_lavorazione")
      .select("titolo, categoria, unita_default, prezzo_default, descrizione_fasi")
      .order("org_id", { ascending: true, nullsFirst: false });

    const libreria = (cicli ?? [])
      .map(
        (c) =>
          `### ${c.titolo} [${c.categoria}] — ${c.unita_default}${
            c.prezzo_default ? `, rif. €${c.prezzo_default}` : ""
          }\n${c.descrizione_fasi}`,
      )
      .join("\n\n");

    // Prezzi unitari (org prima dei globali → priorità al listino dell'impresa)
    const { data: prezzi } = await supabase
      .from("prezzi_unitari")
      .select("voce, unita, prezzo")
      .order("org_id", { ascending: true, nullsFirst: false });

    const listino = (prezzi ?? [])
      .map((p) => `- ${p.voce}: €${p.prezzo} / ${p.unita}`)
      .join("\n");

    const system = [
      {
        type: "text",
        text:
          "Sei un capitolatista esperto di un'impresa edile che opera con lavori su corda (rope access). " +
          "Ricevi un capitolato o computo metrico (testo o PDF) e produci un'offerta tecnico-economica RICCA e DETTAGLIATA. " +
          "Linee guida fondamentali:\n" +
          "- Raggruppa le lavorazioni in interventi sensati (allestimento cantiere e sicurezza, ripristini, impermeabilizzazioni, balconi, facciate, ferro, ecc.).\n" +
          "- Per OGNI intervento scrivi una descrizione ESTESA e professionale: elenca tutte le fasi del ciclo di lavorazione, i materiali con marca tipica (Kerakoll, Mapei, Boero…) e relative alternative, le finiture, le norme applicabili e lo smaltimento. NON limitarti a una riga: arricchisci con il dettaglio tecnico tipico di un capitolato (più frasi per intervento), attingendo alla libreria cicli qui sotto.\n" +
          "- Scegli unità di misura coerenti (corpo, mq, ml, cad, giorno) e quantità ricavate dal computo; se un prezzo non è ricavabile, stimalo dai riferimenti della libreria, altrimenti 0.\n" +
          "- Usa titoli che nominano chiaramente lavorazione e materiale (es. 'Intonaco civile per esterni', 'Ponteggio tubolare'): servono per l'abbinamento automatico al prezzario regionale. Descrizioni e prezzi definitivi possono poi essere sostituiti dall'abbinamento al prezzario e alla libreria dell'impresa.\n" +
          "- Inserisci sempre un intervento di 'Allestimento cantiere e apprestamenti di sicurezza' se non presente.\n" +
          "- Scrivi una 'relazione' introduttiva di 3-5 frasi che descrive il contesto e gli obiettivi dell'intervento.\n" +
          "- Estrai committente, oggetto e dati edificio se presenti.\n\n" +
          "PREZZI UNITARI DI RIFERIMENTO (usa SEMPRE questi quando la voce è applicabile; in caso di voci simili preferisci la prima elencata, che è il listino dell'impresa). Stima un prezzo solo se nessuna voce è pertinente:\n" +
          listino +
          "\n\nLIBRERIA CICLI DI RIFERIMENTO (usa queste descrizioni come base da espandere):\n\n" +
          libreria,
        cache_control: { type: "ephemeral" },
      },
    ];

    const istruzione =
      "Analizza il capitolato/computo seguente e produci l'offerta tecnico-economica dettagliata in JSON.";
    let userContent: unknown;
    if (hasFile && media_type === "application/pdf") {
      userContent = [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: file_base64 } },
        { type: "text", text: istruzione },
      ];
    } else if (hasFile && String(media_type).startsWith("image/")) {
      userContent = [
        { type: "image", source: { type: "base64", media_type, data: file_base64 } },
        { type: "text", text: istruzione },
      ];
    } else {
      userContent = `${istruzione}\n\n${testo}`;
    }

    const body = {
      model: MODEL,
      max_tokens: 12000,
      system,
      messages: [{ role: "user", content: userContent }],
      output_config: {
        effort: "high",
        format: { type: "json_schema", schema: RESULT_SCHEMA },
      },
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

    let clienteId = prev.cliente_id as string | null;
    const clientePatch = {
      org_id: prev.org_id,
      tipo: parsed.cliente.tipo,
      nome: parsed.cliente.nome,
      amministratore: parsed.cliente.amministratore,
    };
    if (clienteId) await supabase.from("clienti").update(clientePatch).eq("id", clienteId);
    else {
      const { data } = await supabase.from("clienti").insert(clientePatch).select("id").single();
      clienteId = data?.id ?? null;
    }

    let edificioId = prev.edificio_id as string | null;
    const edificioPatch = { org_id: prev.org_id, cliente_id: clienteId, ...parsed.edificio };
    if (edificioId) await supabase.from("edifici").update(edificioPatch).eq("id", edificioId);
    else {
      const { data } = await supabase.from("edifici").insert(edificioPatch).select("id").single();
      edificioId = data?.id ?? null;
    }

    await supabase.from("preventivo_interventi").delete().eq("preventivo_id", preventivo_id);
    const rows = parsed.interventi.map((i: Record<string, unknown>, idx: number) => ({
      org_id: prev.org_id,
      preventivo_id,
      ordine: idx,
      gruppo: i.gruppo,
      titolo: i.titolo,
      descrizione: i.descrizione,
      unita: i.unita,
      quantita: i.quantita,
      prezzo_unitario: i.prezzo_unitario,
    }));
    if (rows.length) await supabase.from("preventivo_interventi").insert(rows);

    const { data: imp } = await supabase
      .from("preventivo_interventi")
      .select("importo")
      .eq("preventivo_id", preventivo_id);
    const totale = (imp ?? []).reduce((a, r) => a + Number(r.importo ?? 0), 0);

    await supabase
      .from("preventivi")
      .update({
        oggetto: parsed.oggetto,
        note: parsed.relazione,
        modalita: "capitolato",
        capitolato_testo: hasText ? testo : `[file: ${filename ?? "capitolato"}]`,
        cliente_id: clienteId,
        edificio_id: edificioId,
        totale_imponibile: totale,
      })
      .eq("id", preventivo_id);

    return json({ ok: true, interventi_creati: rows.length, totale_imponibile: totale, usage: aiData.usage });
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
