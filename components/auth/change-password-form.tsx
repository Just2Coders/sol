"use client";

import { useActionState } from "react";
import { changePassword } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePassword, undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cambiar contraseña</CardTitle>
        <CardDescription>Actualiza la contraseña de tu cuenta</CardDescription>
      </CardHeader>
      <form action={action}>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="currentPassword">Contraseña actual</Label>
            <Input id="currentPassword" name="currentPassword" type="password" required />
            {state?.errors?.currentPassword && (
              <p className="text-sm text-destructive">{state.errors.currentPassword[0]}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="newPassword">Nueva contraseña</Label>
            <Input id="newPassword" name="newPassword" type="password" required />
            {state?.errors?.newPassword && (
              <p className="text-sm text-destructive">{state.errors.newPassword[0]}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirmPassword">Confirmar nueva contraseña</Label>
            <Input id="confirmPassword" name="confirmPassword" type="password" required />
            {state?.errors?.confirmPassword && (
              <p className="text-sm text-destructive">{state.errors.confirmPassword[0]}</p>
            )}
          </div>
          {state?.message === "ok" && (
            <p className="text-sm text-green-600">Contraseña actualizada correctamente.</p>
          )}
        </CardContent>
        <CardFooter className="mt-6">
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando..." : "Guardar"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
