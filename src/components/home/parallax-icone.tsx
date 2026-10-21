import {
  Buildings,
  CheckCircle,
  Compass,
  DownloadSimple,
  FileDoc,
  FilePdf,
  FileXls,
  HardHat,
  Lightbulb,
  ListChecks,
  MapPin,
  Stack,
  Stamp,
  ThumbsUp,
  UploadSimple,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import type { CSSProperties } from "react";

type Voce = {
  icona: Icon;
  lato: "sx" | "dx";
  /** posizione verticale lungo la pagina, in % dell'altezza totale */
  top: number;
  /** spostamento in px durante tutto lo scroll: più alto = più veloce */
  v: number;
  /** rotazione iniziale e finale in gradi */
  r: [number, number];
  tono: "menta" | "inchiostro";
};

// Le icone della home, distribuite ai lati per tutta la lunghezza della pagina.
const VOCI: Voce[] = [
  { icona: HardHat, lato: "dx", top: 9, v: 520, r: [-8, 14], tono: "menta" },
  { icona: FilePdf, lato: "sx", top: 13, v: 880, r: [6, -10], tono: "inchiostro" },
  { icona: Buildings, lato: "dx", top: 19, v: 1180, r: [4, -12], tono: "inchiostro" },
  { icona: MapPin, lato: "sx", top: 24, v: 640, r: [-10, 8], tono: "menta" },
  { icona: Stamp, lato: "dx", top: 30, v: 760, r: [10, -6], tono: "menta" },
  { icona: FileDoc, lato: "sx", top: 35, v: 1240, r: [-4, 16], tono: "inchiostro" },
  { icona: Stack, lato: "dx", top: 41, v: 980, r: [-12, 6], tono: "inchiostro" },
  { icona: ThumbsUp, lato: "sx", top: 46, v: 560, r: [8, -14], tono: "menta" },
  { icona: FileXls, lato: "dx", top: 52, v: 1120, r: [6, -8], tono: "menta" },
  { icona: Lightbulb, lato: "sx", top: 57, v: 900, r: [-6, 12], tono: "inchiostro" },
  { icona: UploadSimple, lato: "dx", top: 63, v: 700, r: [12, -4], tono: "inchiostro" },
  { icona: CheckCircle, lato: "sx", top: 68, v: 1060, r: [-14, 4], tono: "menta" },
  { icona: Compass, lato: "dx", top: 74, v: 820, r: [4, 18], tono: "menta" },
  { icona: ListChecks, lato: "sx", top: 79, v: 600, r: [10, -10], tono: "inchiostro" },
  { icona: DownloadSimple, lato: "dx", top: 85, v: 480, r: [-8, 8], tono: "inchiostro" },
  { icona: HardHat, lato: "sx", top: 90, v: 380, r: [6, -12], tono: "menta" },
];

const TONI = {
  menta: "text-home-mint/45",
  inchiostro: "text-home-ink/[0.13]",
} as const;

/** Strato decorativo: icone grandi ai lati che scorrono in parallasse con la pagina. */
export function ParallaxIcone() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
      {VOCI.map(({ icona: Icona, lato, top, v, r, tono }, i) => (
        <span
          key={i}
          className={`parallax-icona absolute ${TONI[tono]} ${
            lato === "sx" ? "-left-8 md:-left-6 xl:left-[2vw]" : "-right-8 md:-right-6 xl:right-[2vw]"
          }`}
          style={
            {
              top: `${top}%`,
              "--v": v,
              "--r0": `${r[0]}deg`,
              "--r1": `${r[1]}deg`,
            } as CSSProperties
          }
        >
          <Icona weight="duotone" className="size-[84px] md:size-[140px] xl:size-[180px]" />
        </span>
      ))}
    </div>
  );
}
