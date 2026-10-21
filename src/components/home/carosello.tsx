"use client";

import { CaretDown, CaretUp } from "@phosphor-icons/react";
import { useEffect, useState, type ReactNode } from "react";

export type Slide = { id: string; testo: ReactNode; visual: ReactNode };

const INTERVALLO_MS = 6500;

// Pannello del riferimento: testo a sinistra, visual a destra che sborda, frecce su/giù in basso.
export function Carosello({ slides, etichetta }: { slides: Slide[]; etichetta: string }) {
  const [attiva, setAttiva] = useState(0);
  const [inPausa, setInPausa] = useState(false);

  useEffect(() => {
    if (inPausa || slides.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => setAttiva((i) => (i + 1) % slides.length), INTERVALLO_MS);
    return () => window.clearInterval(t);
  }, [inPausa, slides.length]);

  const vai = (delta: number) => setAttiva((i) => (i + delta + slides.length) % slides.length);

  return (
    <div
      className="relative overflow-hidden rounded-md bg-home-panel md:mr-[calc(50%-50vw)] md:rounded-r-none"
      onMouseEnter={() => setInPausa(true)}
      onMouseLeave={() => setInPausa(false)}
      onFocus={() => setInPausa(true)}
      onBlur={() => setInPausa(false)}
      role="region"
      aria-roledescription="carosello"
      aria-label={etichetta}
    >
      <div className="grid md:min-h-[440px] md:grid-cols-[260px_1fr]">
        <div className="relative flex flex-col justify-center px-6 pb-4 pt-8 md:px-8 md:py-10">
          <div className="grid">
            {slides.map((s, i) => (
              <div
                key={s.id}
                aria-hidden={i !== attiva}
                className={`col-start-1 row-start-1 text-[15px] leading-[1.75] text-home-ink transition-all ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  i === attiva
                    ? "translate-y-0 opacity-100 delay-200 duration-500"
                    : "pointer-events-none -translate-y-2 opacity-0 duration-200"
                }`}
              >
                {s.testo}
              </div>
            ))}
          </div>
          <div className="mt-8 flex gap-2 md:absolute md:bottom-6 md:left-8 md:mt-0">
            <Freccia etichetta="Precedente" onClick={() => vai(-1)}>
              <CaretUp size={11} weight="bold" />
            </Freccia>
            <Freccia etichetta="Successiva" onClick={() => vai(1)}>
              <CaretDown size={11} weight="bold" />
            </Freccia>
          </div>
        </div>

        <div className="grid min-w-0 items-center px-6 pb-8 md:py-12 md:pl-4 md:pr-0">
          {slides.map((s, i) => (
            <div
              key={s.id}
              aria-hidden={i !== attiva}
              className={`col-start-1 row-start-1 min-w-0 transition-all ease-[cubic-bezier(0.16,1,0.3,1)] ${
                i === attiva
                  ? "translate-y-0 opacity-100 delay-200 duration-700"
                  : "pointer-events-none -translate-y-4 opacity-0 duration-200"
              }`}
            >
              {s.visual}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Freccia({ etichetta, onClick, children }: { etichetta: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={etichetta}
      className="grid size-[18px] place-items-center rounded-full border border-home-line bg-white text-home-muted shadow-[0_2px_6px_rgba(38,43,56,0.12)] transition-colors hover:text-home-ink active:scale-95"
    >
      {children}
    </button>
  );
}

/** Parola evidenziata in menta, come i tag nel testo del riferimento. */
export function Evidenzia({ children, forte = false }: { children: ReactNode; forte?: boolean }) {
  return (
    <mark
      className={`rounded-[3px] px-1 py-px font-medium ${
        forte ? "bg-home-mint-btn text-white" : "bg-home-mint-tint text-home-ink"
      }`}
    >
      {children}
    </mark>
  );
}
