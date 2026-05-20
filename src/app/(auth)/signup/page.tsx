import { AuthForm } from "@/app/(auth)/auth-form";

export default function SignupPage() {
  return (
    <div>
      <h1 className="title-lg mb-1 text-ink">Crea il tuo account</h1>
      <p className="mb-6 text-sm text-muted">
        Inizia a generare preventivi professionali in pochi minuti.
      </p>
      <AuthForm mode="signup" />
    </div>
  );
}
