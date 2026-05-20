import { Card, PageHeader } from "@/components/ui/misc";
import { requireContext } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { InviteForm } from "./invite-form";
import { changeRoleAction, removeMemberAction } from "./actions";

const ROLE_LABEL: Record<string, string> = {
  owner: "Titolare",
  admin: "Admin",
  member: "Membro",
};

export default async function MembriPage() {
  const { org, userId } = await requireContext();
  const supabase = await createClient();
  const { data: members } = await supabase.rpc("list_org_members", {
    target_org: org.id,
  });

  return (
    <div>
      <PageHeader
        title="Membri"
        description="Chi può accedere a questo workspace. Gli inviti funzionano per utenti già registrati su IOP."
      />

      <Card className="mb-8">
        <h2 className="title-sm mb-4 text-ink">Aggiungi membro</h2>
        <InviteForm />
      </Card>

      <div className="overflow-hidden rounded-md border border-hairline">
        <table className="w-full text-sm">
          <thead className="bg-surface-soft text-left text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Utente</th>
              <th className="px-4 py-3 font-medium">Ruolo</th>
              <th className="px-4 py-3 font-medium">Dal</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {(members ?? []).map((m) => {
              const isOwner = m.role === "owner";
              const isSelf = m.user_id === userId;
              return (
                <tr key={m.user_id} className="border-t border-hairline">
                  <td className="px-4 py-3 text-ink">
                    {m.full_name ? `${m.full_name} · ` : ""}
                    <span className="text-body">{m.email}</span>
                    {isSelf ? <span className="text-muted"> (tu)</span> : null}
                  </td>
                  <td className="px-4 py-3">
                    {isOwner || isSelf ? (
                      <span className="text-body">{ROLE_LABEL[m.role]}</span>
                    ) : (
                      <form action={changeRoleAction} className="inline-flex items-center gap-2">
                        <input type="hidden" name="user_id" value={m.user_id} />
                        <select
                          name="role"
                          defaultValue={m.role}
                          className="rounded-sm border border-hairline bg-canvas px-2 py-1 text-sm"
                        >
                          <option value="member">Membro</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button type="submit" className="text-sm text-link">
                          Salva
                        </button>
                      </form>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">{formatDate(m.joined_at)}</td>
                  <td className="px-4 py-3 text-right">
                    {!isOwner && !isSelf ? (
                      <form action={removeMemberAction} className="inline">
                        <input type="hidden" name="user_id" value={m.user_id} />
                        <button
                          type="submit"
                          className="text-sm text-ink underline underline-offset-2"
                        >
                          Rimuovi
                        </button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
