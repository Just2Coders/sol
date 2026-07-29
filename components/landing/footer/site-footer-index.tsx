import Link from "next/link";
import { ArrowRight } from "reicon-react";

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
 * VARIANTE C — "El pie índice".
 *
 * Sin cambiar de fondo y sin subir la voz: el pie es una página de índice.
 * Abre con una única franja enlazada de margen a margen —la llamada es una
 * línea de texto del tamaño de un titular, no un botón— y sigue con las
 * columnas y, al final, las provincias escritas seguidas como un colofón.
 *
 * Es el más denso de los tres y el que más enlaces reales pone a mano: bueno
 * para quien ya está decidido y para lo que un buscador lee al final de la
 * página.
 */
export async function SiteFooterIndex() {
  const coverage = await getProvinceCoverage();

  return (
    <footer className="px-gutter pt-section-md pb-8">
      {/* La llamada es la franja entera: se pulsa en cualquier punto del ancho.
          La flecha avanza al pasar por encima — el único movimiento del pie. */}
      <Link
        href="/catalog?type=kit"
        className="border-border group hover:bg-muted ease-standard flex items-center justify-between gap-6 border-y py-12 transition-colors duration-slow"
      >
        <span className="text-foreground text-display-2">
          Explora los kits
        </span>
        <ArrowRight
          aria-hidden
          className="text-primary ease-standard size-8 shrink-0 transition-transform duration-slow group-hover:translate-x-2"
        />
      </Link>

      <div className="gap-grid mt-section-md grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div>
          <p className="text-foreground text-heading-2 max-w-[24ch]">
            Los que venden solar en Cuba, en un solo sitio y ordenados por
            dónde pueden instalarlo.
          </p>

          <dl className="mt-10 flex flex-col gap-3">
            <ContactRow label="whatsapp">
              <Link
                href={CONTACT.whatsappHref}
                className="text-foreground text-body-sm underline-offset-4 hover:underline"
              >
                {CONTACT.whatsapp}
              </Link>
            </ContactRow>
            <ContactRow label="correo">
              <Link
                href={`mailto:${CONTACT.email}`}
                className="text-foreground text-body-sm underline-offset-4 hover:underline"
              >
                {CONTACT.email}
              </Link>
            </ContactRow>
          </dl>
        </div>

        <nav
          aria-label="Pie de página"
          className="gap-grid grid grid-cols-2 gap-y-12 sm:grid-cols-3"
        >
          <FooterColumn title="catálogo" links={CATALOG_LINKS} />
          <FooterColumn title="cuenta" links={ACCOUNT_LINKS} />
          <FooterColumn
            title="proveedores"
            links={[
              { label: "Trabaja con nosotros", href: SUPPLIER_ANCHOR },
              { label: "Escríbenos", href: `mailto:${CONTACT.email}` },
            ]}
          />
        </nav>
      </div>

      {/* Colofón: las provincias seguidas, como el índice de un libro. */}
      <div className="border-border mt-section-md border-t pt-8">
        <h3 className="text-muted-foreground text-marginalia font-mono">
          catálogo por provincia
        </h3>
        <p className="text-body-sm mt-4 max-w-[80ch]">
          {coverage.map((province, index) => (
            <span key={province.slug}>
              {index > 0 && (
                <span aria-hidden className="text-muted-foreground">
                  {" · "}
                </span>
              )}
              <Link
                href={`/catalog?zone=${province.slug}`}
                className="text-foreground underline-offset-4 hover:underline"
              >
                {province.name}
              </Link>
            </span>
          ))}
        </p>
      </div>

      <div className="mt-16 flex flex-wrap items-baseline justify-between gap-4">
        <Link href="/" className="text-foreground text-heading-2">
          solaris
        </Link>
        <p className="text-muted-foreground text-marginalia font-mono">
          © {new Date().getFullYear()} Solaris · {FINE_PRINT.join(" · ")}
        </p>
      </div>
    </footer>
  );
}

function ContactRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-4">
      <dt className="text-muted-foreground text-marginalia w-24 shrink-0 font-mono">
        {label}
      </dt>
      <dd>{children}</dd>
    </div>
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
      <h3 className="text-muted-foreground text-marginalia font-mono">
        {title}
      </h3>
      <ul className="mt-4 flex flex-col gap-3">
        {links.map((link) => (
          <li key={`${link.label}-${link.href}`}>
            <Link
              href={link.href}
              className="text-foreground text-body-sm underline-offset-4 hover:underline"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
