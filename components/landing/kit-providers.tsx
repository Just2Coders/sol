"use client";

import Link from "next/link";
import { ArrowRight } from "reicon-react";

import type { KitOffer } from "@/lib/kits/offers";
import { formatUsd } from "@/lib/utils";

import { FlatCta } from "./flat-cta";
import { useKitSelection } from "./kit-selection";
import { PhotoHole } from "./photo-hole";
import { SectionHeading } from "./section-heading";

/**
 * "Elige quién te lo instala".
 *
 * La primera sección después del hero ya no compara kits entre sí —eso lo
 * decide el buscador de arriba— sino proveedores del mismo kit. Es el giro que
 * ordena la página: primero qué necesitas, después quién te lo pone.
 *
 * Es el panel que pintan los botones del buscador: el antetítulo, la entradilla
 * y las tres fichas se rehacen enteros al cambiar de kit. Nada de esto pide
 * nada al servidor — las ofertas de los tres kits llegan de una vez con la
 * página y viven en el contexto.
 *
 * Cada ficha es foto + dos barras de tinta cosidas sin aire entre ellas: el
 * nombre arriba y los dos datos que deciden abajo, separados por un filete del
 * color del papel. El enlace se sale de la ficha a propósito, para que no se
 * lea como una tercera barra.
 *
 * ⚠️ Los proveedores son de ejemplo — ver `lib/kits/offers`.
 */
export function KitProviders() {
  const { kit, offers, panelId } = useKitSelection();

  return (
    <section
      id={panelId}
      className="bg-background px-gutter pt-section-lg pb-section-md scroll-mt-8"
    >
      {/* El cambio de kit no mueve el foco ni desplaza la página, así que sin
          esto un lector de pantalla no se entera de que abajo cambió todo. */}
      <p aria-live="polite" className="sr-only">
        Mostrando proveedores de {kit.name}
      </p>

      <SectionHeading
        eyebrow={`resultados · ${kit.name.toLowerCase()}`}
        title="Elige quién te lo instala"
        body={`Mismo ${kit.name.toLowerCase()} — ${kit.capacityKwh} kWh, respaldo ${kit.backup} — ofrecido por distintos proveedores. Comparamos precio, tiempo de respuesta y garantía.`}
        titleClassName="text-display-2"
        action={
          <FlatCta href="/catalog?type=kit" tone="outline" size="md">
            Ver todos los kits
          </FlatCta>
        }
      />

      <ul className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
        {offers.map((offer) => (
          <li key={offer.supplierSlug}>
            <OfferCard offer={offer} kitName={kit.name} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function OfferCard({ offer, kitName }: { offer: KitOffer; kitName: string }) {
  const href = `/catalog?type=kit&supplier=${offer.supplierSlug}`;

  return (
    <article className="flex h-full flex-col">
      <div className="relative">
        <PhotoHole label={offer.photo} className="h-75" />
        {offer.badge && (
          <p className="bg-primary-loud text-primary-loud-foreground text-micro absolute top-4 left-4 px-2.5 py-1.5 font-mono uppercase">
            {offer.badge}
          </p>
        )}
      </div>

      <div className="bg-foreground text-background flex items-center justify-between gap-4 px-5 py-4">
        {/* Negrita sobre el rol de cuerpo a propósito: es el nombre del
            proveedor, no un titular — sube de peso sin subir de tamaño. */}
        <h3 className="text-body font-bold">{offer.supplierName}</h3>
        <p className="text-micro tracking-mono-sm shrink-0 font-mono uppercase">
          {kitName}
        </p>
      </div>

      <div className="bg-foreground text-background border-background flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t px-5 pt-3.5 pb-4.5">
        <p className="text-data font-mono uppercase">
          desde {formatUsd(offer.fromUsd)}
        </p>
        <p className="text-data font-mono">
          {offer.backup} · {offer.capacityKwh} kWh
        </p>
      </div>

      <Link
        href={href}
        className="text-label tracking-mono-sm text-primary-loud hover:text-primary-loud-hover ease-standard mt-auto inline-flex items-center gap-2 pt-3.5 font-mono uppercase transition-colors duration-base"
      >
        Ver este kit
        <ArrowRight aria-hidden className="size-4" />
      </Link>
    </article>
  );
}
