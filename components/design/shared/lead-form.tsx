"use client";

import { PROVINCES, useLeadPrototype } from "@/components/landing/supplier-cta/prototype-kit";
import { cn } from "@/lib/utils";
import { flatCtaClass, type CtaTone } from "./flat-cta";

/**
 * El alta de proveedor de las exploraciones.
 *
 * Usa el mismo `useLeadPrototype` que la home actual —el envío sigue siendo
 * falso: no hay Server Action ni tabla detrás— pero no monta `Input`/`Select`
 * de la librería: los dos redondean, y en estas variantes el radio 0 es
 * innegociable. Con campos nativos el filete es una sola línea inferior y el
 * formulario deja de parecer un panel de admin dentro de un cartel.
 *
 * ⚠️ SIN CABLEAR — antes de que cualquiera de estas variantes salga a
 * producción hay que sustituirlo por una Action con Zod que persista el lead;
 * hoy el proveedor cree que se apuntó y nadie recibe nada.
 */

export type FormTone = {
  /** Rótulo mono encima del campo. */
  label: string;
  /** El campo: filete inferior, sin radio. */
  field: string;
  /** Titular y cuerpo del acuse. */
  heading: string;
  /** La letra pequeña de debajo del botón. */
  note: string;
  submit: CtaTone;
};

export function LeadForm({
  tone,
  idPrefix,
  className,
}: {
  tone: FormTone;
  /** Las tres variantes pueden convivir en la misma página índice. */
  idPrefix: string;
  className?: string;
}) {
  const { status, draft, onSubmit } = useLeadPrototype();

  if (status === "sent") {
    return (
      <div
        role="status"
        className={cn(
          "animate-in fade-in-0 slide-in-from-bottom-2 duration-slow ease-standard flex min-h-[340px] flex-col justify-center",
          className,
        )}
      >
        <p className={cn("text-heading-2", tone.heading)}>Recibido.</p>
        <p className={cn("text-body mt-3", tone.note)}>
          Te escribimos {draft.business ? `a ${draft.business}` : "al contacto que dejaste"} para
          ver qué vendes y en qué provincias puedes instalar.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={className}>
      <div className="flex flex-col gap-6">
        <Field id={`${idPrefix}-business`} label="negocio o nombre" tone={tone}>
          <input
            id={`${idPrefix}-business`}
            name="business"
            required
            autoComplete="organization"
            placeholder="Solar del Este"
            className={cn("text-body w-full rounded-none border-b bg-transparent py-2 outline-none", tone.field)}
          />
        </Field>

        <Field id={`${idPrefix}-province`} label="provincia" tone={tone}>
          <select
            id={`${idPrefix}-province`}
            name="province"
            required
            defaultValue=""
            className={cn("text-body w-full rounded-none border-b bg-transparent py-2 outline-none", tone.field)}
          >
            <option value="" disabled>
              Escoge una
            </option>
            {PROVINCES.map((province) => (
              <option key={province} value={province}>
                {province}
              </option>
            ))}
          </select>
        </Field>

        <Field id={`${idPrefix}-contact`} label="whatsapp o correo" tone={tone}>
          <input
            id={`${idPrefix}-contact`}
            name="contact"
            required
            placeholder="+53 5 123 4567"
            className={cn("text-body w-full rounded-none border-b bg-transparent py-2 outline-none", tone.field)}
          />
        </Field>
      </div>

      <button
        type="submit"
        disabled={status === "sending"}
        className={flatCtaClass(tone.submit, "mt-10 w-full disabled:opacity-60")}
      >
        {status === "sending" ? "Enviando…" : "Quiero vender en Solaris"}
      </button>

      <p className={cn("text-marginalia mt-4 font-mono", tone.note)}>
        el alta la hacemos a mano, una por una
      </p>
    </form>
  );
}

function Field({
  id,
  label,
  tone,
  children,
}: {
  id: string;
  label: string;
  tone: FormTone;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className={cn("text-marginalia font-mono", tone.label)}>
        {label}
      </label>
      {children}
    </div>
  );
}
