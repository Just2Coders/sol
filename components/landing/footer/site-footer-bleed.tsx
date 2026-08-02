import Link from "next/link";

import { FlatCta } from "@/components/landing/flat-cta";
import { getProvinceCoverage } from "@/lib/zones/coverage";
import {
  ACCOUNT_LINKS,
  CATALOG_LINKS,
  CONTACT,
  FINE_PRINT,
  type FooterLink,
} from "./footer-data";

/**
 * Pie del sitio.
 *
 * Tres pisos sobre el mismo lienzo de tinta, separados por filetes a sangre:
 * el índice del sitio, la última llamada, y la marca dibujada a escala de
 * cartel. Es el mismo material que la banda de proveedores justo encima, así
 * que las dos secciones cierran juntas como un solo bloque oscuro y lo único
 * que las delimita es la línea.
 *
 * La marca se recorta por los dos bordes y por abajo: ese recorte es la mitad
 * del efecto —si la palabra cupiera entera sería un titular más— y es también
 * lo único de la home que se sale del gutter. Mide en `vw` para que desborde
 * igual a cualquier ancho de pantalla.
 */
export async function SiteFooterBleed() {
  const coverage = await getProvinceCoverage();
  const covered = coverage.filter((zone) => zone.supplierCount > 0).length;

  return (
    <footer className="bg-canvas flex flex-col">
      <div className="px-gutter flex flex-col gap-8 pt-16 pb-12">
        <nav
          aria-label="Pie de página"
          className="grid grid-cols-2 gap-x-16 gap-y-10 md:grid-cols-4"
        >
          <FooterColumn title="catálogo" links={CATALOG_LINKS} />
          <FooterColumn title="cuenta" links={ACCOUNT_LINKS} />
          <FooterColumn
            title="escríbenos"
            links={[
              { label: CONTACT.whatsapp, href: CONTACT.whatsappHref },
              { label: CONTACT.email, href: `mailto:${CONTACT.email}` },
            ]}
          />
          <div className="flex flex-col gap-2.5">
            <h3 className="text-marginalia tracking-mono-lg text-canvas-foreground font-mono uppercase">
              mapa-índice
            </h3>
            <p className="text-data text-canvas-foreground font-mono">
              {covered} provincias con proveedor · el resto, en camino.
            </p>
          </div>
        </nav>

        <div className="border-canvas-foreground flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t pt-6">
          <p className="text-marginalia text-canvas-foreground font-mono">
            © {new Date().getFullYear()} Solaris
          </p>
          <ul className="flex flex-wrap items-center gap-6">
            {FINE_PRINT.map((line) => (
              <li
                key={line}
                className="text-marginalia text-canvas-foreground font-mono"
              >
                {line}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-canvas-foreground px-gutter flex flex-col items-center gap-5 border-t pt-12 pb-14">
        <p className="text-display-3 text-canvas-foreground text-center">
          ¿Listo para dejar el apagón atrás?
        </p>
        <FlatCta href="/catalog?type=kit" className="mt-2">
          Explora los kits
        </FlatCta>
      </div>

      {/* La caja mide 15.3vw de alto y la palabra 26.4vw de cuerpo: la
          proporción es fija, así que el recorte cae siempre en el mismo punto
          de las letras — arriba les corta el aire, abajo la panza. */}
      <div
        aria-hidden
        className="text-canvas-foreground relative h-[15.3vw] overflow-clip"
      >
        <span className="text-wordmark absolute -top-[5.6vw] -left-[7vw] whitespace-nowrap">
          SOLARIS
        </span>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-marginalia tracking-mono-lg text-canvas-foreground font-mono uppercase">
        {title}
      </h3>
      <ul className="flex flex-col gap-3">
        {links.map((link) => (
          <li key={`${link.label}-${link.href}`}>
            <Link
              href={link.href}
              className="text-body-sm text-canvas-foreground underline-offset-4 hover:underline"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
