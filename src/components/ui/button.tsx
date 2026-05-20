import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold leading-none h-10 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-40 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  // Pillola nera piena — azione primaria
  primary: "bg-primary text-on-primary active:bg-primary-active",
  // Pillola bianca con bordo ink — azione secondaria
  secondary: "bg-canvas text-ink border border-ink active:bg-surface-soft",
  // Testo su canvas, senza bordo
  ghost: "bg-transparent text-ink active:bg-surface-soft",
};

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return (
    <button className={cx(base, variants[variant], className)} {...props} />
  );
}

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={cx(base, variants[variant], className)} {...props} />;
}
