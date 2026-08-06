"use client";

import { useActionState, useState } from "react";
import {
  setInstallationOffers,
  type OffersFormState,
} from "@/app/actions/installation-offers";
import {
  offerToken,
  type EquipmentScope,
  type InstallableType,
} from "@/lib/services/enums";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type OfferTarget = {
  type: InstallableType;
  id: string;
  name: string;
  active: boolean;
};

export type OfferGroup = {
  supplierId: string;
  supplierName: string;
  targets: OfferTarget[];
};

/**
 * A qué productos y kits se le pega la instalación de este servicio.
 *
 * Qué se puede elegir lo decide el alcance: `OWN` solo lo que vende su propio
 * proveedor, `PLATFORM` y `ANY` lo de cualquiera. Por eso el alcance se pasa
 * como prop y no se vuelve a preguntar — se cambia arriba, en el formulario del
 * servicio, que es donde tiene sus consecuencias explicadas.
 */
export function ServiceOffersForm({
  serviceId,
  supplierId,
  supplierName,
  equipmentScope,
  groups,
  selected,
}: {
  serviceId: string;
  supplierId: string;
  supplierName: string;
  equipmentScope: EquipmentScope;
  groups: OfferGroup[];
  selected: string[];
}) {
  const [state, action, pending] = useActionState<OffersFormState, FormData>(
    setInstallationOffers,
    undefined,
  );

  const [checked, setChecked] = useState<ReadonlySet<string>>(
    () => new Set(selected),
  );

  function toggle(token: string, on: boolean) {
    setChecked((current) => {
      const next = new Set(current);
      if (on) next.add(token);
      else next.delete(token);
      return next;
    });
  }

  const ownOnly = equipmentScope === "OWN";
  const own = groups.find((group) => group.supplierId === supplierId);
  const foreign = groups.filter((group) => group.supplierId !== supplierId);

  // Con alcance `OWN` no se enseña el catálogo ajeno... salvo lo que ya estuviera
  // ofrecido. Esconderlo lo volvería imposible de quitar, y quitarlo es justo lo
  // que hay que hacer para poder cerrar el alcance.
  const stranded = ownOnly
    ? foreign
        .flatMap((group) =>
          group.targets.map((target) => ({ group, target })),
        )
        .filter(({ target }) => checked.has(offerToken(target.type, target.id)))
    : [];

  const visible = ownOnly ? (own ? [own] : []) : groups;

  return (
    <form action={action} className="grid gap-6">
      <input type="hidden" name="serviceId" value={serviceId} />

      <Card>
        <CardHeader>
          <CardTitle>Dónde se ofrece</CardTitle>
          <CardDescription>
            Los equipos que llevan este servicio como añadido en su ficha. Sin
            marcar ninguno, el servicio sigue vendiéndose solo desde la suya.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-6">
          <p className="text-sm text-muted-foreground">
            {ownOnly
              ? `Trabaja solo sobre equipo propio, así que únicamente puede pegarse a lo que vende ${supplierName}. Para ofrecerlo con equipo de otros, ábrele el alcance arriba.`
              : "Acepta equipo ajeno, así que puede ofrecerse junto a los productos y kits de cualquier proveedor."}
          </p>

          {visible.length === 0 && stranded.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {ownOnly
                ? `${supplierName} todavía no tiene productos ni kits a los que pegar esta instalación.`
                : "Todavía no hay productos ni kits en el catálogo."}
            </p>
          )}

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((group) => (
              <fieldset key={group.supplierId} className="grid gap-2">
                <legend className="mb-1 text-sm font-medium">
                  {group.supplierName}
                </legend>
                {group.targets.map((target) => {
                  const token = offerToken(target.type, target.id);
                  return (
                    <div key={token} className="flex items-center gap-2">
                      <Checkbox
                        id={`offer-${token}`}
                        name="targets"
                        value={token}
                        checked={checked.has(token)}
                        onCheckedChange={(value) => toggle(token, value === true)}
                      />
                      <Label
                        htmlFor={`offer-${token}`}
                        className="flex flex-wrap items-center gap-2 font-normal"
                      >
                        {target.name}
                        {target.type === "KIT" && (
                          <Badge variant="secondary">Kit</Badge>
                        )}
                        {!target.active && <Badge variant="outline">Inactivo</Badge>}
                      </Label>
                    </div>
                  );
                })}
              </fieldset>
            ))}
          </div>

          {stranded.length > 0 && (
            <fieldset className="bg-destructive-bg border-destructive-border grid gap-2 rounded-md border p-4">
              <legend className="px-1 text-sm font-medium">
                Hay que quitar esto
              </legend>
              <p className="text-sm text-muted-foreground">
                Estos equipos son de otro proveedor y este servicio ya no acepta
                trabajar sobre ellos. Desmárcalos para poder guardar.
              </p>
              {stranded.map(({ group, target }) => {
                const token = offerToken(target.type, target.id);
                return (
                  <div key={token} className="flex items-center gap-2">
                    <Checkbox
                      id={`offer-${token}`}
                      name="targets"
                      value={token}
                      checked
                      onCheckedChange={(value) => toggle(token, value === true)}
                    />
                    <Label htmlFor={`offer-${token}`} className="font-normal">
                      {target.name}{" "}
                      <span className="text-muted-foreground">
                        — {group.supplierName}
                      </span>
                    </Label>
                  </div>
                );
              })}
            </fieldset>
          )}
        </CardContent>

        <CardFooter className="flex-col items-start gap-2">
          {state?.message && (
            <p className="text-sm text-destructive">{state.message}</p>
          )}
          {state?.success && (
            <p className="text-success text-sm">Cambios guardados.</p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando..." : "Guardar dónde se ofrece"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
