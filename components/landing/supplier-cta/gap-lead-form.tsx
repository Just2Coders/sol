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
 * El formulario de la variante C. Vive aparte porque la sección que lo envuelve
 * es un Server Component: necesita leer la cobertura para saber qué provincias
 * pintar encendidas.
 *
 * Los campos van sin caja alrededor: la banda ya es una superficie distinta, y
 * meter una tarjeta encima sería una caja dentro de otra.
 */
export function GapLeadForm() {
  const { status, draft, onSubmit } = useLeadPrototype();

  if (status === "sent") {
    return (
      <div
        role="status"
        className="animate-in fade-in-0 slide-in-from-bottom-2 duration-slow ease-standard"
      >
        <p className="text-foreground text-heading-1">Anotado.</p>
        <p className="text-muted-foreground text-marginalia mt-3 font-mono">
          {draft.province || "tu provincia"} · te escribimos al contacto que
          dejaste
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <p className="text-muted-foreground text-marginalia font-mono">
        alta de proveedor
      </p>
      <p className="text-foreground text-heading-2 mt-2">
        Dinos dónde trabajas.
      </p>

      <div className="mt-8 flex flex-col gap-5">
        <GapField htmlFor="gap-province" label="provincia">
          <Select name="province" required>
            <SelectTrigger
              id="gap-province"
              className="border-input bg-card text-body h-12 w-full rounded-md px-4"
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
        </GapField>

        <GapField htmlFor="gap-business" label="negocio o nombre">
          <Input
            id="gap-business"
            name="business"
            required
            autoComplete="organization"
            placeholder="Solar del Este"
            className="bg-card text-body h-12 rounded-md px-4"
          />
        </GapField>

        <GapField htmlFor="gap-contact" label="whatsapp o correo">
          <Input
            id="gap-contact"
            name="contact"
            required
            placeholder="+53 5 123 4567"
            className="bg-card text-body h-12 rounded-md px-4"
          />
        </GapField>
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={status === "sending"}
        className="text-button mt-8 h-12 w-full sm:w-auto sm:px-8"
      >
        {status === "sending" ? "Enviando…" : "Quiero ser proveedor"}
      </Button>
    </form>
  );
}

function GapField({
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
