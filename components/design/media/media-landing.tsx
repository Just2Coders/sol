import Image from "next/image";
import Link from "next/link";

import { CartPanel } from "@/components/cart/cart-panel";
import { FlatCta } from "@/components/design/shared/flat-cta";
import { KitCard, type KitCardTone } from "@/components/design/shared/kit-card";
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
import { ACCOUNT_LINKS, CATALOG_LINKS, CONTACT, FINE_PRINT } from "@/components/landing/footer/footer-data";
import type { KitComparison } from "@/lib/kits/comparison";
import { cn } from "@/lib/utils";
import type { ProvinceCoverage } from "@/lib/zones/coverage";

/**
 * VARIANTE C — "Media".
 *
 * El punto medio que sí toma una decisión: el color se reparte por función en
 * vez de por sección. El cuerpo se queda en el casi negro —que es lo que se
 * lee cómodo en un párrafo de venta— y **todo lo demás** se va a terracota:
 * titulares, cifras, precios, rótulos mono, filetes. El acento deja de ser el
 * botón y pasa a ser la voz tipográfica, sin llegar a teñir la lectura.
 *
 * La escala se queda a medio camino a propósito: hero a `display-2` (68 px, no
 * 96) y secciones a `display-4` (40), con los rótulos mono a +0.18em — justo
 * entre el tracking negativo de una referencia y el +0.7em de la otra. La ficha
 * de kit toma la anatomía de Chapitre; la contención tipográfica, de Dix
 * Hectares.
 *
 * Riesgo asumido: por definición no tiene el gesto extremo de las otras dos. Si
 * se ejecuta sin nervio, es la que se puede confundir con "la landing de
 * siempre, mejor peinada".
 */

const LABEL = "text-marginalia font-mono uppercase tracking-mono-mid text-primary";
const SECTION_TITLE = "text-display-4 text-primary";

const MAP_TONE: MapTone = {
  available: "fill-secondary hover:fill-emphasis",
  selected: "fill-primary",
  empty: "fill-muted",
  swatches: ["bg-secondary", "bg-primary", "bg-muted"],
  stroke: "stroke-background",
  chrome: "text-primary",
  line: "border-border",
};

const CARD_TONE: KitCardTone = {
  photo: "aspect-[4/3] bg-muted border-border-strong text-muted-foreground",
  bar: "text-primary",
  chip: "bg-primary text-primary-foreground",
  meta: "text-primary",
  line: "border-border-strong",
  body: "text-foreground",
  cta: "primary",
};

export function MediaLanding({
  kits,
  coverage,
}: {
  kits: KitComparison[];
  coverage: ProvinceCoverage[];
}) {
  const covered = coverage.filter((zone) => zone.supplierCount > 0).length;

  return (
    <div className="text-foreground">
      <Header />
      <Hero />
      <Trust covered={covered} />
      <Kits kits={kits} />
      <Zones coverage={coverage} />
      <Suppliers />
      <SiteFooter covered={covered} />
    </div>
  );
}

// ─── Chrome ──────────────────────────────────────────────────────────────────

function Header() {
  return (
    <header className="bg-background px-gutter py-header border-border flex items-center justify-between border-b">
      <Link href="/" className="leading-tight">
        <span className="text-heading-3 text-primary block font-bold">solaris</span>
        <span className={cn(LABEL, "block")}>energía · cuba</span>
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
            className="text-nav text-muted-foreground hover:text-primary ease-standard hidden transition-colors duration-base sm:block"
          >
            {link.label}
          </Link>
        ))}
        <CartPanel className="text-muted-foreground hover:text-primary" />
        {/* Distinta del CTA del hero, que va al catálogo: esta manda al mapa. */}
        <FlatCta href="#zones" tone="outline" className="hidden px-8 pt-3 pb-2.5 md:inline-flex">
          Escoge tu provincia
        </FlatCta>
      </nav>
    </header>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="bg-background px-gutter pt-16 pb-section-md">
      <p className={LABEL}>kit-01 · 3.2 kWh · respaldo 8 h</p>

      <div className="mt-8 grid grid-cols-1 items-end gap-10 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <h1 className="text-display-2 text-primary max-w-[13ch]">
          El sol ya trabaja para tu casa.
        </h1>
        <div>
          <p className="text-body-lg max-w-[44ch]">
            Kits solares de proveedores confiables, armados para casas y
            negocios cubanos. Compara, escoge y coordina la instalación en tu
            provincia.
          </p>
          <FlatCta href="/catalog?type=kit" className="mt-8 w-full sm:w-auto">
            Explora los kits
          </FlatCta>
        </div>
      </div>

      <div className="relative mt-12 h-[42vh] min-h-[300px] w-full">
        <Image
          src="/images/hero-home.jpg"
          alt="Casa cubana al atardecer con paneles solares en el techo y un kit de energía instalado en la pared"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[72%_center]"
        />
      </div>

      <p className={cn(LABEL, "mt-4")}>instalación en 14 provincias</p>
    </section>
  );
}

