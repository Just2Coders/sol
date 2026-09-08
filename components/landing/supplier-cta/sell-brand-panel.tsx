import Link from "next/link";
import { DollarCircle, Invoice } from "reicon-react";

/**
 * La mitad oscura del alta de proveedor (`/sell`): argumento y prueba, no
 * campos. Comparte el lienzo oscuro que ya usa el pie del sitio
 * (`SiteFooterBleed`) — mismo `bg-canvas`, mismo `text-foreground-inverse`
 * para el texto — así que la marca no cambia de voz solo porque cambió de
 * página.
 *
 * La cifra de cobertura y la cita de "cómo se paga" repiten, a propósito,
 * lo que ya dicen `SupplierCtaBand` y `TRUST_TERMS`: a esta página se llega
 * directo, sin haber pasado por la home.
 */
export function SellBrandPanel({ coveredCount }: { coveredCount: number }) {
  return (
    <div className="bg-canvas flex w-full shrink-0 flex-col lg:w-[42%]">
      <div className="border-canvas-foreground/25 flex h-header-bar shrink-0 items-center border-b px-8 lg:px-12">
        <Link href="/" className="flex items-baseline gap-3">
          <span className="text-brand text-foreground-inverse">solaris</span>
          <span className="text-marginalia tracking-mono-md text-foreground-inverse font-mono uppercase">
            energía · cuba
          </span>
        </Link>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-10 px-8 py-12 lg:px-12">
        <div className="flex flex-col gap-4">
          <p className="text-foreground-inverse text-marginalia tracking-mono-lg font-mono uppercase">
            alta de proveedor
          </p>
          <h1 className="text-foreground-inverse text-display-2 max-w-[18ch]">
            Vende tus kits sin montar la tienda.
          </h1>
          <p className="text-foreground-inverse text-body max-w-[38ch]">
            Solaris no vende paneles: te pone delante de quien los busca.
          </p>
        </div>

        <div className="flex items-baseline gap-3">
          <span className="text-foreground-inverse text-display-1">
            {coveredCount}
          </span>
          <span className="text-foreground-inverse text-marginalia tracking-mono-lg max-w-36 font-mono uppercase">
            provincias con proveedor hoy — el resto, libres
          </span>
        </div>

        <ul className="flex flex-col gap-5">
          <ValueRow
            icon={<Invoice aria-hidden className="size-4" />}
            label="Cobro automático, sin perseguir pagos"
            detail="A Solaris, con factura — nunca en efectivo al instalador."
          />
          <ValueRow
            icon={<DollarCircle aria-hidden className="size-4" />}
            label="Clientes que pagan en USD"
            detail="Precios en dólares desde el primer kit que publiques."
          />
        </ul>
      </div>

      <div className="border-canvas-foreground/25 flex flex-col gap-3 border-t px-8 py-8 lg:px-12">
        <p className="text-foreground-inverse text-body-sm max-w-[34ch]">
          &ldquo;A Solaris, con factura — nunca en efectivo al instalador,
          nunca por fuera.&rdquo;
        </p>
        <p className="text-foreground-inverse text-marginalia tracking-mono-lg font-mono uppercase">
          cómo se paga · términos de Solaris
        </p>
      </div>
    </div>
  );
}

function ValueRow({
  icon,
  label,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  detail: string;
}) {
  return (
    <li className="flex items-start gap-3.5">
      <span className="bg-canvas-foreground/10 text-foreground-inverse flex size-8 shrink-0 items-center justify-center rounded-full">
        {icon}
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-foreground-inverse text-body-sm font-medium">
          {label}
        </span>
        <span className="text-foreground-inverse/70 text-caption max-w-[30ch]">
          {detail}
        </span>
      </span>
    </li>
  );
}
