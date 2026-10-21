import type { ComponentProps, ReactNode } from "react";

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

// Card della landing: bordo leggero e ombra morbida tinta di inchiostro.
export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cx(
        "rounded-md border border-hairline bg-canvas p-6 shadow-[0_24px_60px_-34px_rgba(38,43,56,0.3)]",
        className,
      )}
      {...props}
    />
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-4 pb-2">
      <div>
        {eyebrow ? (
          <p className="mb-2 -rotate-1 font-home-hand text-[19px] font-bold uppercase tracking-[0.04em] text-accent-deep">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="display-lg text-ink">{title}</h1>
        {description ? (
          <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-graphite">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

// Etichette colorate come i tag della landing.
const statoTone: Record<string, string> = {
  bozza: "bg-surface-strong text-ink-soft",
  inviato: "bg-[#3f6a92] text-white",
  accettato: "bg-[#5a9e4b] text-white",
  nuova: "bg-[#d4693f] text-white",
  in_lavorazione: "bg-[#3f6a92] text-white",
  evasa: "bg-[#5a9e4b] text-white",
  scartata: "bg-surface-strong text-stone line-through",
  rifiutato: "bg-surface-strong text-stone line-through",
};

export function StatoBadge({ stato }: { stato: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-xs px-2 py-[3px] text-[10px] font-semibold uppercase tracking-[0.08em]",
        statoTone[stato] ?? "bg-surface-soft text-body",
      )}
    >
      {(stato.charAt(0).toUpperCase() + stato.slice(1)).replace("_", " ")}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-surface-soft px-6 py-20 text-center">
      <p className="title-sm text-ink">{title}</p>
      {description ? (
        <p className="mx-auto mt-1 max-w-sm text-sm text-graphite">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}
