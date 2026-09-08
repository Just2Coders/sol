"use client";

import { useActionState, useState } from "react";
import {
  createService,
  updateService,
  type ServiceFormState,
} from "@/app/actions/services";
import { FieldError } from "@/components/admin/field-error";
import { ImageUploader } from "@/components/admin/image-uploader";
import {
  EQUIPMENT_SCOPES,
  type EquipmentScope,
  type ServicePricing,
} from "@/lib/services/enums";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ServiceSupplierOption = {
  id: string;
  name: string;
  /** Con qué alcance nacen sus servicios. Solo prefija este formulario. */
  defaultEquipmentScope: EquipmentScope;
  /** ¿Vende productos o kits? Es lo que decide si un `OWN` suyo tiene salida. */
  hasInstallables: boolean;
};

export type ServiceCategoryOption = { id: string; name: string };

export type ServiceDefaults = {
  id: string;
  supplierId: string;
  categoryId: string;
  name: string;
  description: string | null;
  pricing: ServicePricing;
  priceUsd: number;
  unitLabel: string | null;
  equipmentScope: EquipmentScope;
  images: string[];
  active: boolean;
};

/**
 * Qué significa cada alcance, en la voz del proveedor.
 *
 * Va escrito debajo del select y no en un tooltip porque es la decisión con más
 * consecuencias del formulario —abrirse es responder por equipo que no vendiste—
 * y no se toma bien sin leerla.
 */
const SCOPE_HELP: Record<EquipmentScope, string> = {
  OWN: "Solo sobre equipos que vende este mismo proveedor.",
  PLATFORM:
    "También sobre equipos vendidos por otros proveedores de Solaris. Se puede ofrecer junto a sus productos y kits.",
  ANY: "También sobre equipos que el cliente consiguió fuera de Solaris. Es el único que se puede contratar suelto, sin comprar nada más.",
};

const SCOPE_LABEL: Record<EquipmentScope, string> = {
  OWN: "Solo equipo propio",
  PLATFORM: "Equipo de cualquier proveedor de Solaris",
  ANY: "Cualquier equipo, venga de donde venga",
};

