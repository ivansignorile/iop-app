import type { VoceNormalizzata } from "../core";
import * as apiLlpp from "./api-llpp";
import * as six from "./six";
import * as venetoXml from "./veneto-xml";
import * as basilicataXml from "./basilicata-xml";
import * as liguriaXml from "./liguria-xml";
import * as lombardiaXml from "./lombardia-xml";

export const FORMATI = {
  "api-llpp": apiLlpp.parse,
  six: six.parse,
  "veneto-xml": venetoXml.parse,
  "basilicata-xml": basilicataXml.parse,
  "liguria-xml": liguriaXml.parse,
  "lombardia-xml": lombardiaXml.parse,
} satisfies Record<string, (buf: Buffer) => VoceNormalizzata[]>;

export type Formato = keyof typeof FORMATI;
