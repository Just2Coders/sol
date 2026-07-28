"use client";

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
 * VARIANTE B — "La ficha de alta".
 *
 * Sin caja y sin cambiar de fondo: la sección hereda la gramática del
 * comparador de kits —retícula, filetes de 1px y rótulos mono a la izquierda—
 * y la usa para un formulario que se lee como un impreso de alta. El campo no
 * lleva marco propio: la fila *es* el campo, y el valor se escribe a tamaño de
 * titular pequeño, así que lo que el proveedor teclea pesa más que la etiqueta
 * que lo pide.
 *
 * Es la variante sobria: no sube la voz, dignifica al que rellena.
 */
export function SupplierCtaLedger() {
  const { status, draft, onSubmit } = useLeadPrototype();

  return (
    <section
      aria-labelledby="supplier-ledger-title"
      className="px-gutter py-section-md"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <h2
          id="supplier-ledger-title"
          className="text-foreground text-display-2 max-w-[18ch]"
        >
          Vende tus kits sin montar la tienda.
        </h2>
        <p className="text-muted-foreground text-marginalia shrink-0 font-mono md:text-right">
          alta de proveedor
          <br />
          revisión manual, una por una
        </p>
      </div>

      <p className="text-muted-foreground text-body-lg mt-5 max-w-[52ch]">
        El catálogo, el filtro por provincia, el cobro y el cliente ya están
        hechos. Tú pones el equipo y la instalación; nosotros, el resto.
      </p>

      {status === "sent" ? (
        <SentLedger business={draft.business} province={draft.province} />
      ) : (
        <form onSubmit={onSubmit} className="mt-14">
          <LedgerRow htmlFor="ledger-business" label="negocio">
            <Input
              id="ledger-business"
              name="business"
              required
              autoComplete="organization"
              placeholder="Solar del Este"
              className="text-heading-3 focus-visible:ring-ring h-16 rounded-md border-0 bg-transparent px-4 focus-visible:ring-2"
            />
          </LedgerRow>

          <LedgerRow htmlFor="ledger-province" label="provincia">
            <Select name="province" required>
              <SelectTrigger
                id="ledger-province"
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
          </LedgerRow>

          <LedgerRow htmlFor="ledger-contact" label="contacto">
            <Input
              id="ledger-contact"
              name="contact"
              required
              placeholder="+53 5 123 4567 o tu correo"
              className="text-heading-3 focus-visible:ring-ring h-16 rounded-md border-0 bg-transparent px-4 focus-visible:ring-2"
            />
          </LedgerRow>

          <LedgerRow htmlFor="ledger-sells" label="qué vendes" optional>
            <Input
              id="ledger-sells"
              name="sells"
              placeholder="paneles, baterías, instalación…"
              className="text-heading-3 focus-visible:ring-ring h-16 rounded-md border-0 bg-transparent px-4 focus-visible:ring-2"
            />
          </LedgerRow>

          {/* Última fila: el filete de cierre y, en la columna del valor, la
              acción. El botón cae bajo los campos, no bajo los rótulos. */}
          <div className="border-border grid gap-4 border-t pt-8 md:grid-cols-[14rem_minmax(0,1fr)]">
            <div />
            <div className="flex flex-col items-start gap-4 px-4 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="submit"
                size="lg"
                disabled={status === "sending"}
                className="text-button h-12 px-8"
              >
                {status === "sending" ? "Enviando…" : "Enviar solicitud"}
              </Button>
              <p className="text-muted-foreground text-marginalia font-mono">
                estos datos solo los ve el equipo de Solaris
              </p>
            </div>
          </div>
        </form>
      )}
    </section>
  );
}

/**
 * Una fila del impreso: rótulo mono a la izquierda, campo a la derecha. En
 * móvil el rótulo se sube encima del campo — la fila de dos columnas no cabe
 * sin encoger el valor, que es justo lo que no queremos.
 */
function LedgerRow({
  htmlFor,
  label,
  optional,
  children,
}: {
  htmlFor: string;
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="border-border grid items-center gap-1 border-t py-4 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-4">
      <Label
        htmlFor={htmlFor}
        className="text-muted-foreground text-marginalia px-4 font-mono md:px-0"
      >
        {label}
        {optional && <span className="opacity-60">(opcional)</span>}
      </Label>
      {children}
    </div>
  );
}

// El acuse mantiene el filete y el ritmo del impreso: la ficha no desaparece,
// queda sellada.
function SentLedger({
  business,
  province,
}: {
  business: string;
  province: string;
}) {
  return (
    <div
      role="status"
      className="border-border animate-in fade-in-0 slide-in-from-bottom-2 duration-slow ease-standard mt-14 border-t border-b py-12"
    >
      <p className="text-foreground text-heading-1">Solicitud enviada.</p>
      <p className="text-muted-foreground text-marginalia mt-3 font-mono">
        {business || "tu negocio"} · {province || "sin provincia"} · te
        escribimos al contacto que dejaste
      </p>
    </div>
  );
}
