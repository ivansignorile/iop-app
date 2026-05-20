import { AuthForm } from "@/app/(auth)/auth-form";

export default function LoginPage() {
  return (
    <div>
      <h1 className="title-lg mb-1 text-ink">Bentornato</h1>
      <p className="mb-6 text-sm text-muted">
        Accedi per gestire i tuoi preventivi.
      </p>
      <AuthForm mode="login" />
    </div>
  );
}
