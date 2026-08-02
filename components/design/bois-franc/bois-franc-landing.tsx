import Image from "next/image";
import Link from "next/link";
import { Menu } from "reicon-react";

import { CartPanel } from "@/components/cart/cart-panel";
import { FlatCta } from "@/components/design/shared/flat-cta";
import { KitCard, type KitCardTone } from "@/components/design/shared/kit-card";
import { KitRail } from "@/components/design/shared/kit-rail";
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

import { FaqAccordion } from "./faq-accordion";

/**
 * VARIANTE D — "Bois-Franc".
 *
 * La apuesta: neutro casi negro para todo el cuerpo y un único acento
 * hipersaturado (`primary-loud`) racionado al CTA y al chip del kit marcado —
 * en ningún otro sitio, ni de decoración. El verde `canvas` que ya usa la home
 * real para "¿Y si el proveedor eres tú?" se extiende aquí también al pie: son
 * la misma superficie, así que cierran juntas sin filete entre medio.
 *
 * A diferencia de Terroir/Taller/Media, la foto del hero no vive separada del
 * titular: la cabecera se pinta encima de la foto, con scrim, igual que hace
 * hoy `components/landing/hero.tsx`. Es la referencia (Chapitre) y es también
 * ya como está resuelta la home real — así que aquí no hay nada que inventar,
 * solo que llevar el resto de la página a la altura de ese gesto.
 *
 * El mapa reutiliza `ProvinceMap` (la misma pieza que usan las otras tres
 * variantes) y el comparador reutiliza `KitCard` + `KitRail` tal cual: la
 * anatomía de ficha "foto arriba, barra oscura, subbarra con filete" ya es la
 * de Chapitre, no hace falta una versión nueva.
 *
 * El FAQ es la única sección sin precedente en las otras variantes — vive en
 * `faq-accordion.tsx` porque es la única pieza con estado propio.
 */

const SECTION_LABEL = "text-marginalia font-mono uppercase tracking-mono-vast text-muted-foreground";

const MAP_TONE: MapTone = {
  available: "fill-support hover:fill-support-strong",
  selected: "fill-primary-loud",
  empty: "fill-muted",
  swatches: ["bg-support", "bg-primary-loud", "bg-muted"],
  stroke: "stroke-background",
  chrome: "text-muted-foreground",
  line: "border-border",
};

const KIT_CARD_TONE: KitCardTone = {
  photo: "bg-muted aspect-[4/3]",
  bar: "bg-foreground text-background",
  chip: "bg-primary-loud text-primary-loud-foreground",
  meta: "bg-foreground text-background/70",
  line: "border-background/15",
  body: "text-foreground",
  cta: "outline",
};

export function BoisFrancLanding({
  kits,
  coverage,
}: {
  kits: KitComparison[];
  coverage: ProvinceCoverage[];
}) {
  const covered = coverage.filter((zone) => zone.supplierCount > 0).length;

  return (
    <div className="bg-background text-foreground">
      <Header />
      <Hero />
      <Zones coverage={coverage} />
      <Comparison kits={kits} />
      <Trust covered={covered} />
      <Suppliers />
      <Faq />
      <SiteFooter covered={covered} />
    </div>
  );
}

// ─── Chrome ──────────────────────────────────────────────────────────────────

function Header() {
  return (
    <header className="px-gutter py-header border-border flex items-center justify-between border-b">
      <button
        type="button"
        className="text-marginalia tracking-mono-mid hidden items-center gap-2 font-mono uppercase sm:flex"
      >
        <Menu aria-hidden className="size-4" />
        Menú
      </button>

      <Link href="/" className="leading-none">
        <span className="text-body-sm block font-bold tracking-[-0.01em]">solaris</span>
        <span className="text-muted-foreground text-marginalia tracking-mono-mid block font-mono">
          energía · cuba
        </span>
      </Link>

      <nav className="flex items-center gap-7">
        <Link
          href="/catalog?type=kit"
          className="text-marginalia tracking-mono-mid hidden font-mono uppercase sm:block"
        >
          Kits
        </Link>
        <CartPanel />
        <FlatCta href="#supplier" tone="loud" className="px-6 pt-3 pb-2.5">
          Vender en Solaris
        </FlatCta>
      </nav>
    </header>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="px-gutter pb-section-sm relative flex h-screen min-h-[640px] flex-col justify-end">
      <Image
        src="/images/hero-home.jpg"
        alt="Casa cubana al atardecer con paneles solares en el techo y un kit de energía instalado en la pared"
        fill
        priority
        sizes="100vw"
        className="object-cover object-[72%_center]"
      />
      <div aria-hidden className="absolute inset-0" style={{ backgroundImage: "var(--scrim-hero)" }} />

      <p className="text-foreground-inverse/80 text-marginalia right-gutter absolute top-[104px] z-10 hidden text-right font-mono md:block">
        kit-01 · 3.2 kWh
        <br />
        respaldo 8 h
      </p>

      <h1 className="text-foreground-inverse text-display-1 relative z-10 max-w-[12ch]">
        El sol ya trabaja para tu casa.
      </h1>
      <p className="text-foreground-inverse/90 text-body-lg relative z-10 mt-5 mb-[30px] max-w-[44ch]">
        Kits solares de proveedores confiables, armados para casas y negocios
        cubanos. Compara, escoge y coordina la instalación en tu provincia.
      </p>
      <div className="relative z-10">
        <FlatCta href="/catalog?type=kit" tone="loud">
          Explora los kits
        </FlatCta>
      </div>

      <p className="text-foreground-inverse/80 text-marginalia right-gutter bottom-section-sm absolute z-10 hidden font-mono md:block">
        instalación en 14 provincias
      </p>
    </section>
  );
}

