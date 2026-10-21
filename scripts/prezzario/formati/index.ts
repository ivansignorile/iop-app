import type { VoceNormalizzata } from "../core";
import * as apiLlpp from "./api-llpp";
import * as six from "./six";

export const FORMATI = {
  "api-llpp": apiLlpp.parse,
  six: six.parse,
} satisfies Record<string, (buf: Buffer) => VoceNormalizzata[]>;

export type Formato = keyof typeof FORMATI;
