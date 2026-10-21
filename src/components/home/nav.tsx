import { CaretDown } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

const MENU = [
  {
    titolo: "Modalità",
    voci: [
      { titolo: "Self istantaneo", testo: "Lo componi tu, subito", href: "#modalita" },
      { titolo: "Elaborato dal tecnico", testo: "Pronto entro 24 ore", href: "/invia" },
    ],
  },
  {
    titolo: "Per chi",
    voci: [
      { titolo: "Privati", testo: "Costi chiari prima dei lavori", href: "#per-chi" },
      { titolo: "Tecnici", testo: "Computi impaginati in un clic", href: "#per-chi" },
      { titolo: "Imprese edili", testo: "Preventivi la sera stessa", href: "#per-chi" },
    ],
  },
] as const;

export function HomeNav() {
  return (
    <header className="relative z-20 mx-auto flex h-[72px] w-full max-w-[1280px] items-center justify-between gap-6 px-5 md:px-6">
      <div className="flex items-center gap-10">
        <Link href="/" className="flex items-baseline gap-1.5" aria-label="iop, home">
          <span className="font-home-display text-[28px] font-medium leading-none tracking-[-0.03em] text-home-ink">
            iop
          </span>
          <span className="-rotate-6 font-home-hand text-[15px] font-bold leading-none text-home-mint">+AI dentro!</span>
        </Link>

        <nav className="hidden items-center gap-7 text-[15px] text-home-ink lg:flex" aria-label="Principale">
          {MENU.map((m) => (
            <div key={m.titolo} className="group relative">
              <button
                type="button"
                className="flex items-center gap-1.5 py-6 transition-colors hover:text-home-mint focus-visible:text-home-mint"
              >
                {m.titolo}
                <CaretDown size={12} weight="bold" className="transition-transform group-hover:rotate-180" />
              </button>
              <div className="invisible absolute -left-5 top-full w-72 translate-y-1 rounded-xl border border-home-line bg-white p-2 opacity-0 shadow-[0_18px_40px_-18px_rgba(38,43,56,0.25)] transition-all duration-200 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                {m.voci.map((v) => (
                  <Link
                    key={v.titolo}
                    href={v.href}
                    className="block rounded-lg px-4 py-3 transition-colors hover:bg-home-panel"
                  >
                    <span className="block font-medium text-home-ink">{v.titolo}</span>
                    <span className="block text-sm text-home-muted">{v.testo}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
          <Link href="#formati" className="transition-colors hover:text-home-mint">
            Formati
          </Link>
          <Link href="#come-funziona" className="transition-colors hover:text-home-mint">
            Come funziona
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-2 text-[15px]">
        <Link href="/login" className="hidden px-4 py-2 text-home-ink hover:text-home-mint sm:block">
          Accedi
        </Link>
        <Link
          href="/invia"
          className="hidden h-[38px] items-center rounded-[4px] border-[1.5px] border-home-ink px-4 font-medium text-home-ink transition-colors hover:bg-home-ink hover:text-white active:scale-[0.98] md:flex"
        >
          Invia al tecnico
        </Link>
        <Link
          href="/signup"
          className="flex h-[38px] items-center rounded-[4px] bg-home-ink px-4 font-medium text-white transition-colors hover:bg-[#1a1e28] active:scale-[0.98]"
        >
          Registrati
        </Link>
      </div>
    </header>
  );
}
