import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg px-6 py-4 text-base font-medium leading-tight transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-info-border)] disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-on-primary active:bg-primary-active",
  secondary: "bg-canvas text-ink border border-hairline active:bg-surface-soft",
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
