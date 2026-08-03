"use client";

import { Check } from "reicon-react";

import { flatCtaClass } from "@/components/landing/flat-cta";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROVINCES, useLeadPrototype } from "./prototype-kit";

/**
 * El alta de proveedor, ya como página propia (`/sell`).
 *
 * No lleva tarjeta ni campos encajonados: hereda la gramática del comparador
 * de kits —retícula, filetes de 1px y rótulos mono a la izquierda— y la usa
 * para que el formulario se lea como un impreso de alta. La fila *es* el
 * campo, y el valor se escribe a tamaño de titular pequeño, así que lo que el
 * proveedor teclea pesa más que la etiqueta que lo pide.
 *
 * Es la razón del cambio de estilo: metido en una caja `bg-card` con inputs
 * redondeados y un botón de librería, esto se leía como un formulario
 * cualquiera pegado encima de la página. Sin caja y con el filete como única
 * línea, pertenece.
 *
 * ⚠️ SIN CABLEAR — `useLeadPrototype` finge el ciclo y muestra el acuse sin
 * guardar nada. Antes de que esto salga a producción hay que sustituirlo por
 * una Server Action con Zod que persista el lead (o lo mande por Resend); si
 * no, el proveedor cree que se apuntó y nadie recibe nada.
 */
export function SupplierApplicationForm() {
  const { status, draft, onSubmit } = useLeadPrototype();

  if (status === "sent") {
    return <SentNotice business={draft.business} province={draft.province} />;
  }

  return (
    <form onSubmit={onSubmit}>
      <FormRow htmlFor="sell-business" label="negocio o nombre">
        <Input
          id="sell-business"
          name="business"
          required
          autoComplete="organization"
          placeholder="Solar del Este"
          className="text-heading-3 focus-visible:ring-ring h-16 rounded-md border-0 bg-transparent px-4 focus-visible:ring-2"
        />
      </FormRow>

      <FormRow htmlFor="sell-province" label="provincia">
        <Select name="province" required>
          <SelectTrigger
            id="sell-province"
            className="text-heading-3 focus-visible:ring-ring h-16 w-full rounded-md border-0 px-4 focus-visible:ring-2"
          >
            <SelectValue placeholder="Escoge una" />
          </SelectTrigger>
          <SelectContent>
            {PROVINCES.map((province) => (
              <SelectItem key={province} value={province}>
                {province}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormRow>

      <FormRow htmlFor="sell-contact" label="whatsapp o correo">
        <Input
          id="sell-contact"
          name="contact"
          required
          placeholder="+53 5 123 4567"
          className="text-heading-3 focus-visible:ring-ring h-16 rounded-md border-0 bg-transparent px-4 focus-visible:ring-2"
        />
      </FormRow>

      {/* El filete de cierre y, debajo, la acción — alineada con la columna del
          valor, no con la de los rótulos. */}
      <div className="border-border flex flex-col items-start gap-4 border-t pt-8 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          disabled={status === "sending"}
          className={flatCtaClass(
            "loud",
            "lg",
            "disabled:bg-primary-disabled disabled:cursor-not-allowed",
          )}
        >
          {status === "sending" ? "Enviando…" : "Enviar solicitud"}
        </button>
        <p className="text-muted-foreground text-marginalia font-mono">
          estos datos solo los ve el equipo de Solaris
        </p>
      </div>
    </form>
  );
}

/**
 * Una fila del impreso: rótulo mono a la izquierda, campo a la derecha. En
 * móvil el rótulo se sube encima del campo — la fila de dos columnas no cabe
 * sin encoger el valor, que es justo lo que no queremos.
 */
function FormRow({
  htmlFor,
  label,
  children,
}: {
  htmlFor: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-border grid items-center gap-1 border-t py-4 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-6">
      <Label
        htmlFor={htmlFor}
        className="text-muted-foreground text-marginalia px-4 font-mono md:px-0"
      >
        {label}
      </Label>
      {children}
    </div>
  );
}

// El acuse mantiene el filete y el ritmo del impreso: la ficha no desaparece,
// queda sellada.
function SentNotice({
  business,
  province,
}: {
  business: string;
  province: string;
}) {
  return (
    <div
      role="status"
      className="border-border animate-in fade-in-0 slide-in-from-bottom-2 duration-slow ease-standard border-t border-b py-12"
    >
      <Check aria-hidden className="text-success size-8" />
      <p className="text-foreground text-heading-1 mt-4">Solicitud enviada.</p>
      <p className="text-muted-foreground text-marginalia mt-3 font-mono">
        {business || "tu negocio"} · {province || "sin provincia"} · te
        escribimos al contacto que dejaste
      </p>
    </div>
  );
}