export function ServiceForm({
  service,
  suppliers,
  categories,
}: {
  service?: ServiceDefaults;
  suppliers: ServiceSupplierOption[];
  categories: ServiceCategoryOption[];
}) {
  const [state, action, pending] = useActionState<ServiceFormState, FormData>(
    service ? updateService : createService,
    undefined,
  );

  // La unidad de obra solo existe con precio por unidad, así que el campo
  // aparece y desaparece con el select en vez de quedarse ahí sin sentido.
  const [pricing, setPricing] = useState<ServicePricing>(service?.pricing ?? "FLAT");

  // El alcance nace con el default del proveedor elegido, pero solo mientras se
  // esté creando: en una edición el valor vivo es el de la fila, y pisarlo al
  // tocar otro campo sería cambiar una decisión ya tomada sin avisar.
  const [scope, setScope] = useState<EquipmentScope>(service?.equipmentScope ?? "OWN");

  // Quién es el proveedor elegido se sigue aquí porque de él depende el aviso de
  // abajo, no solo el valor que se envía.
  const [supplierId, setSupplierId] = useState(service?.supplierId ?? "");

  function handleSupplierChange(value: string) {
    setSupplierId(value);
    if (service) return;
    const supplier = suppliers.find((s) => s.id === value);
    if (supplier) setScope(supplier.defaultEquipmentScope);
  }

  // Un proveedor sin productos ni kits es un **instalador puro**: un servicio
  // `OWN` suyo no tendría a qué pegarse y no se podría vender nunca. No se
  // prohíbe —puede estar a punto de cargar su catálogo—, se avisa.
  const supplier = suppliers.find((s) => s.id === supplierId);
  const ownWithoutCatalog = scope === "OWN" && supplier != null && !supplier.hasInstallables;

  return (
    <form action={action} className="grid gap-6">
      {service && <input type="hidden" name="id" value={service.id} />}

      <Card>
        <CardHeader>
          <CardTitle>Datos del servicio</CardTitle>
          <CardDescription>
            Instalación, mantenimiento o cualquier otra mano de obra de un
            proveedor.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="supplierId">Proveedor</Label>
            <Select
              name="supplierId"
              defaultValue={service?.supplierId}
              onValueChange={handleSupplierChange}
              required
            >
              <SelectTrigger id="supplierId" className="w-full">
                <SelectValue placeholder="Selecciona el proveedor" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError state={state} field="supplierId" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="categoryId">Categoría</Label>
            <Select name="categoryId" defaultValue={service?.categoryId} required>
              <SelectTrigger id="categoryId" className="w-full">
                <SelectValue placeholder="Selecciona la categoría" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError state={state} field="categoryId" />
          </div>

          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              name="name"
              defaultValue={service?.name}
              placeholder="Instalación de paneles"
              required
            />
            <FieldError state={state} field="name" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="pricing">Cómo se cobra</Label>
            <Select
              name="pricing"
              defaultValue={pricing}
              onValueChange={(value) => setPricing(value as ServicePricing)}
              required
            >
              <SelectTrigger id="pricing" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FLAT">Precio cerrado por trabajo</SelectItem>
                <SelectItem value="PER_UNIT">Por unidad de obra</SelectItem>
              </SelectContent>
            </Select>
            <FieldError state={state} field="pricing" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="priceUsd">
              {pricing === "PER_UNIT" ? "Precio por unidad (USD)" : "Precio (USD)"}
            </Label>
            <Input
              id="priceUsd"
              name="priceUsd"
              inputMode="decimal"
              defaultValue={service ? service.priceUsd.toFixed(2) : ""}
              placeholder={pricing === "PER_UNIT" ? "25.00" : "350.00"}
              required
            />
            <FieldError state={state} field="priceUsd" />
          </div>

          {pricing === "PER_UNIT" && (
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="unitLabel">Unidad de obra</Label>
              <Input
                id="unitLabel"
                name="unitLabel"
                defaultValue={service?.unitLabel ?? ""}
                placeholder="panel"
                required
              />
              <p className="text-sm text-muted-foreground">
                En singular: el cliente elegirá cuántas. Se muestra como «$25 /
                panel».
              </p>
              <FieldError state={state} field="unitLabel" />
            </div>
          )}

          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="equipmentScope">Sobre qué equipo trabaja</Label>
            <Select
              name="equipmentScope"
              value={scope}
              onValueChange={(value) => setScope(value as EquipmentScope)}
              required
            >
              <SelectTrigger id="equipmentScope" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EQUIPMENT_SCOPES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {SCOPE_LABEL[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">{SCOPE_HELP[scope]}</p>
            {ownWithoutCatalog && (
              <p className="bg-warning-bg text-warning border-warning-border rounded-md border p-3 text-sm">
                {supplier.name} no tiene productos ni kits todavía, así que un
                servicio que solo trabaje sobre equipo propio no se podrá vender:
                no hay nada a lo que pegarlo. Cárgale catálogo, o ábrele el
                alcance.
              </p>
            )}
            <FieldError state={state} field="equipmentScope" />
          </div>

          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={service?.description ?? ""}
              placeholder="Qué incluye el trabajo. Visible para el cliente."
            />
          </div>

          <div className="grid gap-2 sm:col-span-2">
            <Label>Imágenes</Label>
            <ImageUploader folder="services" defaultUrls={service?.images} />
            <FieldError state={state} field="images" />
          </div>

          <div className="flex items-center gap-2 sm:col-span-2">
            <Checkbox
              id="active"
              name="active"
              defaultChecked={service?.active ?? true}
            />
            <Label htmlFor="active">Activo (visible en el catálogo)</Label>
          </div>
        </CardContent>
        <CardFooter className="flex-col items-start gap-2">
          {state?.message && <p className="text-sm text-destructive">{state.message}</p>}
          {state?.success && <p className="text-success text-sm">Cambios guardados.</p>}
          <Button type="submit" disabled={pending}>
            {pending
              ? "Guardando..."
              : service
                ? "Guardar cambios"
                : "Crear servicio"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
