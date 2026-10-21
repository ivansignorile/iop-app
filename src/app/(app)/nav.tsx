"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { signOutAction } from "@/app/auth/actions";

const baseLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/preventivi", label: "Preventivi" },
  { href: "/clienti", label: "Clienti" },
  { href: "/libreria", label: "Libreria" },
  { href: "/membri", label: "Membri" },
  { href: "/impostazioni", label: "Impostazioni" },
  { href: "/guida-degrado", label: "Guida degrado" },
];

export function AppNav({
  orgName,
  isAdmin = false,
}: {
  orgName: string;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const links = isAdmin
    ? [...baseLinks, { href: "/admin/richieste", label: "Richieste" }]
    : baseLinks;

  return (
    <header className="sticky top-0 z-20 border-b border-hairline bg-canvas/90 backdrop-blur-md">
      <div className="mx-auto flex h-[68px] max-w-[1280px] items-center justify-between gap-4 px-6 md:px-12">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-baseline gap-1.5" aria-label="iop, dashboard">
            <span className="font-home-display text-[26px] font-medium leading-none tracking-[-0.03em] text-ink">
              iop
            </span>
            <span className="-rotate-6 font-home-hand text-[14px] font-bold leading-none text-accent">+AI dentro!</span>
          </Link>
          <nav className="hidden items-center gap-1 lg:flex">
            {links.map((l) => {
              const active = pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`relative px-3 py-2 text-[15px] transition-colors hover:text-accent-deep ${
                    active
                      ? "font-semibold text-ink after:absolute after:inset-x-3 after:-bottom-[15px] after:h-[3px] after:rounded-full after:bg-accent"
                      : "text-body"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-2 text-sm font-medium text-ink sm:flex">
            <span className="grid size-7 place-items-center rounded-full bg-accent-tint font-home-display text-[13px] text-accent-deep">
              {orgName.charAt(0).toUpperCase()}
            </span>
            {orgName}
          </span>
          <form action={signOutAction}>
            <button
              type="submit"
              className="h-[36px] rounded-sm border-[1.5px] border-ink px-4 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-on-primary active:scale-[0.98]"
            >
              Esci
            </button>
          </form>
        </div>
      </div>

      {/* Nav mobile */}
      <nav className="flex items-center gap-1 overflow-x-auto border-t border-hairline px-4 py-2 lg:hidden">
        {links.map((l) => {
          const active = pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`whitespace-nowrap rounded-sm px-3 py-1.5 text-sm ${
                active ? "bg-accent-tint font-semibold text-ink" : "text-body"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
