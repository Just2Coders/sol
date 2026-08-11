import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CatalogInstallations } from "@/components/catalog/catalog-installations";
import {
  CatalogDetailAccordion,
  CatalogDetailAccordionRow,
} from "@/components/catalog/detail/detail-accordion";
import { CatalogDetailHead } from "@/components/catalog/detail/detail-head";
import { CatalogDetailShell } from "@/components/catalog/detail/detail-shell";
import { CatalogKitComponents } from "@/components/catalog/detail/kit-components";
import { CatalogSupplierReach } from "@/components/catalog/detail/supplier-block";
// import { CatalogSupplierRelated } from "@/components/catalog/detail/supplier-related";
import { kitPhotos, photographedComponents } from "@/lib/catalog/photos";
import { getCatalogKit } from "@/lib/catalog/queries";

type KitPageProps = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: KitPageProps): Promise<Metadata> {
  const kit = await getCatalogKit((await params).slug);
  if (!kit) return { title: "Kit no encontrado — Solaris" };

  const description =
    kit.description ??
    `${kit.name} de ${kit.supplier.name}: ${kit.items.length} componentes listos para instalar.`;
  const url = `/catalog/kits/${kit.slug}`;

  return {
    title: `${kit.name} — Solaris`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: kit.name,
      description,
      url,
      type: "website",
      images: kit.images.slice(0, 1),
    },
  };
}

export default async function KitPage({ params }: KitPageProps) {
  const kit = await getCatalogKit((await params).slug);
  if (!kit) notFound();

  // La columna de fotos de un kit se arma con las suyas y una por componente:
  // es el inventario visible del conjunto, y el destino del salto desde la
  // lista de la derecha.
  const photos = kitPhotos(kit.images, kit.name, kit.items);

  return (
    <CatalogDetailShell
      photos={photos}
      fallbackAlt={kit.name}
      head={
        <CatalogDetailHead
          kind="kit"
          supplierName={kit.supplier.name}
          name={kit.name}
          priceUsd={kit.priceUsd}
          savingsUsd={kit.savingsUsd}
          item={{
            type: "KIT",
            id: kit.id,
            slug: kit.slug,
            name: kit.name,
            priceUsd: kit.priceUsd,
            image: kit.images[0] ?? null,
            supplierSlug: kit.supplier.slug,
            supplierName: kit.supplier.name,
            // Un kit no lleva stock propio, pero sí un tope: no se pueden
            // pedir más de los que dan sus piezas más escasas.
            stock: kit.available,
          }}
          installations={
            <CatalogInstallations
              installations={kit.installations}
              supplier={kit.supplier}
            />
          }
        />
      }
    >
      {/* Lo que se lee primero llega abierto: qué es y de qué está hecho. Un
          valor que no tenga fila —un kit sin descripción— se ignora solo. */}
      <CatalogDetailAccordion defaultOpen={["description", "components"]}>
        {kit.description && (
          <CatalogDetailAccordionRow value="description" label="Descripción">
            <p className="text-muted-foreground text-body max-w-[60ch]">
              {kit.description}
            </p>
          </CatalogDetailAccordionRow>
        )}

        {kit.items.length > 0 && (
          <CatalogDetailAccordionRow value="components" label="Qué incluye">
            <div className="border-border border-t pt-5">
              <CatalogKitComponents
                items={kit.items}
                photographed={photographedComponents(photos)}
                itemsTotalUsd={kit.itemsTotalUsd}
              />
            </div>
          </CatalogDetailAccordionRow>
        )}

        <CatalogDetailAccordionRow value="scope" label="Alcance">
          <CatalogSupplierReach supplier={kit.supplier} />
        </CatalogDetailAccordionRow>
      </CatalogDetailAccordion>

      {/* Desactivada hasta mejorar su diseño — ver CatalogSupplierRelated. */}
      {/* <CatalogSupplierRelated
        items={related}
        supplierName={kit.supplier.name}
      /> */}
    </CatalogDetailShell>
  );
}
