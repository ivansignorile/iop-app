import type { ComponentProps, ReactNode } from "react";

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

// Stile della landing: nessun box, riga inferiore che diventa menta in focus.
const fieldBase =
  "w-full rounded-none border-0 border-b-[1.5px] border-hairline-soft bg-transparent px-0.5 py-2.5 text-base text-ink outline-none transition-colors placeholder:text-stone hover:border-ink-soft focus:border-accent";

export function Label({ className, ...props }: ComponentProps<"label">) {
  return (
    <label
      className={cx("mb-1 block text-sm font-semibold text-ink", className)}
      {...props}
    />
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cx(fieldBase, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cx(fieldBase, "min-h-24 leading-relaxed", className)}
      {...props}
    />
  );
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cx(fieldBase, "py-2", className)} {...props} />;
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
      {hint ? <p className="mt-1 text-xs text-stone">{hint}</p> : null}
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-md bg-[#fcf3f4] px-4 py-3 text-sm text-ink"
    >
      <span className="font-semibold">Errore.</span> {message}
    </p>
  );
}