// ─── Provincias ──────────────────────────────────────────────────────────────

function Zones({ coverage }: { coverage: ProvinceCoverage[] }) {
  return (
    <section id="zones" className="bg-background px-gutter py-section-md scroll-mt-8">
      <div className="mx-auto max-w-[44ch] text-center">
        <p className={SECTION_LABEL}>territorio</p>
        <h2 className="text-display-2 mt-4">¿Dónde instalas?</h2>
        <p className="text-muted-foreground text-body-lg mt-4">
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
    <section className="bg-muted py-section-md scroll-mt-8">
      <div className="px-gutter flex items-end justify-between gap-8">
        <div className="max-w-[52ch]">
          <p className={SECTION_LABEL}>kits disponibles</p>
          <h2 className="text-display-2 mt-4">¿Cuál te hace falta?</h2>
          <p className="text-muted-foreground text-body-lg mt-4">
            Los tres llevan paneles, inversor, baterías e instalación. Lo que
            cambia es cuánto aguantan cuando se va la luz.
          </p>
        </div>
        <FlatCta href="/catalog?type=kit" tone="outline" className="hidden shrink-0 px-6 md:inline-flex">
          Ver todos los kits
        </FlatCta>
      </div>

      <KitRail
        className="px-gutter mt-14"
        controlClassName="border-foreground/25 text-foreground hover:bg-foreground hover:text-background"
      >
        {kits.map((kit) => (
          <KitCard
            key={kit.slug}
            kit={kit}
            tone={KIT_CARD_TONE}
            className="w-[320px] shrink-0 snap-start sm:w-[380px]"
          />
        ))}
      </KitRail>
    </section>
  );
}

// ─── Confianza ───────────────────────────────────────────────────────────────

