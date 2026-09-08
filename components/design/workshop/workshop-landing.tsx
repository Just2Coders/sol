import Image from "next/image";
import Link from "next/link";

import { CartPanel } from "@/components/cart/cart-panel";
import { FlatCta } from "@/components/design/shared/flat-cta";
import { KitCard, type KitCardTone } from "@/components/design/shared/kit-card";
import { KitRail } from "@/components/design/shared/kit-rail";
import { LeadForm } from "@/components/design/shared/lead-form";
import { PhotoSlot } from "@/components/design/shared/photo-slot";
import { ProvinceMap, type MapTone } from "@/components/design/shared/province-map";
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
 * VARIANTE B — "Taller".
 *
 * La apuesta contraria a Terroir: todo el texto en el casi negro del sistema y
 * un único acento hipersaturado —`primary-loud`, creado para esto— reservado en
 * exclusiva a la acción. Aparece dos veces por pantalla como mucho: el CTA y el
 * chip del kit marcado. En ningún otro sitio. Ese racionamiento es lo que hace
 * que el naranja funcione como señal en vez de como decoración.
 *
 * El fondo cambia en cada frontera de sección —crema, lienzo, muted, secundario,
 * accent— así que el ritmo no lo marca el espacio en blanco sino el corte de
 * superficie. Y la escala está congelada: el hero a `display-2` y **todos** los
 * titulares de sección a `display-3`, sin excepción. La página no vuelve a
 * cambiar de tamaño en ningún momento.
 *
 * Riesgo asumido: con cinco fondos y un naranja de ese volumen, la página se
 * parece más a un taller gráfico que a un sitio donde se gastan $2,760. La
 * calidez de la marca se paga en frialdad.
 */

const LABEL = "text-marginalia font-mono tracking-mono-tight text-muted-foreground";
const SECTION_TITLE = "text-display-3";

const MAP_TONE: MapTone = {
  available: "fill-canvas hover:fill-primary-loud",
  selected: "fill-primary-loud",
  empty: "fill-background",
  swatches: ["bg-canvas", "bg-primary-loud", "bg-background"],
  stroke: "stroke-secondary",
  chrome: "text-foreground/70",
  line: "border-foreground/20",
};

const CARD_TONE: KitCardTone = {
  photo: "aspect-[4/3] bg-background border-foreground/25 text-foreground/60",
  bar: "bg-canvas text-foreground-inverse",
  chip: "bg-primary-loud text-primary-loud-foreground",
  meta: "bg-canvas text-canvas-foreground",
  line: "border-canvas-foreground/30",
  body: "text-muted-foreground",
  cta: "loud",
};

export function WorkshopLanding({
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
    <header className="bg-background px-gutter py-header flex items-center justify-between">
      <Link href="/" className="leading-tight">
        <span className="text-heading-3 block font-bold">solaris</span>
        <span className={cn(LABEL, "block")}>energía · cuba</span>
      </Link>

      <nav className="flex items-center gap-8">
        {[
          { label: "Kits", href: "/catalog?type=kit" },
          { label: "Panel admin", href: "/admin" },
          { label: "Mi cuenta", href: "/account" },
        ].map((link) => (
          <Link key={link.href} href={link.href} className={cn(LABEL, "hidden sm:block")}>
            {link.label}
          </Link>
        ))}
        <CartPanel className="text-muted-foreground hover:text-foreground" />
        {/* La acción del header no es la del hero: aquí se manda al mapa. */}
        <FlatCta href="#zones" tone="loud" className="hidden px-8 pt-3 pb-2.5 md:inline-flex">
          Escoge tu provincia
        </FlatCta>
      </nav>
    </header>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="bg-background pb-section-md grid grid-cols-1 items-center gap-12 md:grid-cols-2">
      <div className="px-gutter">
        <p className={LABEL}>kit-01 · 3.2 kWh · respaldo 8 h</p>
        <h1 className="text-display-2 mt-6 max-w-[13ch]">
          El sol ya trabaja para tu casa.
        </h1>
        <p className="text-body-lg text-muted-foreground mt-6 max-w-[44ch]">
          Kits solares de proveedores confiables, armados para casas y negocios
          cubanos. Compara, escoge y coordina la instalación en tu provincia.
        </p>
        <FlatCta href="/catalog?type=kit" tone="loud" className="mt-10">
          Explora los kits
        </FlatCta>
        <p className={cn(LABEL, "mt-6")}>instalación en 14 provincias</p>
      </div>

      {/* La foto sale por el borde derecho: es lo único que cruza el gutter en
          esta mitad de la página, y el carril de kits repite el gesto abajo. */}
      <div className="relative h-[52vh] min-h-[360px] w-full">
        <Image
          src="/images/hero-home.jpg"
          alt="Casa cubana al atardecer con paneles solares en el techo y un kit de energía instalado en la pared"
          fill
          priority
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-cover object-[60%_center]"
        />
      </div>
    </section>
  );
}

