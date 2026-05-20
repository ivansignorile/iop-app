import type { ComponentProps, ReactNode } from "react";

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

// Card piatta, niente ombra: 1px hairline su canvas, angoli netti.
export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cx("border border-hairline bg-canvas p-6", className)}
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
    <div className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-hairline pb-6">
      <div>
        {eyebrow ? (
          <p className="eyebrow mb-2 text-stone">{eyebrow}</p>
        ) : null}
        <h1 className="display-md text-ink">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-base text-graphite">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

const statoTone: Record<string, string> = {
  bozza: "bg-surface-strong text-ink",
  inviato: "border border-ink text-ink",
  accettato: "bg-primary text-on-primary",
  rifiutato: "border border-hairline-soft text-stone line-through",
};

export function StatoBadge({ stato }: { stato: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        statoTone[stato] ?? "bg-surface-soft text-body",
      )}
    >
      {stato.charAt(0).toUpperCase() + stato.slice(1)}
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
    <div className="border border-hairline px-6 py-20 text-center">
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
