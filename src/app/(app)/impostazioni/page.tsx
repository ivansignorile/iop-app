import { PageHeader } from "@/components/ui/misc";
import { requireContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";

export default async function ImpostazioniPage() {
  const { org } = await requireContext();
  const supabase = await createClient();
  const { data } = await supabase
    .from("prezzari")
    .select("regione, titolo")
    .eq("attivo", true)
    .order("anno", { ascending: false });
  const regioni: { regione: string; titolo: string }[] = [];
  for (const r of data ?? []) {
    if (!regioni.some((x) => x.regione === r.regione)) regioni.push(r);
  }
  return (
    <div>
      <PageHeader
        title="Impostazioni azienda"
        description="Dati e logo usati nell'intestazione dei preventivi."
      />
      <SettingsForm org={org} regioni={regioni} />
    </div>
  );
}