// ─── Confianza ───────────────────────────────────────────────────────────────

function Trust({ covered }: { covered: number }) {
  return (
    // Centrada: es la única sección de la página que lo está, y por eso se lee
    // como un alto en el camino antes de enseñar precios.
    <section className="bg-canvas text-foreground-inverse px-gutter py-section-md">
      <div className="mx-auto max-w-[52ch] text-center">
        <p className="text-marginalia tracking-mono-tight text-canvas-foreground font-mono">
          {PLACEHOLDER_NOTICE}
        </p>
        <h2 className={cn(SECTION_TITLE, "mt-6")}>¿Quién te lo instala?</h2>
        <p className="text-body-lg text-canvas-foreground mt-6">
          Ningún kit lo monta Solaris. Lo monta alguien que vive donde vives tú,
          y aquí está su nombre antes de que pagues nada.
        </p>
      </div>

      <div className="mx-auto mt-16 flex max-w-4xl flex-wrap justify-center gap-x-24 gap-y-8 text-center">
        <Count value={PLACEHOLDER_KITS_COUNT.value} label={PLACEHOLDER_KITS_COUNT.label} />
        <Count value={String(covered)} label="provincias con proveedor" />
      </div>

      <PhotoSlot
        label={PLACEHOLDER_PHOTO}
        className="border-canvas-foreground/50 text-canvas-foreground mx-auto mt-16 aspect-[16/7] w-full max-w-4xl justify-center"
      />

      <ul className="mx-auto mt-16 max-w-4xl">
        {PLACEHOLDER_SUPPLIERS.map((supplier) => (
          <li
            key={supplier.name}
            className="border-canvas-foreground/25 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-1 border-t py-4 last:border-b"
          >
            <span className="text-heading-3">{supplier.name}</span>
            <span className="text-body-sm text-canvas-foreground">{supplier.province}</span>
            <span className="text-marginalia tracking-mono-tight text-canvas-foreground font-mono">
              {supplier.trade} · {supplier.joined}
            </span>
          </li>
        ))}
      </ul>

      <dl className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-8 sm:grid-cols-3">
        {TRUST_TERMS.map((term) => (
          <div key={term.question}>
            <dt className="text-marginalia tracking-mono-tight text-canvas-foreground font-mono">
              {term.question}
            </dt>
            <dd className="text-body-sm mt-3">
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
      <span className="text-display-3 block">{value}</span>
      <span className="text-marginalia tracking-mono-tight text-canvas-foreground mt-2 block font-mono">
        {label}
      </span>
    </p>
  );
}

// ─── Kits ────────────────────────────────────────────────────────────────────

function Kits({ kits }: { kits: KitComparison[] }) {
  return (
    <section className="bg-muted px-gutter py-section-md overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-[46ch]">
          <p className={LABEL}>tres kits</p>
          <h2 className={cn(SECTION_TITLE, "mt-4")}>¿Cuál te hace falta?</h2>
        </div>
        <p className="text-body-lg text-muted-foreground max-w-[42ch]">
          Los tres llevan paneles, inversor, baterías e instalación. Lo que
          cambia es cuánto aguantan cuando se va la luz.
        </p>
      </div>

      <KitRail
        className="mt-14"
        controlClassName="border-foreground/30 text-foreground hover:bg-foreground hover:text-background"
      >
        {kits.map((kit) => (
          <KitCard
            key={kit.slug}
            kit={kit}
            tone={CARD_TONE}
            className="w-[320px] shrink-0 snap-start"
          />
        ))}
      </KitRail>
    </section>
  );
}

// ─── Provincias ──────────────────────────────────────────────────────────────

function Zones({ coverage }: { coverage: ProvinceCoverage[] }) {
  return (
    // Dos columnas: el argumento a la izquierda, la isla ocupando el doble a la
    // derecha. Es la contraria a la sección centrada de arriba.
    <section id="zones" className="bg-secondary px-gutter py-section-md scroll-mt-8">
      <div className="grid grid-cols-1 gap-12 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:items-start">
        <div>
          <p className={cn(LABEL, "text-foreground/60")}>cobertura</p>
          <h2 className={cn(SECTION_TITLE, "mt-4")}>¿Dónde instalas?</h2>
          <p className="text-body text-foreground/75 mt-6 max-w-[38ch]">
            Cada proveedor trabaja su propio territorio. Marca tu provincia y te
            mostramos quién puede llegar hasta tu casa.
          </p>
        </div>

        <ProvinceMap coverage={coverage} tone={MAP_TONE} asideClassName="mt-10" />
      </div>
    </section>
  );
}

// ─── Proveedores ─────────────────────────────────────────────────────────────

function Suppliers() {
  return (
    <section
      id="supplier"
      className="bg-accent text-foreground px-gutter py-section-md scroll-mt-8"
    >
      <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
        <div>
          <p className={cn(LABEL, "text-foreground/60")}>para quien vende</p>
          <h2 className={cn(SECTION_TITLE, "mt-4 max-w-[16ch]")}>
            ¿Y si el proveedor eres tú?
          </h2>
          <p className="text-body-lg text-foreground/75 mt-6 max-w-[44ch]">
            Solaris no vende paneles: los pone donde los buscan. Si armas kits o
            instalas en Cuba, aquí te llega gente que ya sabe qué quiere y en
            qué provincia lo necesita.
          </p>

          {/* Lista con filetes: la tercera forma de componer de la página,
              después de la centrada y las dos columnas. */}
          <ul className="mt-12">
            {[
              "publicas tus productos y tus kits",
              "decides en qué provincias trabajas",
              "el cobro y la factura los llevamos nosotros",
            ].map((rule) => (
              <li
                key={rule}
                className="text-body border-foreground/20 border-t py-4 last:border-b"
              >
                {rule}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className={cn(LABEL, "text-foreground/60")}>alta de proveedor</p>
          <p className={cn(SECTION_TITLE, "mt-4")}>Déjanos tres datos.</p>
          <LeadForm
            idPrefix="workshop"
            className="mt-10 max-w-md"
            tone={{
              label: "text-foreground/60",
              field: "border-foreground/30 text-foreground placeholder:text-foreground/40",
              heading: "text-foreground",
              note: "text-foreground/60",
              submit: "loud",
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
    <footer className="bg-canvas text-foreground-inverse px-gutter pt-section-md pb-6">
      <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
        <div className="max-w-[24ch]">
          <h2 className={SECTION_TITLE}>Compra donde vives.</h2>
          <p className="text-body-lg text-canvas-foreground mt-6">
            Escoge tu provincia y el catálogo se abre ya filtrado: solo lo que
            alguien puede instalarte ahí.
          </p>
          <FlatCta href="/catalog" tone="loud" className="mt-10">
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

      <div className="border-canvas-foreground/25 mt-section-md flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 border-t pt-5">
        <p className="text-marginalia tracking-mono-tight text-canvas-foreground font-mono">
          {covered} provincias con proveedor · el resto, en camino
        </p>
        <p className="text-marginalia tracking-mono-tight text-canvas-foreground font-mono">
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
  links: readonly { label: string; href: string }[];
}) {
  return (
    <div>
      <h3 className="text-marginalia tracking-mono-tight text-canvas-foreground font-mono">
        {title}
      </h3>
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
