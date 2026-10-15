export type AdminCandidate = {
  email?: string | null;
  email_confirmed_at?: string | null;
};

/** Admin solo se l'email è in IOP_ADMIN_EMAILS E confermata (niente signup con email altrui). */
export function isPlatformAdmin(user: AdminCandidate | null | undefined) {
  if (!user?.email || !user.email_confirmed_at) return false;
  const list = (process.env.IOP_ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(user.email.trim().toLowerCase());
}
