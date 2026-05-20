import { PageHeader } from "@/components/ui/misc";
import { requireContext } from "@/lib/auth";
import { SettingsForm } from "./settings-form";

export default async function ImpostazioniPage() {
  const { org } = await requireContext();
  return (
    <div>
      <PageHeader
        title="Impostazioni azienda"
        description="Dati e logo usati nell'intestazione dei preventivi."
      />
      <SettingsForm org={org} />
    </div>
  );
}
