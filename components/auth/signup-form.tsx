"use client";

import Link from "next/link";
import { useActionState } from "react";
import { register } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ZoneOption = {
  id: string;
  name: string;
  cities: { id: string; name: string }[];
};

export function SignupForm({
  zoneTree,
  redirectTo,
}: {
  zoneTree: ZoneOption[];
  redirectTo?: string;
}) {
  const [state, action, pending] = useActionState(register, undefined);

  return (
    <Card className="w-full max-w-md py-8">
      <CardHeader className="gap-2 px-8">
        <p className="text-label font-mono text-emphasis uppercase">crear cuenta</p>
        <h1 className="text-heading-1 text-foreground">Crea tu cuenta</h1>
        <p className="text-body-sm text-muted-foreground">
          Regístrate para comprar en los proveedores de tu zona.
        </p>
      </CardHeader>
      <form action={action}>
        {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
        <CardContent className="grid gap-4 px-8 pt-6">
          <div className="grid gap-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" name="name" placeholder="Tu nombre" required className="h-12" />
            {state?.errors?.name && (
              <p className="text-sm text-destructive">{state.errors.name[0]}</p>
            )}
          </div>
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
            <Label htmlFor="phone">Teléfono (opcional)</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="+53 5 123 4567"
              className="h-12"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="zoneId">Tu zona</Label>
            <Select name="zoneId" required>
              <SelectTrigger id="zoneId" className="h-12 w-full">
                <SelectValue placeholder="Selecciona tu ciudad" />
              </SelectTrigger>
              <SelectContent>
                {zoneTree.map((state) => (
                  <SelectGroup key={state.id}>
                    <SelectLabel>{state.name}</SelectLabel>
                    {state.cities.map((city) => (
                      <SelectItem key={city.id} value={city.id}>
                        {city.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            {state?.errors?.zoneId && (
              <p className="text-sm text-destructive">{state.errors.zoneId[0]}</p>
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
            {pending ? "Creando cuenta..." : "Crear cuenta"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <Link
              href={redirectTo ? `/login?from=${encodeURIComponent(redirectTo)}` : "/login"}
              className="text-foreground font-medium underline underline-offset-4"
            >
              Inicia sesión
            </Link>
          </p>
        </CardContent>
      </form>
    </Card>
  );
}
