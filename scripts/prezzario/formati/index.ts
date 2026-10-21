import type { VoceNormalizzata } from "../core";
import * as apiLlpp from "./api-llpp";

export const FORMATI = {
  "api-llpp": apiLlpp.parse,
} satisfies Record<string, (buf: Buffer) => VoceNormalizzata[]>;

export type Formato = keyof typeof FORMATI;
