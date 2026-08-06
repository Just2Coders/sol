"use client";

import { useActionState } from "react";
import { Check } from "reicon-react";

import { createSupplierLead } from "@/app/actions/supplier-leads";
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
import { PROVINCES } from "@/lib/zones/provinces";

const FIELD_CLASS =
  "border-input bg-card text-body focus-visible:ring-ring h-12 w-full rounded-md px-4 focus-visible:ring-2";

/**
 * El alta de proveedor, en la mitad clara de `/sell` (ver `SellBrandPanel`
 * para la mitad oscura, que lleva el argumento y la prueba).
 *
 * Campos con caja de verdad —borde, fondo `bg-card`, radio `rounded-md`—, no
 * el impreso sin marco de la primera versión: esa se leía como texto suelto
 * sobre la página, no como un formulario. El envío persiste de verdad, vía
 * `createSupplierLead` (`app/actions/supplier-leads.ts`) → tabla
 * `supplier_leads`.
 */
export function SupplierApplicationForm() {
  const [state, formAction, pending] = useActionState(
    createSupplierLead,
    undefined,
  );

  if (state?.success) {
    return (
      <SentNotice
        business={state.business ?? ""}
        province={state.province ?? ""}
      />
    );
  }

  return (
    <form action={formAction} className="flex w-full max-w-105 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-emphasis text-marginalia tracking-mono-lg font-mono uppercase">
          solicitud
        </p>
        <h1 className="text-foreground text-heading-1">
          Cuéntanos de tu negocio
        </h1>
      </div>

      <div className="flex flex-col gap-4">
        <Field
          htmlFor="sell-business"
          label="Negocio o nombre"
          error={state?.errors?.business?.[0]}
        >
          <Input
            id="sell-business"
            name="business"
            required
            autoComplete="organization"
            placeholder="Solar del Este"
            className={FIELD_CLASS}
          />
        </Field>

        <Field
          htmlFor="sell-province"
          label="Provincia"
          error={state?.errors?.province?.[0]}
        >
          <Select name="province" required>
            <SelectTrigger id="sell-province" className={FIELD_CLASS}>
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
        </Field>

        <Field
          htmlFor="sell-contact"
          label="WhatsApp o correo"
          error={state?.errors?.contact?.[0]}
        >
          <Input
            id="sell-contact"
            name="contact"
            required
            placeholder="+53 5 123 4567"
            className={FIELD_CLASS}
          />
        </Field>
      </div>

      {state?.message && (
        <p className="text-destructive text-body-xs">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className={flatCtaClass(
          "loud",
          "lg",
          "w-full disabled:bg-primary-disabled disabled:cursor-not-allowed",
        )}
      >
        {pending ? "Enviando…" : "Enviar solicitud"}
      </button>

      <p className="text-muted-foreground text-marginalia text-center font-mono">
        estos datos solo los ve el equipo de Solaris
      </p>
    </form>
  );
}

/** Rótulo encima del campo — la caja del campo ya lleva su propio borde. */
function Field({
  htmlFor,
  label,
  error,
  children,
}: {
  htmlFor: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label
        htmlFor={htmlFor}
        className="text-foreground text-body-sm font-medium"
      >
        {label}
      </Label>
      {children}
      {error && <p className="text-destructive text-body-xs">{error}</p>}
    </div>
  );
}

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
      className="animate-in fade-in-0 slide-in-from-bottom-2 duration-slow ease-standard flex w-full max-w-105 flex-col items-start"
    >
      <Check aria-hidden className="text-success size-8" />
      <p className="text-foreground text-heading-1 mt-4">
        Solicitud enviada.
      </p>
      <p className="text-muted-foreground text-marginalia mt-3 font-mono">
        {business || "tu negocio"} · {province || "sin provincia"} · te
        escribimos al contacto que dejaste
      </p>
    </div>
  );
}
