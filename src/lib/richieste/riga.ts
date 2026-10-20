import type { FileMeta, RichiestaInput } from "./valida";

/** Riga da inserire in `richieste_servizio`: `files` sono quelli verificati sullo storage (con path). */
export function rigaRichiesta(
  r: RichiestaInput,
  files: (FileMeta & { path: string })[],
  cartella: string,
  ora: Date = new Date(),
) {
  return {
    nome: r.nome,
    email: r.email,
    telefono: r.telefono,
    tipo: r.tipo,
    descrizione: r.descrizione,
    comune: r.comune,
    formato_output: r.formato,
    titolo_progetto: r.titolo,
    consenso_privacy_at: ora.toISOString(),
    files,
    cartella,
  };
}
