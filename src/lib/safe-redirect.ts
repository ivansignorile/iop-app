/**
 * Accetta solo path interni (anti open redirect).
 * Rifiuta caratteri di controllo e backslash (i browser rimuovono tab/newline
 * e normalizzano "\" in "/"), "//host" e qualunque valore che cambi origin.
 */
export function safeRedirectPath(value: unknown): string | null {
  if (typeof value !== "string" || value === "") return null;
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;

  const base = "http://local.invalid";
  let parsed: URL;
  try {
    parsed = new URL(value, base);
  } catch {
    return null;
  }
  if (parsed.origin !== base) return null;
  const out = parsed.pathname + parsed.search + parsed.hash;
  if (out.startsWith("//") || out.includes("\\")) return null;
  return out;
}
