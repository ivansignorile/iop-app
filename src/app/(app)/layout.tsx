import { getIsPlatformAdmin } from "@/lib/admin";
import { requireContext } from "@/lib/auth";
import { AppNav } from "./nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { org } = await requireContext();
  const isAdmin = await getIsPlatformAdmin();

  return (
    <div className="flex min-h-full flex-col">
      <AppNav orgName={org.name} isAdmin={isAdmin} />
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-6 py-8 md:px-12">
        {children}
      </main>
    </div>
  );
}
