import type { VoceNormalizzata } from "../core";
import * as apiLlpp from "./api-llpp";
import * as lazioCsv from "./lazio-csv";
import * as pdfTesto from "./pdf-testo";
import * as toscanaCsv from "./toscana-csv";
import * as vdaXlsx from "./vda-xlsx";
import * as xlsxTabella from "./xlsx-tabella";
import * as siciliaXls from "./sicilia-xls";
import * as six from "./six";
import * as venetoXml from "./veneto-xml";
import * as basilicataXml from "./basilicata-xml";
import * as liguriaXml from "./liguria-xml";
import * as lombardiaXml from "./lombardia-xml";

export const FORMATI = {
  "api-llpp": apiLlpp.parse,
  six: six.parse,
  "pdf-testo": pdfTesto.parse,
  "lazio-csv": lazioCsv.parse,
  "toscana-csv": toscanaCsv.parse,
  "xlsx-tabella": xlsxTabella.parse,
  "sicilia-xls": siciliaXls.parse,
  "vda-xlsx": vdaXlsx.parse,
  "veneto-xml": venetoXml.parse,
  "basilicata-xml": basilicataXml.parse,
  "liguria-xml": liguriaXml.parse,
  "lombardia-xml": lombardiaXml.parse,
} satisfies Record<string, (buf: Buffer) => VoceNormalizzata[]>;

export type Formato = keyof typeof FORMATI;
