import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { LogoutButton } from "@/components/auth/logout-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Mi cuenta — Solaris" };

export default async function CuentaPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto grid max-w-lg gap-6 p-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Mi cuenta</h1>
        <LogoutButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{user.name}</CardTitle>
          <CardDescription>Datos de tu cuenta</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-1 text-sm">
          <p>
            <span className="text-muted-foreground">Correo:</span> {user.email}
          </p>
          {user.phone && (
            <p>
              <span className="text-muted-foreground">Teléfono:</span> {user.phone}
            </p>
          )}
          <p>
            <span className="text-muted-foreground">Zona:</span>{" "}
            {user.zone?.name ?? "Sin zona"}
          </p>
          {user.role === "ADMIN" && (
            <p>
              <span className="text-muted-foreground">Rol:</span> Administrador
            </p>
          )}
        </CardContent>
      </Card>

      <ChangePasswordForm />
    </main>
  );
}
