"use client";

import { useActionState, useState } from "react";
import { createKit, updateKit, type KitFormState } from "@/app/actions/kits";
import { FieldError } from "@/components/admin/field-error";
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

export type KitProductOption = {
  id: string;
  name: string;
  priceUsd: number;
  active: boolean;
};

export type KitSupplierGroup = {
  supplierId: string;
  supplierName: string;
  products: KitProductOption[];
};

export type KitDefaults = {
  id: string;
  supplierId: string;
  name: string;
  description: string | null;
  priceUsd: number;
  /** Una URL por línea. */
  imagesText: string;
  active: boolean;
  items: { productId: string; quantity: number }[];
};

export function KitForm({
  kit,
  productsBySupplier,
}: {
  kit?: KitDefaults;
  productsBySupplier: KitSupplierGroup[];
}) {
  const [state, action, pending] = useActionState<KitFormState, FormData>(
    kit ? updateKit : createKit,
    undefined,
  );

  // Un kit solo puede contener productos de su proveedor, así que la selección
  // de productos depende del proveedor elegido (validado también en el servidor).
  const [supplierId, setSupplierId] = useState(kit?.supplierId ?? "");
  const group = productsBySupplier.find((g) => g.supplierId === supplierId);

  const defaultQuantity = (productId: string) =>
    kit?.items.find((item) => item.productId === productId)?.quantity ?? 1;

  return (
    <form action={action} className="grid gap-6">
      {kit && <input type="hidden" name="id" value={kit.id} />}

      <Card>
        <CardHeader>
          <CardTitle>Datos del kit</CardTitle>
          <CardDescription>
            Un combo de productos de un mismo proveedor, con precio propio.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="supplierId">Proveedor</Label>
            <Select
              name="supplierId"
              value={supplierId}
              onValueChange={setSupplierId}
              required
            >
              <SelectTrigger id="supplierId" className="w-full">
                <SelectValue placeholder="Selecciona el proveedor" />
              </SelectTrigger>
              <SelectContent>
                {productsBySupplier.map((g) => (
                  <SelectItem key={g.supplierId} value={g.supplierId}>
                    {g.supplierName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError state={state} field="supplierId" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              name="name"
              defaultValue={kit?.name}
              placeholder="Kit Solar Residencial 3KW"
              required
            />
            <FieldError state={state} field="name" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="priceUsd">Precio del kit (USD)</Label>
            <Input
              id="priceUsd"
              name="priceUsd"
              inputMode="decimal"
              defaultValue={kit ? kit.priceUsd.toFixed(2) : ""}
              placeholder="1699.00"
              required
            />
            <FieldError state={state} field="priceUsd" />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={kit?.description ?? ""}
              placeholder="Qué resuelve el kit y para qué tamaño de vivienda."
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="images">Imágenes</Label>
            <Textarea
              id="images"
              name="images"
              rows={3}
              defaultValue={kit?.imagesText ?? ""}
              placeholder={"https://.../kit-3kw.jpg"}
            />
            <p className="text-sm text-muted-foreground">
              Una URL por línea (máximo 10).
            </p>
            <FieldError state={state} field="images" />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <Checkbox id="active" name="active" defaultChecked={kit?.active ?? true} />
            <Label htmlFor="active">Activo (visible en el catálogo)</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Productos incluidos</CardTitle>
          <CardDescription>
            Marca los productos y ajusta cuántas unidades trae el kit.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {!supplierId && (
            <p className="text-sm text-muted-foreground">
              Selecciona primero un proveedor.
            </p>
          )}
          {supplierId && !group?.products.length && (
            <p className="text-sm text-muted-foreground">
              Este proveedor todavía no tiene productos. Créalos primero.
            </p>
          )}
          {group?.products.map((product) => (
            <div
              key={product.id}
              className="flex flex-wrap items-center gap-3 border-b pb-3 last:border-0 last:pb-0"
            >
              <Checkbox
                id={`product-${product.id}`}
                name="productIds"
                value={product.id}
                defaultChecked={kit?.items.some((i) => i.productId === product.id)}
              />
              <Label htmlFor={`product-${product.id}`} className="flex-1 font-normal">
                {product.name}
                <span className="text-muted-foreground">
                  {" "}
                  · ${product.priceUsd.toFixed(2)}
                  {!product.active && " · inactivo"}
                </span>
              </Label>
              <div className="flex items-center gap-2">
                <Label htmlFor={`qty-${product.id}`} className="text-muted-foreground">
                  Cantidad
                </Label>
                <Input
                  id={`qty-${product.id}`}
                  name={`qty-${product.id}`}
                  inputMode="numeric"
                  className="w-20"
                  defaultValue={defaultQuantity(product.id)}
                />
              </div>
            </div>
          ))}
          <FieldError state={state} field="items" />
        </CardContent>
        <CardFooter className="flex-col items-start gap-2">
          {state?.message && <p className="text-sm text-destructive">{state.message}</p>}
          {state?.success && <p className="text-success text-sm">Cambios guardados.</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando..." : kit ? "Guardar cambios" : "Crear kit"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
