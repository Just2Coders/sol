import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  CatalogDetailAccordion,
  CatalogDetailAccordionRow,
} from "@/components/catalog/detail/detail-accordion";
import { CatalogDetailHead } from "@/components/catalog/detail/detail-head";
import { CatalogDetailShell } from "@/components/catalog/detail/detail-shell";
import { CatalogSupplierReach } from "@/components/catalog/detail/supplier-block";
import { ServicePurchaseBlock } from "@/components/catalog/detail/service-purchase";
// import { CatalogSupplierRelated } from "@/components/catalog/detail/supplier-related";
import type { CartItem } from "@/lib/cart/lines";
import { itemPhotos } from "@/lib/catalog/photos";
import { getCatalogService } from "@/lib/catalog/queries";

type ServicePageProps = { params: Promise<{ slug: string }> };

// El precio que se enseña tiene que ser el de ahora mismo.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: ServicePageProps): Promise<Metadata> {
  const service = await getCatalogService((await params).slug);
  if (!service) return { title: "Servicio no encontrado — Solaris" };

  const description =
    service.description ??
    `${service.name} por ${service.supplier.name}, disponible en Solaris.`;
  const url = `/catalog/services/${service.slug}`;

  return {
    title: `${service.name} — Solaris`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: service.name,
      description,
      url,
      type: "website",
      images: service.images.slice(0, 1),
    },
  };
}

/**
 * La instalación contratada **sola**: quien ya tiene los paneles y solo necesita
 * la mano de obra. Es la misma fila que aparece como añadido en la ficha de un
 * kit o un producto, aquí con su propia página.
 */
export default async function ServicePage({ params }: ServicePageProps) {
  const service = await getCatalogService((await params).slug);
  if (!service) notFound();

  const photos = itemPhotos(service.images, service.name);

  const item: CartItem = {
    type: "SERVICE",
    id: service.id,
    slug: service.slug,
    name: service.name,
    priceUsd: service.priceUsd,
    unitLabel: service.unitLabel,
    image: service.images[0] ?? null,
    supplierSlug: service.supplier.slug,
    supplierName: service.supplier.name,
    // La mano de obra no tiene existencias que agotar.
    stock: null,
  };

  const note = (
    <p className="text-muted-foreground text-marginalia font-mono">
      {service.pricing === "PER_UNIT"
        ? `se cobra por ${service.unitLabel}: elige cuántos`
        : "precio cerrado del trabajo"}
    </p>
  );

  return (
    <CatalogDetailShell
      photos={photos}
      fallbackAlt={service.name}
      head={
        <CatalogDetailHead
          kind={`instalación · ${service.categoryName.toLowerCase()}`}
          supplierName={service.supplier.name}
          name={service.name}
          priceUsd={service.priceUsd}
          unitLabel={service.unitLabel}
          item={item}
          note={note}
          // Vender o explicar lo decide el carrito, que solo el cliente conoce.
          purchase={
            <ServicePurchaseBlock
              item={item}
              equipmentScope={service.equipmentScope}
              supplierName={service.supplier.name}
              note={note}
            />
          }
        />
      }
    >
      {/* Lo que se lee primero llega abierto: qué trabajo es y cómo va la
          visita. Un valor sin fila se ignora solo. */}
      <CatalogDetailAccordion defaultOpen={["description", "visit"]}>
        {service.description && (
          <CatalogDetailAccordionRow value="description" label="Descripción">
            <p className="text-muted-foreground text-body max-w-[60ch]">
              {service.description}
            </p>
          </CatalogDetailAccordionRow>
        )}

        <CatalogDetailAccordionRow value="visit" label="La visita">
          <p className="text-muted-foreground text-body-sm max-w-[60ch]">
            La fecha se coordina contigo después del pago. El trabajo lo hace{" "}
            {service.supplier.name}, dentro de las zonas donde opera.
          </p>
        </CatalogDetailAccordionRow>

        <CatalogDetailAccordionRow value="scope" label="Alcance">
          <CatalogSupplierReach supplier={service.supplier} />
        </CatalogDetailAccordionRow>
      </CatalogDetailAccordion>

      {/* Desactivada hasta mejorar su diseño — ver CatalogSupplierRelated. */}
      {/* <CatalogSupplierRelated
        items={related}
        supplierName={service.supplier.name}
      /> */}
    </CatalogDetailShell>
  );
}
