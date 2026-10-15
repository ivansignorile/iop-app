import type { RichiestaInput } from "@/lib/richieste/valida";

const TIPO_LABEL = { foto_descrizione: "Foto + descrizione", foto_capitolato: "Foto + capitolato" } as const;

export function testoRichiesta(r: RichiestaInput & { id: string }, adminUrl: string) {
  const oggetto = `Nuova richiesta preventivo 24h — ${r.nome}${r.comune ? ` (${r.comune})` : ""}`;
  const righe = [
    `Tipo: ${TIPO_LABEL[r.tipo]}`,
    `Nome: ${r.nome}`,
    `Email: ${r.email}`,
    r.telefono ? `Telefono: ${r.telefono}` : null,
    r.comune ? `Comune: ${r.comune}` : null,
    `Allegati: ${r.files.length} file`,
    "",
    r.descrizione,
    "",
    `Apri: ${adminUrl}`,
  ].filter((x): x is string => x !== null);
  return { oggetto, testo: righe.join("\n") };
}
