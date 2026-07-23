"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "@/app/actions/auth";
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

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Iniciar sesión</CardTitle>
        <CardDescription>Accede a tu cuenta de Solaris</CardDescription>
      </CardHeader>
      <form action={action}>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Correo</Label>
            <Input id="email" name="email" type="email" placeholder="tu@correo.com" required />
            {state?.errors?.email && (
              <p className="text-sm text-destructive">{state.errors.email[0]}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" name="password" type="password" required />
            {state?.errors?.password && (
              <p className="text-sm text-destructive">{state.errors.password[0]}</p>
            )}
          </div>
          {state?.message && <p className="text-sm text-destructive">{state.message}</p>}
        </CardContent>
        <CardFooter className="mt-6 flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Entrando..." : "Entrar"}
          </Button>
          <p className="text-sm text-muted-foreground">
            ¿No tienes cuenta?{" "}
            <Link href="/registro" className="underline underline-offset-4 hover:text-foreground">
              Regístrate
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
