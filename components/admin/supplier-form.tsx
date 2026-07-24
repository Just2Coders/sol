"use client";

import { useActionState } from "react";
import {
  createSupplier,
  updateSupplier,
  type SupplierFormState,
} from "@/app/actions/suppliers";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type SupplierZoneGroup = {
  id: string;
  name: string;
  cities: { id: string; name: string }[];
};

type SupplierDefaults = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  logoUrl: string | null;
  notes: string | null;
  payoutInfo: string | null;
  active: boolean;
  zoneIds: string[];
};

function FieldError({ state, field }: { state: SupplierFormState; field: string }) {
  const error = state?.errors?.[field]?.[0];
  return error ? <p className="text-sm text-destructive">{error}</p> : null;
}

export function SupplierForm({
  supplier,
  zoneGroups,
}: {
  supplier?: SupplierDefaults;
  zoneGroups: SupplierZoneGroup[];
}) {
  const [state, action, pending] = useActionState(
    supplier ? updateSupplier : createSupplier,
    undefined,
  );

  return (
    <form action={action} className="grid gap-6">
      {supplier && <input type="hidden" name="id" value={supplier.id} />}

      <Card>
        <CardHeader>
          <CardTitle>Datos del proveedor</CardTitle>
          <CardDescription>
            Información de contacto visible en el catálogo.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              name="name"
              defaultValue={supplier?.name}
              placeholder="Solar Demo C.A."
              required
            />
            <FieldError state={state} field="name" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={supplier?.email ?? ""}
              placeholder="ventas@proveedor.com"
            />
            <FieldError state={state} field="email" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={supplier?.phone ?? ""}
              placeholder="+58 412 0000000"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="logoUrl">Logo (URL)</Label>
            <Input
              id="logoUrl"
              name="logoUrl"
              type="url"
              defaultValue={supplier?.logoUrl ?? ""}
              placeholder="https://..."
            />
            <FieldError state={state} field="logoUrl" />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="notes">Notas internas</Label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={supplier?.notes ?? ""}
              placeholder="Solo visibles para el admin."
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="payoutInfo">Info de liquidación</Label>
            <Textarea
              id="payoutInfo"
              name="payoutInfo"
              defaultValue={supplier?.payoutInfo ?? ""}
              placeholder="Cómo se le paga: Zelle, cuenta bancaria, etc."
            />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <Checkbox id="active" name="active" defaultChecked={supplier?.active ?? true} />
            <Label htmlFor="active">Activo (visible en el catálogo)</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Zonas de cobertura</CardTitle>
          <CardDescription>
            Ciudades donde este proveedor vende y entrega. Se gestionan en{" "}
            <span className="font-medium">Zonas</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {zoneGroups.length === 0 && (
            <p className="text-sm text-muted-foreground sm:col-span-full">
              No hay zonas todavía. Crea estados y ciudades primero.
            </p>
          )}
          {zoneGroups.map((group) => (
            <fieldset key={group.id} className="grid gap-2">
              <legend className="mb-1 text-sm font-medium">{group.name}</legend>
              {group.cities.length === 0 && (
                <p className="text-sm text-muted-foreground">Sin ciudades.</p>
              )}
              {group.cities.map((city) => (
                <div key={city.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`zone-${city.id}`}
                    name="zoneIds"
                    value={city.id}
                    defaultChecked={supplier?.zoneIds.includes(city.id)}
                  />
                  <Label htmlFor={`zone-${city.id}`} className="font-normal">
                    {city.name}
                  </Label>
                </div>
              ))}
            </fieldset>
          ))}
        </CardContent>
        <CardFooter className="flex-col items-start gap-2">
          {state?.message && <p className="text-sm text-destructive">{state.message}</p>}
          {state?.success && (
            <p className="text-sm text-green-600">Cambios guardados.</p>
          )}
          <Button type="submit" disabled={pending}>
            {pending
              ? "Guardando..."
              : supplier
                ? "Guardar cambios"
                : "Crear proveedor"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
