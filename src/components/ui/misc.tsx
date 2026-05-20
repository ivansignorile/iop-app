import type { ComponentProps, ReactNode } from "react";

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cx(
        "rounded-md border border-hairline bg-canvas p-6",
        className,
      )}
      {...props}
    />
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="display-md text-ink">{title}</h1>
        {description ? (
          <p className="mt-2 text-sm text-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

const statoTone: Record<string, string> = {
  bozza: "bg-surface-strong text-ink",
  inviato: "bg-signature-cream text-ink",
  accettato: "bg-success/10 text-success",
  rifiutato: "bg-signature-coral/10 text-signature-coral",
};

export function StatoBadge({ stato }: { stato: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-medium",
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
    <div className="rounded-lg border border-dashed border-hairline px-6 py-16 text-center">
      <p className="title-sm text-ink">{title}</p>
      {description ? (
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}
