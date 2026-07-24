import { LoginForm } from "@/components/auth/login-form";
import { safeInternalPath } from "@/lib/utils";

export const metadata = { title: "Iniciar sesión — Solaris" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string }>;
}) {
  const redirectTo = safeInternalPath((await searchParams).desde) ?? undefined;

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <LoginForm redirectTo={redirectTo} />
    </main>
  );
}
