import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getProvinceCoverage } from "@/lib/zones/coverage";
import {
  ACCOUNT_LINKS,
  CATALOG_LINKS,
  CONTACT,
  FINE_PRINT,
  SUPPLIER_ANCHOR,
  type FooterLink,
} from "./footer-data";

/**
 * VARIANTE A — "El pie cartel".
 *
 * El pie no cierra la página: la remata. Se va a sangre en el lienzo oscuro,
 * abre con una frase a tamaño de portada y termina con la marca dibujada de
 * margen a margen, que es lo último que queda en pantalla.
 *
 * Entre una cosa y otra, las cuatro columnas de siempre — pero pequeñas y en
 * mono, para que se lean como el pie de un cartel y no compitan con el titular.
 *
 * Cuidado con el orden de la home: hoy la sección de proveedores también es
 * lienzo oscuro, así que la página termina en un bloque oscuro largo. Es una
 * decisión, no un descuido: si no gusta, la sección de proveedores tiene dos
 * variantes claras.
 */
export async function SiteFooterPoster() {
  const coverage = await getProvinceCoverage();
  const provinces = coverage.slice(0, 6);

  return (
    <footer className="bg-canvas px-gutter pt-cta-top pb-8">
      <h2 className="text-foreground-inverse text-display-1 max-w-[16ch]">
        La próxima vez que se vaya la luz, ni te enteras.
      </h2>

      <div className="mt-10 flex flex-wrap items-center gap-4">
        <Button asChild size="lg" className="text-button h-12 px-8">
          <Link href="/catalog?type=kit">Explora los kits</Link>
        </Button>
        <Link
          href="/catalog"
          className="text-canvas-foreground hover:text-foreground-inverse text-body-lg ease-standard underline underline-offset-4 transition-colors"
        >
          o mira el catálogo completo
        </Link>
      </div>

      {/* Columnas */}
      <nav
        aria-label="Pie de página"
        className="border-canvas-foreground/25 gap-grid mt-section-md grid grid-cols-2 gap-y-12 border-t pt-12 md:grid-cols-4"
      >
        <FooterColumn title="catálogo" links={CATALOG_LINKS} />
        <FooterColumn
          title="provincias"
          links={[
            ...provinces.map((province) => ({
              label: province.name,
              href: `/catalog?zone=${province.slug}`,
            })),
            { label: "Ver todas", href: "/catalog" },
          ]}
        />
        <FooterColumn title="cuenta" links={ACCOUNT_LINKS} />
        <FooterColumn
          title="escríbenos"
          links={[
            { label: CONTACT.whatsapp, href: CONTACT.whatsappHref },
            { label: CONTACT.email, href: `mailto:${CONTACT.email}` },
            { label: "¿Eres proveedor?", href: SUPPLIER_ANCHOR },
          ]}
        />
      </nav>

      {/* La marca, dibujada. `textLength` la estira exactamente al ancho del
          viewBox, así que llega a los dos márgenes sin depender de las métricas
          de la fuente ni de un tamaño en píxeles inventado. */}
      <Link
        href="/"
        aria-label="Solaris — volver al inicio"
        className="mt-24 block"
      >
        <svg
          viewBox="0 2 100 16"
          aria-hidden
          className="fill-canvas-foreground hover:fill-foreground-inverse ease-standard w-full transition-colors duration-slow"
        >
          {/* Medidas en unidades del viewBox, como los trazos del mapa: es
              geometría del dibujo, no un rol tipográfico del sistema. */}
          <text
            x="0"
            y="16"
            fontSize={16}
            fontWeight={700}
            textLength="100"
            lengthAdjust="spacingAndGlyphs"
            className="font-sans"
          >
            solaris
          </text>
        </svg>
      </Link>

      <p className="text-canvas-foreground text-marginalia mt-8 font-mono">
        © {new Date().getFullYear()} Solaris · {FINE_PRINT.join(" · ")}
      </p>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: FooterLink[];
}) {
  return (
    <div>
      <h3 className="text-canvas-foreground text-marginalia font-mono">
        {title}
      </h3>
      <ul className="mt-4 flex flex-col gap-3">
        {links.map((link) => (
          <li key={`${link.label}-${link.href}`}>
            <Link
              href={link.href}
              className="text-foreground-inverse text-body-sm underline-offset-4 hover:underline"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
