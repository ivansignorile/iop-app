const eur = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

const num = new Intl.NumberFormat("it-IT", {
  maximumFractionDigits: 2,
});

const dateFmt = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatEuro(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  return eur.format(Number.isFinite(n) ? n : 0);
}

export function formatNumber(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  return num.format(Number.isFinite(n) ? n : 0);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return dateFmt.format(d);
}

// Usate sempre dopo un importo già formattato con "€" (es. "26,63 € al mq"): niente "€" qui.
export const UNITA_LABEL: Record<string, string> = {
  corpo: "a corpo",
  mq: "al mq",
  ml: "al ml",
  mc: "al mc",
  giorno: "al giorno",
  cad: "cad.",
  kg: "al kg",
};

export const STATO_LABEL: Record<string, string> = {
  bozza: "Bozza",
  inviato: "Inviato",
  accettato: "Accettato",
  rifiutato: "Rifiutato",
};
