"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { signOutAction } from "@/app/auth/actions";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/preventivi", label: "Preventivi" },
  { href: "/clienti", label: "Clienti" },
  { href: "/libreria", label: "Libreria" },
  { href: "/membri", label: "Membri" },
  { href: "/impostazioni", label: "Impostazioni" },
  { href: "/guida-degrado", label: "Guida degrado" },
];

export function AppNav({ orgName }: { orgName: string }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-hairline bg-canvas">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-4 px-6 md:px-12">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-lg font-medium text-ink">
            IOP
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => {
              const active = pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-md px-3 py-2 text-sm ${
                    active
                      ? "bg-surface-soft font-medium text-ink"
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
          <span className="hidden text-sm text-muted sm:inline">{orgName}</span>
          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded-md border border-hairline px-3 py-2 text-sm text-ink"
            >
              Esci
            </button>
          </form>
        </div>
      </div>

      {/* Nav mobile */}
      <nav className="flex items-center gap-1 overflow-x-auto border-t border-hairline px-4 py-2 md:hidden">
        {links.map((l) => {
          const active = pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm ${
                active ? "bg-surface-soft font-medium text-ink" : "text-body"
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
