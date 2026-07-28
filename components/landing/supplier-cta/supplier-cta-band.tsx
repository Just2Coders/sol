"use client";

import { Check } from "reicon-react";

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
 * VARIANTE A — "La banda oscura".
 *
 * La página entera está escrita para el que compra; esta sección le habla a
 * otro. El aviso de que cambia el interlocutor no lo da un rótulo, lo da el
 * material: la banda se va a sangre en el lienzo oscuro —el único de la home—
 * y dentro de ella el formulario es el único objeto claro, así que la mirada
 * cae donde está la acción sin que haga falta subir el tamaño de nada.
 *
 * A la izquierda, el argumento en tres líneas de marginalia: lo que hace el
 * proveedor y lo que hacemos nosotros. No son "features" con icono: son las
 * reglas del trato, en el mismo mono con el que la home escribe sus datos.
 *
 * ⚠️ SIN CABLEAR — el formulario todavía no envía nada: `useLeadPrototype`
 * finge el ciclo y muestra el acuse sin guardar la solicitud. Antes de que
 * esta home salga a producción hay que sustituirlo por una Server Action con
 * Zod que persista el lead (o lo mande por Resend); si no, el proveedor cree
 * que se apuntó y nadie recibe nada.
 */
export function SupplierCtaBand() {
  const { status, onSubmit } = useLeadPrototype();

  return (
    <section
      id="supplier"
      aria-labelledby="supplier-band-title"
      className="bg-canvas px-gutter py-section-md scroll-mt-24"
    >
      <div className="gap-grid flex flex-col lg:flex-row lg:items-start lg:justify-between">
        {/* Argumento */}
        <div className="max-w-[46ch]">
          <h2
            id="supplier-band-title"
            className="text-foreground-inverse text-display-2"
          >
            ¿Y si el proveedor eres tú?
          </h2>
          <p className="text-canvas-foreground text-body-lg mt-5">
            Solaris no vende paneles: los pone donde los buscan. Si armas kits o
            instalas en Cuba, aquí te llega gente que ya sabe qué quiere y en
            qué provincia lo necesita.
          </p>

          <ul className="text-canvas-foreground text-marginalia mt-10 font-mono">
            {[
              "publicas tus productos y tus kits",
              "decides en qué provincias trabajas",
              "el cobro y la factura los llevamos nosotros",
            ].map((rule) => (
              <li
                key={rule}
                className="border-canvas-foreground/25 border-t py-3 last:border-b"
              >
                {rule}
              </li>
            ))}
          </ul>
        </div>

        {/* Solicitud */}
        <div className="bg-card text-card-foreground w-full shrink-0 rounded-md p-8 lg:max-w-md">
          {status === "sent" ? (
            <SentNotice />
          ) : (
            <form onSubmit={onSubmit} noValidate={false}>
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
                {status === "sending" ? "Enviando…" : "Quiero vender en Solaris"}
              </Button>

              <p className="text-muted-foreground text-marginalia mt-4 font-mono">
                el alta la hacemos a mano, una por una
              </p>
            </form>
          )}
        </div>
      </div>
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
