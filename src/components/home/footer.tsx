import Link from "next/link";

const FOOTER = [
  {
    titolo: "Modalità",
    voci: [
      ["Self istantaneo", "#modalita"],
      ["Elaborato dal tecnico", "/invia"],
    ],
  },
  {
    titolo: "Per chi",
    voci: [
      ["Privati", "#per-chi"],
      ["Tecnici", "#per-chi"],
      ["Imprese edili", "#per-chi"],
    ],
  },
  {
    titolo: "Prodotto",
    voci: [
      ["Come funziona", "#come-funziona"],
      ["Formati", "#formati"],
      ["Prezzari", "#prezzari"],
    ],
  },
  {
    titolo: "Account",
    voci: [
      ["Accedi", "/login"],
      ["Registrati", "/signup"],
    ],
  },
] as const;

export function HomeFooter() {
  return (
    <footer className="relative z-[2] overflow-hidden bg-[#0a7d68] text-white">
      <div className="mx-auto max-w-[1280px] px-5 pt-20 md:px-10 md:pt-24">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <div>
            <p className="font-home-display text-[30px] font-semibold leading-none tracking-[-0.03em]">iop</p>
            <p className="mt-5 max-w-[240px] text-[16px] font-semibold leading-snug">
              Preventivi edili sui prezzari regionali ufficiali
            </p>
          </div>
          {FOOTER.map((c) => (
            <div key={c.titolo}>
              <p className="text-[15px] font-bold uppercase tracking-[0.08em] text-white/60">{c.titolo}</p>
              <ul className="mt-6 flex flex-col gap-4 text-[16px] font-semibold">
                {c.voci.map(([t, h]) => (
                  <li key={t}>
                    <Link href={h} className="underline-offset-4 transition-colors hover:text-home-mint-soft hover:underline">
                      {t}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-20 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-white/20 pt-8 text-[14px] font-semibold">
          <p>© {new Date().getFullYear()} iop</p>
          <Link href="/termini" className="text-white/75 transition-colors hover:text-white">
            Termini di Servizio
          </Link>
          <Link href="/privacy" className="text-white/75 transition-colors hover:text-white">
            Privacy Policy
          </Link>
        </div>
      </div>

      {/* Logo enorme a tutta larghezza, tagliato dal bordo inferiore */}
      <p
        aria-hidden
        className="mt-16 select-none text-center font-home-display text-[44vw] font-semibold leading-[0.74] tracking-normal text-white/10"
      >
        iop
      </p>
    </footer>
  );
}