function Trust({ covered }: { covered: number }) {
  return (
    <section className="bg-background px-gutter py-section-md">
      <div className="gap-grid flex flex-col items-start justify-between md:flex-row">
        <div className="max-w-[46ch]">
          <p className={SECTION_LABEL}>confianza</p>
          <h2 className="text-display-2 mt-4">Gente real, instalando cerca de ti.</h2>
          <p className="text-muted-foreground text-body-lg mt-4">
            Así funciona antes de que un proveedor entre a tu casa.
          </p>
        </div>
        <p className={cn(SECTION_LABEL, "shrink-0")}>{PLACEHOLDER_NOTICE}</p>
      </div>

      <div className="gap-grid mt-14 grid grid-cols-1 md:grid-cols-12">
        <PhotoSlot label={PLACEHOLDER_PHOTO} className="border-border aspect-[4/3] md:col-span-5" />

        <div className="md:col-span-7">
          <ul>
            {PLACEHOLDER_SUPPLIERS.map((supplier) => (
              <li
                key={supplier.name}
                className="border-border flex flex-wrap items-baseline justify-between gap-x-8 gap-y-1 border-t py-4 first:border-t-0 first:pt-0"
              >
                <span className="text-body font-bold">{supplier.name}</span>
                <span className="text-body-sm text-muted-foreground">{supplier.province}</span>
                <span className="text-marginalia text-muted-foreground font-mono">{supplier.trade}</span>
                <span className="text-marginalia text-muted-foreground font-mono">{supplier.joined}</span>
              </li>
            ))}
          </ul>

          <div className="border-border mt-10 flex flex-wrap gap-x-16 gap-y-4 border-t pt-6">
            <Count value={PLACEHOLDER_KITS_COUNT.value} label={PLACEHOLDER_KITS_COUNT.label} />
            <Count value={String(covered)} label="provincias con proveedor" />
          </div>
        </div>
      </div>

      <dl className="gap-grid border-border mt-14 grid grid-cols-1 gap-y-8 border-t pt-10 sm:grid-cols-3">
        {TRUST_TERMS.map((term) => (
          <div key={term.question}>
            <dt className={SECTION_LABEL}>{term.question}</dt>
            <dd className="text-body-sm mt-3">
              {term.answer}
              {term.pending && (
                <span className="text-marginalia text-muted-foreground mt-2 block font-mono opacity-70">
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
      <span className="text-heading-1 block">{value}</span>
      <span className={cn(SECTION_LABEL, "block")}>{label}</span>
    </p>
  );
}

// ─── Proveedores ─────────────────────────────────────────────────────────────

function Suppliers() {
  return (
    <section id="supplier" className="bg-canvas text-foreground-inverse px-gutter py-section-md scroll-mt-8">
      <div className="gap-grid flex flex-col md:flex-row md:items-start md:justify-between">
        <div className="max-w-[46ch]">
          <p className={cn(SECTION_LABEL, "text-canvas-foreground")}>proveedores</p>
          <h2 className="text-display-2 mt-4">¿Y si el proveedor eres tú?</h2>
          <p className="text-canvas-foreground text-body-lg mt-4">
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
              <li key={rule} className="border-canvas-foreground/25 border-t py-3 last:border-b">
                {rule}
              </li>
            ))}
          </ul>
        </div>

        <div className="w-full shrink-0 md:max-w-md">
          <p className={cn(SECTION_LABEL, "text-canvas-foreground")}>alta de proveedor</p>
          <p className="text-heading-2 mt-4">Déjanos tres datos.</p>
          <LeadForm
            idPrefix="bois-franc"
            className="mt-10"
            tone={{
              label: "text-canvas-foreground",
              field: "border-canvas-foreground/40 text-foreground-inverse placeholder:text-canvas-foreground/60",
              heading: "text-foreground-inverse",
              note: "text-canvas-foreground",
              submit: "loud",
            }}
          />
        </div>
      </div>
    </section>
  );
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────

function Faq() {
  return (
    <section className="bg-canvas text-foreground-inverse px-gutter py-section-md border-canvas-foreground/25 border-t">
      <div className="mx-auto max-w-[52ch] text-center">
        <p className={cn(SECTION_LABEL, "text-canvas-foreground")}>preguntas frecuentes</p>
        <h2 className="text-display-2 mt-4">Todo lo que te preguntas.</h2>
        <p className="text-canvas-foreground text-body-lg mt-4">
          Sabemos que mandarle dinero a un desconocido para instalar paneles en
          tu techo suena arriesgado. No lo es.
        </p>
      </div>

      <FaqAccordion className="mx-auto mt-14 max-w-[880px] [&_*]:border-canvas-foreground/25 [&_button]:text-foreground-inverse [&_p]:text-canvas-foreground [&_svg]:text-canvas-foreground" />
    </section>
  );
}

// ─── Pie ─────────────────────────────────────────────────────────────────────

function SiteFooter({ covered }: { covered: number }) {
  return (
    <footer className="bg-canvas text-foreground-inverse px-gutter pt-section-md pb-8">
      <h2 className="text-display-1 max-w-[16ch]">
        La próxima vez que se vaya la luz, ni te enteras.
      </h2>

      <div className="mt-10 flex flex-wrap items-center gap-6">
        <FlatCta href="/catalog?type=kit" tone="loud" className="px-8">
          Explora los kits
        </FlatCta>
        <FlatCta href="#supplier" tone="outline" className="border-canvas-foreground text-canvas-foreground hover:bg-canvas-foreground hover:text-canvas px-8">
          Vender en Solaris
        </FlatCta>
      </div>

      <nav
        aria-label="Pie de página"
        className="border-canvas-foreground/25 gap-grid mt-section-md grid grid-cols-2 gap-y-12 border-t pt-12 md:grid-cols-4"
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
        <div>
          <h3 className="text-canvas-foreground text-marginalia font-mono">mapa-índice</h3>
          <p className="text-foreground-inverse text-body-sm mt-4">
            {covered} provincias con proveedor · el resto, en camino.
          </p>
        </div>
      </nav>

      <Wordmark className="mt-section-md text-canvas-foreground" />

      <p className="text-canvas-foreground text-marginalia border-canvas-foreground/25 mt-8 border-t pt-5 font-mono">
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
      <h3 className="text-canvas-foreground text-marginalia font-mono">{title}</h3>
      <ul className="mt-5 flex flex-col gap-3">
        {links.map((link) => (
          <li key={link.href}>
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
