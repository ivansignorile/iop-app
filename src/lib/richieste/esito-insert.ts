export const GIA_INVIATA = "Richiesta già inviata.";
export const INVIO_KO = "Invio non riuscito, riprova.";

// Violazione dell'indice unico su `cartella`: la richiesta e' gia' stata inserita (replay).
export function erroreInserimento(error: { code?: string } | null): string {
  return error?.code === "23505" ? GIA_INVIATA : INVIO_KO;
}
