import Link from "next/link";

// Stile della landing: sfondo grigio ad arco dietro al modulo.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-full flex-col overflow-x-clip">
      <div aria-hidden className="absolute inset-x-0 top-0 h-[70vh] rounded-b-[100%] bg-surface-grey" />
      <header className="relative flex h-[72px] items-center px-6 md:px-12">
        <Link href="/" className="flex items-baseline gap-1.5" aria-label="iop, home">
          <span className="font-home-display text-[28px] font-medium leading-none tracking-[-0.03em] text-ink">iop</span>
          <span className="-rotate-6 font-home-hand text-[15px] font-bold leading-none text-accent">+AI dentro!</span>
        </Link>
      </header>
      <main className="relative flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-md border border-hairline bg-canvas p-8 shadow-[0_24px_60px_-30px_rgba(38,43,56,0.35)] md:p-10">
          {children}
        </div>
      </main>
    </div>
  );
}