// ─── Confianza ───────────────────────────────────────────────────────────────

function Trust({ covered }: { covered: number }) {
  return (
    // Sobre el lienzo oscuro el terracota se apaga, así que la voz tipográfica
    // sube al énfasis: es el mismo tono, un peldaño más claro.
    <section className="bg-canvas px-gutter py-section-md">
      <div className="mx-auto max-w-[50ch] text-center">
        <p className="text-marginalia tracking-mono-mid text-canvas-foreground font-mono uppercase">
          {PLACEHOLDER_NOTICE}
        </p>
        <h2 className="text-display-4 text-emphasis mt-6">¿Quién te lo instala?</h2>
        <p className="text-body-lg text-foreground-inverse mt-6">
          Ningún kit lo monta Solaris. Lo monta alguien que vive donde vives tú,
          y aquí está su nombre antes de que pagues nada.
        </p>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <PhotoSlot
          label={PLACEHOLDER_PHOTO}
          className="border-canvas-foreground/50 text-canvas-foreground aspect-[4/3]"
        />

        <div>
          <div className="flex flex-wrap gap-x-16 gap-y-6">
            <Count value={PLACEHOLDER_KITS_COUNT.value} label={PLACEHOLDER_KITS_COUNT.label} />
            <Count value={String(covered)} label="provincias con proveedor" />
          </div>

          <ul className="mt-12">
            {PLACEHOLDER_SUPPLIERS.map((supplier) => (
              <li
                key={supplier.name}
                className="border-canvas-foreground/25 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-1 border-t py-4 last:border-b"
              >
                <span className="text-heading-3 text-emphasis">{supplier.name}</span>
                <span className="text-body-sm text-foreground-inverse">
                  {supplier.province}
                </span>
                <span className="text-marginalia tracking-mono-mid text-canvas-foreground font-mono">
                  {supplier.trade} · {supplier.joined}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <dl className="mt-16 grid grid-cols-1 gap-10 sm:grid-cols-3">
        {TRUST_TERMS.map((term) => (
          <div key={term.question} className="border-canvas-foreground/25 border-t pt-5">
            <dt className="text-marginalia tracking-mono-mid text-emphasis font-mono uppercase">
              {term.question}
            </dt>
            <dd className="text-body-sm text-foreground-inverse mt-3">
              {term.answer}
              {term.pending && (
                <span className="text-marginalia text-canvas-foreground mt-2 block font-mono">
                  {term.pending}
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Count({ value, label }: { value: string; label: string }) {
  return (
    <p>
      <span className="text-display-4 text-emphasis block">{value}</span>
      <span className="text-marginalia tracking-mono-mid text-canvas-foreground mt-2 block font-mono uppercase">
        {label}
      </span>
    </p>
  );
}

// ─── Kits ────────────────────────────────────────────────────────────────────

function Kits({ kits }: { kits: KitComparison[] }) {
  return (
    <section className="bg-muted px-gutter py-section-md">
      <div className="flex flex-wrap items-end justify-between gap-8">
        <div>
          <p className={LABEL}>tres kits</p>
          <h2 className={cn(SECTION_TITLE, "mt-4")}>¿Cuál te hace falta?</h2>
        </div>
        <p className="text-body-lg max-w-[42ch]">
          Los tres llevan paneles, inversor, baterías e instalación. Lo que
          cambia es cuánto aguantan cuando se va la luz.
        </p>
      </div>

      {/* Tres fichas fijas, no un carril: aquí la comparación se hace de un
          vistazo y en horizontal, que es como se decide entre tres precios. */}
      <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
        {kits.map((kit) => (
          <KitCard
            key={kit.slug}
            kit={kit}
            tone={CARD_TONE}
            className={cn(
              "border-border-strong border pb-0",
              kit.highlight ? "bg-card" : "bg-background",
            )}
          />
        ))}
      </div>
    </section>
  );
}

// ─── Provincias ──────────────────────────────────────────────────────────────

function Zones({ coverage }: { coverage: ProvinceCoverage[] }) {
  return (
    <section id="zones" className="bg-background px-gutter py-section-md scroll-mt-8">
      {/* Titular alineado a la derecha: ni el de arriba ni el de abajo lo están. */}
      <div className="ml-auto max-w-[46ch] md:text-right">
        <p className={LABEL}>cobertura</p>
        <h2 className={cn(SECTION_TITLE, "mt-4")}>¿Dónde instalas?</h2>
        <p className="text-body-lg mt-5">
          Cada proveedor trabaja su propio territorio. Marca tu provincia y te
          mostramos quién puede llegar hasta tu casa.
        </p>
      </div>

      <ProvinceMap
        coverage={coverage}
        tone={MAP_TONE}
        className="relative mt-14"
        asideClassName="mt-10 md:absolute md:top-0 md:left-0 md:mt-0"
      />
    </section>
  );
}

// ─── Proveedores ─────────────────────────────────────────────────────────────

function Suppliers() {
  return (
    <section id="supplier" className="bg-muted px-gutter py-section-md scroll-mt-8">
      <div className="grid grid-cols-1 gap-12 md:grid-cols-2 md:items-start">
        <div>
          <p className={LABEL}>para quien vende</p>
          <h2 className={cn(SECTION_TITLE, "mt-4 max-w-[16ch]")}>
            ¿Y si el proveedor eres tú?
          </h2>
          <p className="text-body-lg mt-6 max-w-[44ch]">
            Solaris no vende paneles: los pone donde los buscan. Si armas kits o
            instalas en Cuba, aquí te llega gente que ya sabe qué quiere y en
            qué provincia lo necesita.
          </p>

          <ul className="mt-12">
            {[
              "publicas tus productos y tus kits",
              "decides en qué provincias trabajas",
              "el cobro y la factura los llevamos nosotros",
            ].map((rule) => (
              <li key={rule} className="text-body border-border-strong border-t py-4 last:border-b">
                {rule}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-card border-border-strong border p-10">
          <p className={LABEL}>alta de proveedor</p>
          <p className={cn(SECTION_TITLE, "mt-4")}>Déjanos tres datos.</p>
          <LeadForm
            idPrefix="media"
            className="mt-10"
            tone={{
              label: "text-primary",
              field: "border-border-strong text-foreground placeholder:text-muted-foreground",
              heading: "text-primary",
              note: "text-muted-foreground",
              submit: "primary",
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
    <footer className="bg-canvas px-gutter pt-section-md pb-6">
      <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
        <div className="max-w-[24ch]">
          <h2 className="text-display-4 text-emphasis">Compra donde vives.</h2>
          <p className="text-body-lg text-foreground-inverse mt-6">
            Escoge tu provincia y el catálogo se abre ya filtrado: solo lo que
            alguien puede instalarte ahí.
          </p>
          <FlatCta href="/catalog" tone="inverse" className="mt-10">
            Abre el catálogo
          </FlatCta>
        </div>

        <nav aria-label="Pie de página" className="grid grid-cols-2 gap-8 sm:grid-cols-3">
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

      <p className="text-marginalia tracking-mono-mid text-canvas-foreground mt-16 font-mono uppercase">
        {covered} provincias con proveedor · el resto, en camino
      </p>

      {/* El único elemento que se sale del margen en toda la variante, y va al
          final: la marca recortada por los dos bordes cierra la página. */}
      <Wordmark className="text-emphasis mt-4" />

      <p className="text-marginalia border-canvas-foreground/25 text-canvas-foreground mt-6 border-t pt-4 font-mono">
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
      <h3 className="text-marginalia tracking-mono-mid text-emphasis font-mono uppercase">
        {title}
      </h3>
      <ul className="mt-5 flex flex-col gap-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-body-sm text-foreground-inverse underline-offset-4 hover:underline"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
