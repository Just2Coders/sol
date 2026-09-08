"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <Card className="w-full max-w-md py-8">
      <CardHeader className="gap-2 px-8">
        <p className="text-label font-mono text-emphasis uppercase">iniciar sesión</p>
        <h1 className="text-heading-1 text-foreground">Bienvenido de vuelta</h1>
        <p className="text-body-sm text-muted-foreground">Accede a tu cuenta de Solaris.</p>
      </CardHeader>
      <form action={action}>
        {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
        <CardContent className="grid gap-4 px-8 pt-6">
          <div className="grid gap-2">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="tu@correo.com"
              required
              className="h-12"
            />
            {state?.errors?.email && (
              <p className="text-sm text-destructive">{state.errors.email[0]}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" name="password" type="password" required className="h-12" />
            {state?.errors?.password && (
              <p className="text-sm text-destructive">{state.errors.password[0]}</p>
            )}
          </div>
          {state?.message && <p className="text-sm text-destructive">{state.message}</p>}

          <Button type="submit" className="mt-2 h-12 w-full" disabled={pending}>
            {pending ? "Entrando..." : "Entrar"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            ¿No tienes cuenta?{" "}
            <Link
              href={redirectTo ? `/signup?from=${encodeURIComponent(redirectTo)}` : "/signup"}
              className="text-foreground font-medium underline underline-offset-4"
            >
              Regístrate
            </Link>
          </p>
        </CardContent>
      </form>
    </Card>
  );
}
