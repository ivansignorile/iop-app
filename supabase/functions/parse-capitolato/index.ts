// Edge function: parse-capitolato
// Trasforma un capitolato/computo metrico in interventi di preventivo (lavori su corda),
// usando Claude (Anthropic Messages API) con la libreria cicli come grounding.
// verify_jwt = true: l'utente è autenticato; usiamo il suo JWT per rispettare le RLS.

import { createClient } from "npm:@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-opus-4-7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Intervento = {
  titolo: string;
  gruppo: string | null;
  descrizione: string | null;
  unita: "corpo" | "mq" | "ml" | "mc" | "giorno" | "cad" | "kg";
  quantita: number;
  prezzo_unitario: number;
};

type ParseResult = {
  oggetto: string;
  cliente: {
    tipo: "condominio" | "privato" | "azienda";
    nome: string;
    amministratore: string | null;
  };
  edificio: {
    indirizzo: string | null;
    comune: string | null;
    cap: string | null;
    provincia: string | null;
    piani: number | null;
  };
  interventi: Intervento[];
};

const RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    oggetto: { type: "string" },
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
          descrizione: { type: ["string", "null"] },
          unita: {
            type: "string",
            enum: ["corpo", "mq", "ml", "mc", "giorno", "cad", "kg"],
          },
          quantita: { type: "number" },
          prezzo_unitario: { type: "number" },
        },
        required: [
          "titolo",
          "gruppo",
          "descrizione",
          "unita",
          "quantita",
          "prezzo_unitario",
        ],
      },
    },
  },
  required: ["oggetto", "cliente", "edificio", "interventi"],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { preventivo_id, testo } = await req.json();
    if (!preventivo_id || !testo || String(testo).trim().length < 20) {
      return json({ error: "preventivo_id e testo (capitolato) richiesti" }, 400);
    }

    // Preventivo (RLS garantisce ownership)
    const { data: prev, error: prevErr } = await supabase
      .from("preventivi")
      .select("id, org_id, cliente_id, edificio_id")
      .eq("id", preventivo_id)
      .single();
    if (prevErr || !prev) return json({ error: "Preventivo non trovato" }, 404);

    // Libreria cicli per grounding (globali + org)
    const { data: cicli } = await supabase
      .from("cicli_lavorazione")
      .select("titolo, categoria, unita_default, prezzo_default, descrizione_fasi");

    const libreria = (cicli ?? [])
      .map(
        (c) =>
          `- ${c.titolo} [${c.categoria}] (${c.unita_default}${
            c.prezzo_default ? `, rif. €${c.prezzo_default}` : ""
          })`,
      )
      .join("\n");

    const system = [
      {
        type: "text",
        text:
          "Sei un assistente tecnico di un'impresa edile che opera con lavori su corda (rope access). " +
          "Ricevi il testo di un capitolato o computo metrico e lo trasformi in una lista di interventi per un'offerta tecnico-economica. " +
          "Raggruppa le lavorazioni in interventi sensati (allestimento cantiere, ripristini, impermeabilizzazioni, balconi, ecc.). " +
          "Per ogni intervento scegli l'unità di misura adatta (corpo, mq, ml, cad, giorno) e una quantità coerente col computo; " +
          "se un prezzo non è ricavabile, stima un prezzo_unitario ragionevole basandoti sui riferimenti della libreria, altrimenti 0. " +
          "La descrizione deve elencare le fasi del ciclo di lavorazione. Estrai anche committente, oggetto e dati edificio se presenti.\n\n" +
          "LIBRERIA CICLI DI RIFERIMENTO:\n" +
          libreria,
        cache_control: { type: "ephemeral" },
      },
    ];

    const body = {
      model: MODEL,
      max_tokens: 8000,
      system,
      messages: [
        {
          role: "user",
          content: `Trasforma questo capitolato in interventi di preventivo:\n\n${testo}`,
        },
      ],
      output_config: {
        effort: "medium",
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

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return json({ error: "Errore AI", detail: errText }, 502);
    }

    const aiData = await aiRes.json();
    const textBlock = (aiData.content ?? []).find(
      (b: { type: string }) => b.type === "text",
    );
    if (!textBlock) return json({ error: "Risposta AI vuota" }, 502);
    const parsed = JSON.parse(textBlock.text) as ParseResult;

    // Upsert committente
    let clienteId = prev.cliente_id as string | null;
    const clientePatch = {
      org_id: prev.org_id,
      tipo: parsed.cliente.tipo,
      nome: parsed.cliente.nome,
      amministratore: parsed.cliente.amministratore,
    };
    if (clienteId) {
      await supabase.from("clienti").update(clientePatch).eq("id", clienteId);
    } else {
      const { data } = await supabase
        .from("clienti")
        .insert(clientePatch)
        .select("id")
        .single();
      clienteId = data?.id ?? null;
    }

    // Upsert edificio
    let edificioId = prev.edificio_id as string | null;
    const edificioPatch = { org_id: prev.org_id, cliente_id: clienteId, ...parsed.edificio };
    if (edificioId) {
      await supabase.from("edifici").update(edificioPatch).eq("id", edificioId);
    } else {
      const { data } = await supabase
        .from("edifici")
        .insert(edificioPatch)
        .select("id")
        .single();
      edificioId = data?.id ?? null;
    }

    // Sostituisci interventi
    await supabase.from("preventivo_interventi").delete().eq("preventivo_id", preventivo_id);
    const rows = parsed.interventi.map((i, idx) => ({
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

    // Ricalcola totale e aggiorna preventivo
    const { data: imp } = await supabase
      .from("preventivo_interventi")
      .select("importo")
      .eq("preventivo_id", preventivo_id);
    const totale = (imp ?? []).reduce((a, r) => a + Number(r.importo ?? 0), 0);

    await supabase
      .from("preventivi")
      .update({
        oggetto: parsed.oggetto,
        modalita: "capitolato",
        capitolato_testo: testo,
        cliente_id: clienteId,
        edificio_id: edificioId,
        totale_imponibile: totale,
      })
      .eq("id", preventivo_id);

    return json({
      ok: true,
      interventi_creati: rows.length,
      totale_imponibile: totale,
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
