import type { Metadata } from "next";
import Link from "next/link";

/**
 * Banco de exploraciones de la landing.
 *
 * Tres variantes completas de la home viviendo a la vez, cada una en su ruta,
 * para poder compararlas sin cambiar de rama. Nada de lo que hay aquí toca la
 * home real (`app/page.tsx`): cuando se elija una, se promueve y el resto se
 * borra junto con este directorio.
 *
 * No se indexa: son bocetos con contenido marcador dentro.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const VARIANTS = [
  { href: "/design/terroir", label: "A · Terroir" },
  { href: "/design/workshop", label: "B · Taller" },
  { href: "/design/media", label: "C · Media" },
  { href: "/design/bois-franc", label: "D · Bois-Franc" },
];

export default function DesignLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex-1">
      {children}

      {/* Chrome de la exploración, no de la variante: por eso flota fuera del
          flujo y va en el lienzo oscuro, que no lo confunde con la página. */}
      <nav
        aria-label="Variantes de la landing"
        className="bg-canvas text-canvas-foreground text-marginalia fixed right-4 bottom-4 z-50 flex items-center gap-4 px-4 py-2 font-mono shadow-lg"
      >
        <Link href="/design" className="hover:text-foreground-inverse">
          índice
        </Link>
        {VARIANTS.map((variant) => (
          <Link
            key={variant.href}
            href={variant.href}
            className="hover:text-foreground-inverse"
          >
            {variant.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
