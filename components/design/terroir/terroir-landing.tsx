import Image from "next/image";
import Link from "next/link";

import { CartPanel } from "@/components/cart/cart-panel";
import { FlatCta } from "@/components/design/shared/flat-cta";
import { LeadForm } from "@/components/design/shared/lead-form";
import { PhotoSlot } from "@/components/design/shared/photo-slot";
import { ProvinceMap, type MapTone } from "@/components/design/shared/province-map";
import { Wordmark } from "@/components/design/shared/wordmark";
import {
  PLACEHOLDER_KITS_COUNT,
  PLACEHOLDER_NOTICE,
  PLACEHOLDER_PHOTO,
  PLACEHOLDER_SUPPLIERS,
  TRUST_TERMS,
} from "@/components/design/trust-placeholder";
import { CATALOG_LINKS, ACCOUNT_LINKS, CONTACT, FINE_PRINT } from "@/components/landing/footer/footer-data";
import { catalogItemHref } from "@/lib/catalog/filters";
import type { KitComparison } from "@/lib/kits/comparison";
import { cn, formatUsd } from "@/lib/utils";
import type { ProvinceCoverage } from "@/lib/zones/coverage";

/**
 * VARIANTE A — "Terroir".
 *
 * La apuesta: el color cromático es el color del texto. No hay salto de
 * saturación entre el cuerpo y el acento porque el acento *es* el cuerpo —
 * titulares, párrafos, datos y filetes van todos en terracota, y el rol
 * `foreground` no aparece ni una vez en el archivo. Lo que separa las secciones
 * no es el tamaño de la letra sino la superficie que hay debajo: cinco fondos
 * distintos, ninguno repetido dos veces seguidas.
 *
 * Sin tipografía display. El techo es `heading-1`, 32 px, y el titular del hero
 * va ahí, en caja alta y espaciado, en vez de a 96 px. Lo que sostiene la
 * página es el tracking y la retícula, no la escala.
 *
 * Riesgo asumido: sin un salto de tamaño ni un color de acción aislado, la
 * jerarquía descansa entera en el ritmo de superficies. Si el visitante entra a
 * media página, no hay nada que le grite dónde está la acción.
 */

const SECTION_LABEL = "text-marginalia font-mono uppercase tracking-mono-vast";
const PRODUCT_NAME = "text-body uppercase tracking-mono-loud";

const MAP_TONE: MapTone = {
  available: "fill-secondary hover:fill-emphasis",
  selected: "fill-primary",
  empty: "fill-muted",
  swatches: ["bg-secondary", "bg-primary", "bg-muted"],
  stroke: "stroke-card",
  chrome: "text-primary/70",
  line: "border-primary/25",
};

export function TerroirLanding({
  kits,
  coverage,
}: {
  kits: KitComparison[];
  coverage: ProvinceCoverage[];
}) {
  const covered = coverage.filter((zone) => zone.supplierCount > 0).length;

  return (
    <div className="bg-background text-primary">
      <Header />
      <Hero />
      <Trust covered={covered} />
      <Zones coverage={coverage} />
      <Comparison kits={kits} />
      <Suppliers />
      <SiteFooter covered={covered} />
    </div>
  );
}

// ─── Chrome ──────────────────────────────────────────────────────────────────

