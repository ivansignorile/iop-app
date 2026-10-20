import { MIME_AMMESSI } from "./valida";

const MIME_ESTENSIONI: Record<string, string> = {
  heic: "image/heic",
  heif: "image/heif",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  zip: "application/zip",
};

/** MIME da dichiarare per un file scelto nel browser: alcuni sistemi danno un tipo vuoto o non standard
 *  (es. .xlsx senza Office, .zip come "application/zip-compressed"), in quel caso vale l'estensione. */
export function mimeFile(file: { name: string; type: string }): string {
  if (MIME_AMMESSI.includes(file.type)) return file.type;
  return MIME_ESTENSIONI[file.name.split(".").pop()?.toLowerCase() ?? ""] ?? file.type;
}

/** storage-js ignora `contentType` quando riceve un File: il tipo della parte multipart è `file.type`.
 *  Ricreo il File col tipo giusto, altrimenti il bucket lo vede come application/octet-stream. */
export function conMime(file: File, mime: string): File {
  return file.type === mime ? file : new File([file], file.name, { type: mime });
}
