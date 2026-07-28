import Link from "next/link";

import { getProvinceCoverage } from "@/lib/zones/coverage";
import { CUBA_PROVINCES, CUBA_VIEW_BOX } from "../cuba-geometry";
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
 * El mapa vuelve, pero con otro oficio: arriba es el selector con el que el
 * visitante se sitúa, y aquí abajo es el índice del sitio. Cada provincia con
 * proveedor es un enlace directo a su catálogo ya filtrado, así que el pie deja
 * de ser una lista de rótulos y pasa a ser la forma más rápida de entrar.
 *
 * Va sobre el lienzo oscuro, así que el mapa se invierte respecto al de la
 * home: las provincias con proveedor son las claras —lo que se puede pulsar
 * brilla— y las que faltan se quedan en el verde intermedio, presentes pero
 * apagadas. El trazo que las separa es el propio fondo.
 *
 * El mapa es de escritorio. En móvil las provincias pequeñas no se pueden
 * tocar, así que la misma elección baja en forma de lista, igual que hace el
 * selector de la home.
 */
export async function SiteFooterMap() {
  const coverage = await getProvinceCoverage();
  const covered = new Map(
    coverage
      .filter((zone) => zone.supplierCount > 0)
      .map((zone) => [zone.slug, zone.name] as const),
  );

  return (
    // La sección que va justo encima también es lienzo oscuro, así que el
    // cambio de superficie no delimita nada: lo hace este filete a sangre, el
    // único borde de la página que cruza de margen a margen.
    <footer className="bg-canvas border-canvas-foreground/25 px-gutter pt-cta-top border-t pb-8">
      <div className="max-w-[46ch]">
        <h2 className="text-foreground-inverse text-display-2">
          Compra donde vives.
        </h2>
        <p className="text-canvas-foreground text-body-lg mt-5">
          Escoge tu provincia y el catálogo se abre ya filtrado: solo lo que
          alguien puede instalarte ahí.
        </p>
      </div>

      <div className="gap-grid mt-14 grid lg:grid-cols-2 lg:items-start">
        {/* Índice geográfico */}
        <div>
          <svg
            viewBox={CUBA_VIEW_BOX}
            aria-label="Mapa de Cuba: enlaces al catálogo de cada provincia con proveedores"
            className="hidden w-full max-w-lg md:block"
          >
            {CUBA_PROVINCES.map((province) => {
              const name = covered.get(province.slug);

              if (!name) {
                return (
                  <path
                    key={province.slug}
                    d={province.d}
                    aria-hidden
                    className="fill-support-strong stroke-canvas [stroke-linejoin:round] [stroke-width:1.2]"
                  />
                );
              }

              return (
                <a
                  key={province.slug}
                  href={`/catalog?zone=${province.slug}`}
                  aria-label={`Ver el catálogo de ${name}`}
                  className="group outline-none"
                >
                  <path
                    d={province.d}
                    className="fill-canvas-foreground hover:fill-foreground-inverse stroke-canvas ease-standard cursor-pointer transition-[fill] duration-base [stroke-linejoin:round] [stroke-width:1.2] group-focus-visible:stroke-ring group-focus-visible:[stroke-width:2.5]"
                  />
                </a>
              );
            })}
          </svg>

          {/* La misma elección donde el mapa no se puede tocar. */}
          <ul className="grid grid-cols-2 gap-2 md:hidden">
            {[...covered].map(([slug, name]) => (
              <li key={slug}>
                <Link
                  href={`/catalog?zone=${slug}`}
                  className="border-canvas-foreground/25 text-foreground-inverse text-body-sm hover:border-canvas-foreground ease-standard block rounded-md border p-3 transition-colors"
                >
                  {name}
                </Link>
              </li>
            ))}
          </ul>

          <p className="text-canvas-foreground text-marginalia mt-6 font-mono">
            {covered.size} provincias con proveedor · el resto, en camino
          </p>
        </div>

        {/* Índice del sitio */}
        <nav
          aria-label="Pie de página"
          className="gap-grid grid grid-cols-2 gap-y-12 sm:grid-cols-3"
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
        </nav>
      </div>

      {/* Cintillo de cierre: una sola línea de alto. La marca baja a tamaño de
          cuerpo — aquí no vuelve a presentarse, solo firma. */}
      <div className="border-canvas-foreground/25 mt-section-md flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t pt-5">
        <Link href="/" className="text-foreground-inverse text-body">
          solaris
        </Link>
        <p className="text-canvas-foreground text-marginalia font-mono">
          © {new Date().getFullYear()} Solaris · {FINE_PRINT.join(" · ")}
        </p>
      </div>
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