function Header() {
  return (
    <header className="px-gutter py-header border-primary/20 flex items-center justify-between border-b">
      <Link href="/" className="leading-none">
        <span className={cn(PRODUCT_NAME, "block text-body-sm")}>solaris</span>
        <span className="text-marginalia tracking-mono-mid block font-mono">
          energía · cuba
        </span>
      </Link>

      <nav className="flex items-center gap-8">
        {[
          { label: "Kits", href: "/catalog?type=kit" },
          { label: "Panel admin", href: "/admin" },
          { label: "Mi cuenta", href: "/account" },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-marginalia tracking-mono-mid hidden font-mono uppercase sm:block"
          >
            {link.label}
          </Link>
        ))}
        <CartPanel className="text-primary" />
        {/* No repite el CTA del hero: el header manda al filtro, el hero al catálogo. */}
        <FlatCta href="#zones" tone="outline" className="hidden px-6 pt-3 pb-2.5 md:inline-flex">
          Escoge tu provincia
        </FlatCta>
      </nav>
    </header>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="pt-6">
      <Wordmark />

      {/* La única foto real del proyecto, a sangre y sin scrim: aquí no hay
          texto encima que proteger, así que la imagen se ve entera. */}
      <div className="relative mt-6 h-[46vh] min-h-[320px] w-full">
        <Image
          src="/images/hero-home.jpg"
          alt="Casa cubana al atardecer con paneles solares en el techo y un kit de energía instalado en la pared"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[72%_center]"
        />
      </div>

      <div className="px-gutter gap-grid grid grid-cols-1 py-12 md:grid-cols-12">
        <p className="text-marginalia tracking-mono-mid font-mono md:col-span-3">
          kit-01 · 3.2 kWh
          <br />
          respaldo 8 h
        </p>

        <div className="md:col-span-6">
          <h1 className="text-heading-1 tracking-mono-mid uppercase">
            El sol ya trabaja para tu casa.
          </h1>
          <p className="text-body-sm mt-6 max-w-[46ch]">
            Kits solares de proveedores confiables, armados para casas y
            negocios cubanos. Compara, escoge y coordina la instalación en tu
            provincia.
          </p>
        </div>

        <div className="flex flex-col items-start gap-6 md:col-span-3 md:items-end">
          <FlatCta href="/catalog?type=kit" className="w-full md:w-auto">
            Explora los kits
          </FlatCta>
          <p className="text-marginalia tracking-mono-mid font-mono md:text-right">
            instalación en 14 provincias
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── Confianza ───────────────────────────────────────────────────────────────

function Trust({ covered }: { covered: number }) {
  return (
    <section className="bg-muted px-gutter py-section-md">
      <div className="gap-grid flex flex-col-reverse items-start justify-between md:flex-row">
        <div className="max-w-[40ch]">
          <h2 className="text-heading-2 tracking-mono-mid uppercase">
            ¿Quién te lo instala?
          </h2>
          <p className="text-body-sm mt-4">
            Ningún kit lo monta Solaris. Lo monta alguien que vive donde vives
            tú, y aquí está su nombre antes de que pagues nada.
          </p>
        </div>
        <p className={cn(SECTION_LABEL, "shrink-0")}>{PLACEHOLDER_NOTICE}</p>
      </div>

      <div className="gap-grid mt-14 grid grid-cols-1 md:grid-cols-12">
        <PhotoSlot
          label={PLACEHOLDER_PHOTO}
          className="border-primary/40 aspect-[4/5] md:col-span-4"
        />

        <div className="md:col-span-8">
          {/* Los proveedores, en registro de libro mayor: nombre, provincia,
              oficio y fecha de alta. La antigüedad es la mitad del argumento. */}
          <ul>
            {PLACEHOLDER_SUPPLIERS.map((supplier) => (
              <li
                key={supplier.name}
                className="border-primary/25 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-1 border-t py-4 first:border-t-0 first:pt-0"
              >
                <span className={PRODUCT_NAME}>{supplier.name}</span>
                <span className="text-body-sm">{supplier.province}</span>
                <span className="text-marginalia font-mono">{supplier.trade}</span>
                <span className="text-marginalia font-mono">{supplier.joined}</span>
              </li>
            ))}
          </ul>

          <div className="border-primary/25 mt-10 flex flex-wrap gap-x-16 gap-y-4 border-t pt-6">
            <Count value={PLACEHOLDER_KITS_COUNT.value} label={PLACEHOLDER_KITS_COUNT.label} />
            <Count value={String(covered)} label="provincias con proveedor" />
          </div>

          <dl className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {TRUST_TERMS.map((term) => (
              <div key={term.question} className="border-primary/25 border-t pt-4">
                <dt className={SECTION_LABEL}>{term.question}</dt>
                <dd className="text-body-sm mt-3">
                  {term.answer}
                  {term.pending && (
                    <span className="text-marginalia mt-2 block font-mono opacity-70">
                      {term.pending}
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

function Count({ value, label }: { value: string; label: string }) {
  return (
    <p>
      {/* Ni aquí sube la escala: un dato importante se marca con el rótulo, no
          con el tamaño. Es lo que hace que el precio tampoco tenga que gritar. */}
      <span className="text-heading-2 tracking-mono-mid block">{value}</span>
      <span className={cn(SECTION_LABEL, "block")}>{label}</span>
    </p>
  );
}

// ─── Provincias ──────────────────────────────────────────────────────────────

function Zones({ coverage }: { coverage: ProvinceCoverage[] }) {
  return (
    <section id="zones" className="bg-card px-gutter py-section-md scroll-mt-8">
      {/* Titular centrado: la sección anterior lo llevaba a la izquierda. */}
      <div className="mx-auto max-w-[44ch] text-center">
        <p className={SECTION_LABEL}>cobertura</p>
        <h2 className="text-heading-2 tracking-mono-mid mt-4 uppercase">
          ¿Dónde instalas?
        </h2>
        <p className="text-body-sm mt-4">
          Cada proveedor trabaja su propio territorio. Marca tu provincia y te
          mostramos quién puede llegar hasta tu casa.
        </p>
      </div>

      <ProvinceMap
        coverage={coverage}
        tone={MAP_TONE}
        className="relative mt-14"
        asideClassName="mt-10 md:absolute md:top-0 md:right-0 md:mt-0"
      />
    </section>
  );
}

// ─── Comparador ──────────────────────────────────────────────────────────────

function Comparison({ kits }: { kits: KitComparison[] }) {
  return (
    // Terracota sólido: la única sección donde el texto se invierte. El color
    // que ha sido tinta en toda la página pasa a ser superficie.
    <section className="bg-primary text-card px-gutter py-section-md">
      <div className="ml-auto max-w-[46ch] md:text-right">
        <p className={SECTION_LABEL}>tres kits</p>
        <h2 className="text-heading-2 tracking-mono-mid mt-4 uppercase">
          ¿Cuál te hace falta?
        </h2>
        <p className="text-body-sm mt-4">
          Los tres llevan paneles, inversor, baterías e instalación. Lo que
          cambia es cuánto aguantan cuando se va la luz.
        </p>
      </div>

      {/* En fila, no en columnas: cada kit es un renglón del catálogo, con su
          foto a la izquierda y el precio como un dato más del renglón. */}
      <ul className="mt-14">
        {kits.map((kit) => (
          <li
            key={kit.slug}
            className="border-card/30 gap-grid grid grid-cols-1 items-start border-t py-10 md:grid-cols-12"
          >
            <PhotoSlot
              label={`[foto: ${kit.name.toLowerCase()}]`}
              className="border-card/50 aspect-[3/2] md:col-span-3"
            />

            <div className="md:col-span-4">
              <p className={PRODUCT_NAME}>{kit.name}</p>
              {kit.highlight && (
                <p className={cn(SECTION_LABEL, "mt-2")}>{kit.highlight}</p>
              )}
              <p className="text-body-sm mt-4">{kit.moves}</p>
            </div>

            <p className="text-marginalia font-mono md:col-span-2">
              {kit.backup}
              <br />
              {kit.capacityKwh} kWh
            </p>

            {/* El precio, discreto: mismo tamaño y peso que el resto del
                renglón. Lo que lo hace legible es que está solo en su columna. */}
            <p className="text-body-sm md:col-span-1">{formatUsd(kit.priceUsd)}</p>

            <div className="md:col-span-2">
              <FlatCta
                href={catalogItemHref("KIT", kit.slug)}
                tone="inverse"
                className="w-full px-6"
              >
                Ver el {kit.name.toLowerCase()}
              </FlatCta>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ─── Proveedores ─────────────────────────────────────────────────────────────

function Suppliers() {
  return (
    <section
      id="supplier"
      className="bg-canvas text-card px-gutter py-section-md scroll-mt-8"
    >
      <div className="gap-grid flex flex-col md:flex-row md:items-start md:justify-between">
        <div className="max-w-[42ch]">
          <p className={cn(SECTION_LABEL, "text-canvas-foreground")}>
            para quien vende
          </p>
          <h2 className="text-heading-2 tracking-mono-mid mt-4 uppercase">
            ¿Y si el proveedor eres tú?
          </h2>
          <p className="text-canvas-foreground text-body-sm mt-4">
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
              <li key={rule} className="border-card/25 border-t py-3 last:border-b">
                {rule}
              </li>
            ))}
          </ul>
        </div>

        <div className="w-full shrink-0 md:max-w-md">
          <p className={cn(SECTION_LABEL, "text-canvas-foreground")}>
            alta de proveedor
          </p>
          <p className="text-heading-2 tracking-mono-mid mt-4 uppercase">
            Déjanos tres datos.
          </p>
          <LeadForm
            idPrefix="terroir"
            className="mt-10"
            tone={{
              label: "text-canvas-foreground",
              field: "border-card/40 text-card placeholder:text-canvas-foreground/60",
              heading: "text-card",
              note: "text-canvas-foreground",
              submit: "inverse",
            }}
          />
        </div>
      </div>
    </section>
  );
}

// ─── Pie ─────────────────────────────────────────────────────────────────────

function SiteFooter({ covered }: { covered: number }) {
  return (
    <footer className="bg-background text-primary px-gutter pt-section-md pb-6">
      <div className="gap-grid grid grid-cols-2 sm:grid-cols-4">
        <div className="col-span-2 max-w-[34ch] sm:col-span-1">
          <h2 className="text-heading-2 tracking-mono-mid uppercase">
            Compra donde vives.
          </h2>
          <p className="text-body-sm mt-4">
            Escoge tu provincia y el catálogo se abre ya filtrado: solo lo que
            alguien puede instalarte ahí.
          </p>
        </div>

        <FooterColumn title="catálogo" links={CATALOG_LINKS} />
        <FooterColumn title="cuenta" links={ACCOUNT_LINKS} />
        <FooterColumn
          title="escríbenos"
          links={[
            { label: CONTACT.whatsapp, href: CONTACT.whatsappHref },
            { label: CONTACT.email, href: `mailto:${CONTACT.email}` },
          ]}
        />
      </div>

      <p className="text-marginalia tracking-mono-mid mt-16 font-mono">
        {covered} provincias con proveedor · el resto, en camino
      </p>

      {/* La marca cierra la página igual que la abre: recortada por los dos
          bordes. Es lo último que queda en pantalla. */}
      <Wordmark className="mt-6" />

      <p className="text-marginalia border-primary/25 mt-6 border-t pt-4 font-mono">
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
  links: readonly { label: string; href: string }[];
}) {
  return (
    <div>
      <h3 className={SECTION_LABEL}>{title}</h3>
      <ul className="mt-5 flex flex-col gap-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-body-sm underline-offset-4 hover:underline">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
