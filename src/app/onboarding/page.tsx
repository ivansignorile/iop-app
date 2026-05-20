import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const user = await requireUser();

  // Se ha già un'org corrente, vai alla dashboard.
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_org_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.current_org_id) redirect("/dashboard");

  return (
    <div className="flex min-h-full items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <h1 className="title-lg mb-1 text-ink">Crea la tua impresa</h1>
        <p className="mb-6 text-sm text-muted">
          Imposta lo spazio di lavoro. Potrai completare i dati aziendali (P.IVA,
          logo, indirizzo) in seguito dalle impostazioni.
        </p>
        <OnboardingForm />
      </div>
    </div>
  );
}
