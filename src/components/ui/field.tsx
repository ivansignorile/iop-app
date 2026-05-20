import type { ComponentProps, ReactNode } from "react";

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return (
    <label
      className={cx(
        "mb-1.5 block text-sm font-medium text-ink",
        className,
      )}
      {...props}
    />
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cx(
        "h-11 w-full rounded-sm border border-hairline bg-canvas px-4 text-sm text-ink",
        "outline-none placeholder:text-muted/70 focus:border-[var(--color-info-border)]",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cx(
        "w-full rounded-sm border border-hairline bg-canvas px-4 py-3 text-sm text-ink",
        "outline-none placeholder:text-muted/70 focus:border-[var(--color-info-border)]",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cx(
        "h-11 w-full rounded-sm border border-hairline bg-canvas px-3 text-sm text-ink",
        "outline-none focus:border-[var(--color-info-border)]",
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-sm border border-signature-coral/30 bg-signature-coral/5 px-3 py-2 text-sm text-signature-coral"
    >
      {message}
    </p>
  );
}
