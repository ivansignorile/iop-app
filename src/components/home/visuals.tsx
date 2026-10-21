import { LockSimple, PencilSimpleLine } from "@phosphor-icons/react/dist/ssr";

type Nodo = { testo: string; colore: string };

const COLORI = {
  arancio: "bg-[#d4693f]",
  verde: "bg-[#5a9e4b]",
  blu: "bg-[#3f6a92]",
  indaco: "bg-[#4152b5]",
  azzurro: "bg-[#5fb3c9]",
  salvia: "bg-[#7dba6a]",
} as const;

function Albero({ titolo, nodi }: { titolo: string; nodi: Nodo[] }) {
  return (
    <div>
      <p className="mb-3 text-[13px] font-medium text-home-ink">{titolo}</p>
      <ol className="relative">
        {nodi.map((n, i) => (
          <li key={n.testo} className="relative pb-2.5" style={{ paddingLeft: `${i * 18}px` }}>
            {i > 0 ? (
              <span
                aria-hidden
                className="absolute top-[-10px] h-[22px] w-[10px] rounded-bl-[4px] border-b border-l border-[#b9bfc8]"
                style={{ left: `${i * 18 - 11}px` }}
              />
            ) : null}
            <span
              className={`inline-block rounded-[3px] px-2 py-[3px] text-[10px] font-semibold uppercase tracking-[0.08em] text-white ${n.colore}`}
            >
              {n.testo}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Finestra({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-home-line bg-white px-8 py-14 shadow-[0_24px_60px_-34px_rgba(38,43,56,0.3)] md:px-14 md:py-24">
      {children}
    </div>
  );
}

export function SchemaSelf() {
  return (
    <Finestra>
      <div className="grid gap-10 sm:grid-cols-2">
        <Albero
          titolo="Da foto"
          nodi={[
            { testo: "Foto cantiere", colore: COLORI.arancio },
            { testo: "Voci proposte", colore: COLORI.verde },
            { testo: "Preventivo", colore: COLORI.blu },
          ]}
        />
        <Albero
          titolo="Da capitolato"
          nodi={[
            { testo: "Computo", colore: COLORI.indaco },
            { testo: "Prezzario", colore: COLORI.azzurro },
            { testo: "Word / PDF", colore: COLORI.salvia },
          ]}
        />
      </div>
    </Finestra>
  );
}

export function SchemaTecnico() {
  return (
    <Finestra>
      <div className="grid gap-10 sm:grid-cols-2">
        <Albero
          titolo="Elaborato dal tecnico"
          nodi={[
            { testo: "Invia file", colore: COLORI.arancio },
            { testo: "Verifica tecnico", colore: COLORI.verde },
            { testo: "Entro 24 ore", colore: COLORI.blu },
          ]}
        />
        <Albero
          titolo="Componi da zero"
          nodi={[
            { testo: "Regione", colore: COLORI.indaco },
            { testo: "Lavorazioni", colore: COLORI.azzurro },
            { testo: "Quantità", colore: COLORI.salvia },
          ]}
        />
      </div>
    </Finestra>
  );
}

type Formato = "pdf" | "word" | "carta";

const RIGHE_DOC = [
  ["Demolizione di pavimento in piastrelle", "55,99"],
  ["Rimozione di rivestimento", "96,97"],
  ["Massetto di sottofondo", "20,77"],
  ["Pavimento in gres porcellanato", "352,41"],
  ["Rivestimento pareti in piastrelle", "740,23"],
] as const;

/** Anteprima del preventivo esportato, in uno dei tre formati del modulo. */
export function AnteprimaDocumento({ formato }: { formato: Formato }) {
  return (
    <div className="relative mx-auto w-full max-w-[560px] md:mx-0">
      <div className="absolute -right-6 top-6 hidden h-full w-[88%] rounded-sm border border-home-line bg-white/70 md:block" />
      <div className="relative rounded-sm border border-home-line bg-white p-6 shadow-[0_24px_60px_-30px_rgba(38,43,56,0.35)] md:p-8">
        {formato === "carta" ? (
          <div className="mb-6 flex items-center justify-between border-b-2 border-home-mint pb-4">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-full bg-home-ink font-home-display text-sm text-white">
                LG
              </span>
              <div className="leading-tight">
                <p className="text-[12px] font-semibold text-home-ink">Il tuo logo qui</p>
                <p className="text-[10px] text-home-muted">Sede · P. IVA · contatti</p>
              </div>
            </div>
            <span className="text-[10px] uppercase tracking-[0.14em] text-home-muted">Carta intestata</span>
          </div>
        ) : (
          <div className="mb-6 flex items-center justify-between">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-home-ink">Preventivo n. 14</p>
            {formato === "pdf" ? (
              <span className="flex items-center gap-1 rounded-[3px] bg-[#fdecea] px-2 py-0.5 text-[10px] font-semibold text-[#c2412d]">
                <LockSimple size={11} weight="bold" /> PDF protetto
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-[3px] bg-[#e8f0fb] px-2 py-0.5 text-[10px] font-semibold text-[#2b5797]">
                <PencilSimpleLine size={11} weight="bold" /> Word editabile
              </span>
            )}
          </div>
        )}

        <p className="font-home-display text-[19px] leading-tight text-home-ink">Ristrutturazione bagno</p>
        <p className="mb-5 text-[11px] text-home-muted">Prezzario Regione Campania 2026</p>

        <div className="divide-y divide-home-line border-y border-home-line text-[11px]">
          {RIGHE_DOC.map(([d, v], i) => (
            <div key={d} className="flex justify-between gap-4 py-2 text-home-text">
              <span className="truncate">
                {formato === "word" && i === 3 ? (
                  <span className="bg-[#cfe0f7]">
                    {d}
                    <span className="ml-px inline-block h-3 w-px translate-y-0.5 animate-pulse bg-home-ink" />
                  </span>
                ) : (
                  d
                )}
              </span>
              <span className="tabular-nums">{v}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-between text-[12px] font-semibold text-home-ink">
          <span>Totale</span>
          <span className="tabular-nums">€ 1.266,37</span>
        </div>
      </div>
    </div>
  );
}
