import {
  CaretDown,
  CaretRight,
  DotsThree,
  DownloadSimple,
  FunnelSimple,
  MagnifyingGlass,
  Star,
} from "@phosphor-icons/react/dist/ssr";

// Voci reali del Prezzario Regione Campania 2026 (tabella prezzario_voci), quantità di un bagno tipo.
const GRUPPI = [
  {
    titolo: "Demolizioni e rimozioni",
    voci: [
      { codice: "R02.060.040.A", descrizione: "Demolizione di pavimento in piastrelle", um: "mq", qta: 6.2, prezzo: 9.03 },
      { codice: "R02.060.035.B", descrizione: "Rimozione di rivestimento", um: "mq", qta: 18.4, prezzo: 5.27 },
      { codice: "T01.020.010.B", descrizione: "Trasporto materiali di risulta", um: "mc", qta: 2.1, prezzo: 6.58 },
    ],
  },
  {
    titolo: "Opere edili",
    voci: [
      { codice: "E07.010.030.B", descrizione: "Massetto di sottofondo", um: "mq", qta: 6.2, prezzo: 3.35 },
      { codice: "E16.020.030.F", descrizione: "Intonaco civile liscio a tre strati", um: "mq", qta: 12, prezzo: 3.01 },
      { codice: "E13.030.020.A", descrizione: "Pavimento in gres porcellanato", um: "mq", qta: 6.2, prezzo: 56.84 },
      { codice: "E15.020.040.A", descrizione: "Rivestimento pareti in piastrelle", um: "mq", qta: 18.4, prezzo: 40.23 },
    ],
  },
  {
    titolo: "Impianti",
    voci: [{ codice: "I01.020.010.A", descrizione: "Vaso a sedere in vetrochina", um: "cad", qta: 1, prezzo: 274.8 }],
  },
];

const SELEZIONATA = "E13.030.020.A";

