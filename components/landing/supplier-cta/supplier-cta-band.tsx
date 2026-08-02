"use client";

import { useState } from "react";
import { Check } from "reicon-react";

import { flatCtaClass } from "@/components/landing/flat-cta";
import { Button } from "@/components/ui/button";
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
 * La banda de proveedores.
 *
 * La página entera está escrita para el que compra; esta sección le habla a
 * otro. El aviso de que cambia el interlocutor no lo da un rótulo, lo da el
 * material: la banda se va a sangre en el lienzo oscuro —el primero de los dos
 * bloques de tinta con los que cierra la home— y dentro solo hay una columna
 * centrada, sin nada a los lados que reparta la atención.
 *
 * El formulario no está a la vista: en reposo la sección es un argumento y un
 * botón, que es lo que pide un visitante que todavía no sabe si esto va con él.
 * Solo al pulsar aparecen los tres campos, y entonces sí sobre papel claro —el
 * único objeto claro de la banda, donde cae la mirada sin subir el tamaño de
 * nada.
 *
 * ⚠️ SIN CABLEAR — el formulario todavía no envía nada: `useLeadPrototype`
 * finge el ciclo y muestra el acuse sin guardar la solicitud. Antes de que esta
 * home salga a producción hay que sustituirlo por una Server Action con Zod que
 * persista el lead (o lo mande por Resend); si no, el proveedor cree que se
 * apuntó y nadie recibe nada.
 */
export function SupplierCtaBand() {
  const [open, setOpen] = useState(false);
  const { status, onSubmit } = useLeadPrototype();

  return (
    <section
      id="supplier"
      aria-labelledby="supplier-band-title"
      className="bg-canvas px-gutter py-section-md flex scroll-mt-8 flex-col items-center"
    >
      <div className="flex w-full max-w-190 flex-col items-center gap-6 text-center">
        <p className="text-label tracking-mono-lg text-canvas-foreground font-mono uppercase">
          proveedores
        </p>
        <h2
          id="supplier-band-title"
          className="text-display-3 text-canvas-foreground"
        >
          ¿Y si el proveedor eres tú?
        </h2>
        <p className="text-body text-canvas-foreground">
          Solaris no vende paneles: los pone donde los buscan. Publicas tus kits,
          decides en qué provincias trabajas — el cobro y la factura los llevamos
          nosotros.
        </p>

        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={false}
            aria-controls="supplier-lead-form"
            className={flatCtaClass("loud", "lg", "mt-2.5")}
          >
            Quiero vender en Solaris
          </button>
        )}

        <p className="text-marginalia tracking-mono-xs text-canvas-foreground font-mono">
          el alta la hacemos a mano, una por una
        </p>
      </div>

      {open && (
        <div
          id="supplier-lead-form"
          className="bg-card text-card-foreground animate-in fade-in-0 slide-in-from-bottom-2 duration-slow ease-standard mt-12 w-full max-w-md p-8 text-left"
        >
          {status === "sent" ? (
            <SentNotice />
          ) : (
            <form onSubmit={onSubmit}>
              <p className="text-muted-foreground text-marginalia font-mono">
                alta de proveedor
              </p>
              <p className="text-foreground text-heading-2 mt-2">
                Déjanos tres datos.
              </p>

              <div className="mt-8 flex flex-col gap-5">
                <FieldShell htmlFor="band-business" label="negocio o nombre">
                  <Input
                    id="band-business"
                    name="business"
                    required
                    autoComplete="organization"
                    placeholder="Solar del Este"
                    className="text-body h-12 rounded-md px-4"
                  />
                </FieldShell>

                <FieldShell htmlFor="band-province" label="provincia">
                  <Select name="province" required>
                    <SelectTrigger
                      id="band-province"
                      className="text-body h-12 w-full rounded-md px-4"
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
                </FieldShell>

                <FieldShell htmlFor="band-contact" label="whatsapp o correo">
                  <Input
                    id="band-contact"
                    name="contact"
                    required
                    placeholder="+53 5 123 4567"
                    className="text-body h-12 rounded-md px-4"
                  />
                </FieldShell>
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={status === "sending"}
                className="text-button mt-8 h-12 w-full"
              >
                {status === "sending" ? "Enviando…" : "Enviar solicitud"}
              </Button>
            </form>
          )}
        </div>
      )}
    </section>
  );
}

/** Rótulo mono encima del campo — el mismo registro que la marginalia del hero. */
function FieldShell({
  htmlFor,
  label,
  children,
}: {
  htmlFor: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label
        htmlFor={htmlFor}
        className="text-muted-foreground text-marginalia font-mono"
      >
        {label}
      </Label>
      {children}
    </div>
  );
}

// El acuse ocupa el mismo hueco que ocupaban los campos: la tarjeta no salta,
// solo cambia de contenido. Es el único momento animado de la sección.
function SentNotice() {
  return (
    <div
      role="status"
      className="animate-in fade-in-0 slide-in-from-bottom-2 duration-slow ease-standard flex min-h-[368px] flex-col justify-center"
    >
      <Check aria-hidden className="text-success size-8" />
      <p className="text-foreground text-heading-2 mt-4">Recibido.</p>
      <p className="text-muted-foreground text-body mt-2">
        Te escribimos por el contacto que dejaste para ver qué vendes y en qué
        provincias puedes instalar.
      </p>
    </div>
  );
}
