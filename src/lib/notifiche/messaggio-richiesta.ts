import { FORMATO_LABEL, raggruppaFile } from "@/lib/richieste/etichette";
import type { RichiestaInput } from "@/lib/richieste/valida";

const TIPO_LABEL = { foto_descrizione: "Foto + descrizione", foto_capitolato: "Foto + capitolato" } as const;

export function testoRichiesta(r: RichiestaInput & { id: string }, adminUrl: string) {
  const oggetto = `Nuova richiesta preventivo 24h — ${r.nome}${r.comune ? ` (${r.comune})` : ""}`;
  const g = raggruppaFile(r.files);
  const righe = [
    `Tipo: ${TIPO_LABEL[r.tipo]}`,
    `Formato: ${FORMATO_LABEL[r.formato]}`,
    r.titolo ? `Progetto: ${r.titolo}` : null,
    `Nome: ${r.nome}`,
    `Email: ${r.email}`,
    r.telefono ? `Telefono: ${r.telefono}` : null,
    r.comune ? `Comune: ${r.comune}` : null,
    `Allegati: ${g.documento.length} documenti, ${g.logo.length} loghi, ${g.altro.length} altri`,
    "",
    r.descrizione ?? "Nessuna nota.",
    "",
    `Apri: ${adminUrl}`,
  ].filter((x): x is string => x !== null);
  return { oggetto, testo: righe.join("\n") };
}
