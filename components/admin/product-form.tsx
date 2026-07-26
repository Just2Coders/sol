"use client";

import { useActionState } from "react";
import {
  createProduct,
  updateProduct,
  type ProductFormState,
} from "@/app/actions/products";
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

export type ProductSupplierOption = { id: string; name: string };

export type ProductDefaults = {
  id: string;
  supplierId: string;
  name: string;
  description: string | null;
  /** Ficha técnica ya formateada como "clave: valor" por línea. */
  specsText: string;
  priceUsd: number;
  stock: number;
  /** Una URL por línea. */
  imagesText: string;
  active: boolean;
};

export function ProductForm({
  product,
  suppliers,
}: {
  product?: ProductDefaults;
  suppliers: ProductSupplierOption[];
}) {
  const [state, action, pending] = useActionState<ProductFormState, FormData>(
    product ? updateProduct : createProduct,
    undefined,
  );

  return (
    <form action={action} className="grid gap-6">
      {product && <input type="hidden" name="id" value={product.id} />}

      <Card>
        <CardHeader>
          <CardTitle>Datos del producto</CardTitle>
          <CardDescription>
            Panel, inversor, batería o accesorio de un proveedor.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="supplierId">Proveedor</Label>
            <Select name="supplierId" defaultValue={product?.supplierId} required>
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
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              name="name"
              defaultValue={product?.name}
              placeholder="Panel Solar Monocristalino 450W"
              required
            />
            <FieldError state={state} field="name" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="priceUsd">Precio (USD)</Label>
            <Input
              id="priceUsd"
              name="priceUsd"
              inputMode="decimal"
              defaultValue={product ? product.priceUsd.toFixed(2) : ""}
              placeholder="185.00"
              required
            />
            <FieldError state={state} field="priceUsd" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="stock">Stock (unidades)</Label>
            <Input
              id="stock"
              name="stock"
              inputMode="numeric"
              defaultValue={product?.stock ?? 0}
              placeholder="25"
              required
            />
            <FieldError state={state} field="stock" />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={product?.description ?? ""}
              placeholder="Visible para el cliente en el catálogo."
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="specs">Ficha técnica</Label>
            <Textarea
              id="specs"
              name="specs"
              rows={4}
              defaultValue={product?.specsText ?? ""}
              placeholder={"potencia: 450W\ntipo: Monocristalino\ngarantia: 10 años"}
            />
            <p className="text-sm text-muted-foreground">
              Una característica por línea, con el formato «clave: valor».
            </p>
            <FieldError state={state} field="specs" />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="images">Imágenes</Label>
            <Textarea
              id="images"
              name="images"
              rows={3}
              defaultValue={product?.imagesText ?? ""}
              placeholder={"https://.../panel-frente.jpg\nhttps://.../panel-detalle.jpg"}
            />
            <p className="text-sm text-muted-foreground">
              Una URL por línea (máximo 10). La subida de archivos llega más adelante.
            </p>
            <FieldError state={state} field="images" />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <Checkbox
              id="active"
              name="active"
              defaultChecked={product?.active ?? true}
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
              : product
                ? "Guardar cambios"
                : "Crear producto"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
