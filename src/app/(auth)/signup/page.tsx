import { AuthForm } from "@/app/(auth)/auth-form";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Email arriva dal modulo della home (/signup?email=...).
  const { email } = await searchParams;
  return (
    <div>
      <h1 className="title-lg mb-1 text-ink">Crea il tuo account</h1>
      <p className="mb-6 text-sm text-muted">
        Inizia a generare preventivi professionali in pochi minuti.
      </p>
      <AuthForm mode="signup" defaultEmail={typeof email === "string" ? email : undefined} />
    </div>
  );
}