const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
const num = new Intl.NumberFormat("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const importo = (v: { qta: number; prezzo: number }) => Math.round(v.qta * v.prezzo * 100) / 100;
const totale = GRUPPI.flatMap((g) => g.voci).reduce((s, v) => s + importo(v), 0);

function Barra({ titolo, badge }: { titolo: string; badge?: string }) {
  return (
    <div className="flex h-9 items-center gap-2 border-b border-home-line px-3 text-[11px] text-home-muted">
      <MagnifyingGlass size={13} />
      <Star size={13} />
      <span className="truncate">{titolo}</span>
      {badge ? (
        <span className="rounded-[3px] bg-[#5aa454] px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-white">
          {badge}
        </span>
      ) : null}
      <span className="ml-auto flex items-center gap-2.5">
        <FunnelSimple size={13} />
        <DownloadSimple size={13} />
        <DotsThree size={15} weight="bold" />
      </span>
    </div>
  );
}

export function MockPreventivo() {
  return (
    <div className="overflow-hidden rounded-md border border-home-line bg-white shadow-[0_24px_60px_-30px_rgba(38,43,56,0.35)]">
      <div className="grid md:grid-cols-[1.45fr_1fr]">
        {/* Tabella voci */}
        <div className="min-w-0 border-home-line md:border-r">
          <Barra titolo="Preventivi / Ristrutturazione bagno" />
          <div className="px-4 pb-2 pt-3">
            <p className="text-[15px] font-semibold text-home-ink">Capitoli &gt; Voci</p>
          </div>
          <table className="w-full table-fixed text-left text-[11px]">
            <thead className="text-home-muted">
              <tr className="border-y border-home-line">
                <th className="w-[44%] px-4 py-1.5 font-normal">Descrizione</th>
                <th className="hidden w-[24%] px-2 py-1.5 font-normal sm:table-cell">Codice</th>
                <th className="w-[19%] px-2 py-1.5 text-right font-normal sm:w-[15%]">Q.tà</th>
                <th className="w-[17%] px-4 py-1.5 text-right font-normal">Importo</th>
              </tr>
            </thead>
            <tbody className="text-home-text">
              {GRUPPI.map((g) => (
                <GruppoRighe key={g.titolo} gruppo={g} />
              ))}
              <tr className="border-t border-home-line">
                <td className="px-4 py-2 font-semibold text-home-ink" colSpan={2}>
                  Totale lavori
                </td>
                <td className="hidden sm:table-cell" />
                <td className="px-4 py-2 text-right font-semibold tabular-nums text-home-ink">{euro.format(totale)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Dettaglio voce */}
        <div className="hidden min-w-0 flex-col md:flex">
          <Barra titolo={SELEZIONATA} badge="Voce" />
          <div className="flex flex-1 flex-col gap-3 px-4 py-3">
            <p className="text-[15px] font-semibold text-home-ink">Pavimento in gres porcellanato</p>
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              <span className="rounded-[3px] bg-home-panel px-1.5 py-0.5 text-home-text">Opere edili · Pavimenti</span>
              <span className="rounded-[3px] bg-home-mint-tint px-1.5 py-0.5 text-[#0b8a73]">Prezzario Campania 2026</span>
            </div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-home-muted">Descrizione</p>
            <ul className="list-disc space-y-1 pl-4 text-[11px] leading-snug text-home-text">
              <li>Piastrelle di gres fine porcellanato, prima scelta, a colori chiari</li>
              <li>Posa su sottofondo predisposto, compresi tagli e sfridi</li>
              <li>Prezzo unitario {euro.format(56.84)} al mq</li>
            </ul>
            <SchizzoMisure />
          </div>
        </div>
      </div>
    </div>
  );
}

function GruppoRighe({ gruppo }: { gruppo: (typeof GRUPPI)[number] }) {
  return (
    <>
      <tr className="border-b border-home-line/70">
        <td className="px-4 py-1.5 font-medium text-home-ink" colSpan={4}>
          <span className="flex items-center gap-1.5">
            <CaretDown size={10} weight="fill" className="text-[#5aa454]" />
            {gruppo.titolo}
          </span>
        </td>
      </tr>
      {gruppo.voci.map((v) => {
        const attiva = v.codice === SELEZIONATA;
        return (
          <tr
            key={v.codice}
            className={`border-b border-home-line/70 ${attiva ? "bg-[#eef3fb] outline outline-1 -outline-offset-1 outline-[#9db6dd]" : ""}`}
          >
            <td className="truncate py-1.5 pl-8 pr-2">
              <span className="flex items-center gap-1.5">
                <CaretRight size={9} weight="fill" className="shrink-0 text-home-muted" />
                <span className="truncate">{v.descrizione}</span>
              </span>
            </td>
            <td className="hidden truncate px-2 py-1.5 font-mono text-[10px] text-home-muted sm:table-cell">
              {v.codice}
            </td>
            <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">
              {num.format(v.qta)} <span className="text-home-muted">{v.um}</span>
            </td>
            <td className="px-4 py-1.5 text-right tabular-nums">{num.format(importo(v))}</td>
          </tr>
        );
      })}
    </>
  );
}

// Equivalente dello schizzo a mano del riferimento: pianta del bagno con le misure.
function SchizzoMisure() {
  return (
    <div className="mt-auto rounded-sm bg-[#faf8f4] p-3 font-home-hand text-[13px] leading-none">
      <svg viewBox="0 0 260 130" className="h-auto w-full" aria-label="Schizzo della pianta del bagno con le misure">
        <path
          d="M30 22 L148 20 L150 108 L31 110 Z"
          fill="none"
          stroke="#3a3f4b"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path d="M30 60 L48 60 M30 74 L48 74" stroke="#3a3f4b" strokeWidth="1.2" />
        <circle cx="128" cy="40" r="9" fill="none" stroke="#3a3f4b" strokeWidth="1.2" />
        <rect x="52" y="86" width="38" height="16" rx="3" fill="none" stroke="#3a3f4b" strokeWidth="1.2" />
        <text x="72" y="14" fill="#e2643a" fontSize="14">2,00 m</text>
        <text x="156" y="68" fill="#e2643a" fontSize="14">3,10 m</text>
        <path d="M168 84 C190 92 200 100 214 96" fill="none" stroke="#e2643a" strokeWidth="1.2" />
        <text x="178" y="116" fill="#e2643a" fontSize="14">= 6,20 mq</text>
        <text x="98" y="128" fill="#7a7f8a" fontSize="12">bagno · rilievo</text>
      </svg>
    </div>
  );
}
