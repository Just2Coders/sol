import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Package, Shop, Text } from "reicon-react";

import { CatalogInstallations } from "@/components/catalog/catalog-installations";
import {
  CatalogDetailAccordion,
  CatalogDetailAccordionRow,
} from "@/components/catalog/detail/detail-accordion";
import { CatalogDetailHead } from "@/components/catalog/detail/detail-head";
import { CatalogDetailShell } from "@/components/catalog/detail/detail-shell";
import { CatalogKitComponents } from "@/components/catalog/detail/kit-components";
import {
  CatalogSupplierBlock,
  CatalogSupplierCoverage,
} from "@/components/catalog/detail/supplier-block";
import { CatalogSupplierRelated } from "@/components/catalog/detail/supplier-related";
import { kitPhotos, photographedComponents } from "@/lib/catalog/photos";
import { getCatalogKit, getSupplierRelated } from "@/lib/catalog/queries";

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

  // Lo demás del proveedor. Se pide después del kit y no en paralelo porque
  // necesita su slug, pero es una sola lectura corta y ya cacheada.
  const related = await getSupplierRelated(kit.supplier.slug, {
    type: "KIT",
    slug: kit.slug,
  });

  // La columna de fotos de un kit se arma con las suyas y una por componente:
  // es el inventario visible del conjunto, y el destino del salto desde la
  // lista de la derecha.
  const photos = kitPhotos(kit.images, kit.name, kit.items);

  return (
    <CatalogDetailShell
      photos={photos}
      fallbackAlt={kit.name}
      footer={<CatalogSupplierCoverage supplier={kit.supplier} />}
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
            // Un kit no lleva stock propio: se arma con lo que haya.
            stock: null,
          }}
        />
      }
    >
      {/* Lo que se lee primero llega abierto: qué es y de qué está hecho. Un
          valor que no tenga fila —un kit sin descripción— se ignora solo. */}
      <CatalogDetailAccordion defaultOpen={["description", "components"]}>
        {kit.description && (
          <CatalogDetailAccordionRow
            value="description"
            label="descripción"
            icon={Text}
          >
            <p className="text-muted-foreground text-body max-w-[60ch]">
              {kit.description}
            </p>
          </CatalogDetailAccordionRow>
        )}

        {kit.items.length > 0 && (
          <CatalogDetailAccordionRow
            value="components"
            label="qué incluye"
            icon={Package}
          >
            <div className="border-border border-t">
              <CatalogKitComponents
                items={kit.items}
                photographed={photographedComponents(photos)}
                itemsTotalUsd={kit.itemsTotalUsd}
              />
            </div>
          </CatalogDetailAccordionRow>
        )}

        <CatalogInstallations
          installations={kit.installations}
          supplier={kit.supplier}
        />

        <CatalogDetailAccordionRow
          value="supplier"
          label="proveedor"
          icon={Shop}
        >
          <CatalogSupplierBlock supplier={kit.supplier} />
        </CatalogDetailAccordionRow>
      </CatalogDetailAccordion>

      <CatalogSupplierRelated
        items={related}
        supplierName={kit.supplier.name}
      />
    </CatalogDetailShell>
  );
}
