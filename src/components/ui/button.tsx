import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost" | "accent";

const base =
  "inline-flex items-center justify-center gap-2 rounded-sm px-5 text-[15px] font-medium leading-none h-10 transition-colors active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-40 disabled:pointer-events-none";

// Bottoni della landing: squadrati, inchiostro blu-notte, accento menta.
const variants: Record<Variant, string> = {
  // Pieno inchiostro — azione primaria
  primary: "bg-primary text-on-primary hover:bg-primary-active",
  // Bordo inchiostro che si riempie al passaggio — azione secondaria
  secondary: "border-[1.5px] border-ink bg-canvas text-ink hover:bg-ink hover:text-on-primary",
  // Testo, senza bordo
  ghost: "bg-transparent text-ink hover:bg-surface-soft",
  // Menta — invito principale, come "Inizia gratis"
  accent: "bg-accent-btn text-white hover:bg-accent",
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
