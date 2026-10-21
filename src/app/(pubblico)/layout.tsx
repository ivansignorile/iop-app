import { HomeFooter } from "@/components/home/footer";
import { HomeNav } from "@/components/home/nav";

// Pagine pubbliche (modulo richiesta, privacy, termini) con header e footer della landing.
export default function PubblicoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-full flex-col overflow-x-clip">
      <div aria-hidden className="absolute inset-x-0 top-0 h-[600px] rounded-b-[100%] bg-surface-grey" />
      <div className="relative">
        <HomeNav />
      </div>
      <div className="relative flex-1 pb-24">{children}</div>
      <HomeFooter />
    </div>
  );
}
