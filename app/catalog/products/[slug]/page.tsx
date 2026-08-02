import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { List, Shop, Text } from "reicon-react";

import { CatalogInstallations } from "@/components/catalog/catalog-installations";
import {
  CatalogDetailAccordion,
  CatalogDetailAccordionRow,
} from "@/components/catalog/detail/detail-accordion";
import { CatalogDetailHead } from "@/components/catalog/detail/detail-head";
import { CatalogDetailRow } from "@/components/catalog/detail/detail-row";
import { CatalogDetailShell } from "@/components/catalog/detail/detail-shell";
import {
  CatalogSupplierBlock,
  CatalogSupplierCoverage,
} from "@/components/catalog/detail/supplier-block";
import { CatalogSupplierRelated } from "@/components/catalog/detail/supplier-related";
import { itemPhotos } from "@/lib/catalog/photos";
import { getCatalogProduct, getSupplierRelated } from "@/lib/catalog/queries";

type ProductPageProps = { params: Promise<{ slug: string }> };

// El precio y el stock que se enseñan tienen que ser los de ahora mismo.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const product = await getCatalogProduct((await params).slug);
  if (!product) return { title: "Producto no encontrado — Solaris" };

  const description =
    product.description ??
    `${product.name} de ${product.supplier.name}, disponible en Solaris.`;
  const url = `/catalog/products/${product.slug}`;

  return {
    title: `${product.name} — Solaris`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: product.name,
      description,
      url,
      type: "website",
      images: product.images.slice(0, 1),
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const product = await getCatalogProduct((await params).slug);
  if (!product) notFound();

  // Lo demás del proveedor. Necesita su slug, así que va detrás de la ficha;
  // es una sola lectura corta y ya cacheada.
  const related = await getSupplierRelated(product.supplier.slug, {
    type: "PRODUCT",
    slug: product.slug,
  });

  const specs = Object.entries(product.specs);
  const photos = itemPhotos(product.images, product.name);

  return (
    <CatalogDetailShell
      photos={photos}
      fallbackAlt={product.name}
      footer={<CatalogSupplierCoverage supplier={product.supplier} />}
      head={
        <CatalogDetailHead
          kind="producto"
          supplierName={product.supplier.name}
          name={product.name}
          priceUsd={product.priceUsd}
          item={{
            type: "PRODUCT",
            id: product.id,
            slug: product.slug,
            name: product.name,
            priceUsd: product.priceUsd,
            image: product.images[0] ?? null,
            supplierSlug: product.supplier.slug,
            supplierName: product.supplier.name,
            stock: product.stock,
          }}
        />
      }
    >
      {/* Lo que se lee primero llega abierto: qué es y qué da. Un valor que no
          tenga fila —un producto sin descripción— se ignora solo. */}
      <CatalogDetailAccordion defaultOpen={["description", "specs"]}>
        {product.description && (
          <CatalogDetailAccordionRow
            value="description"
            label="descripción"
            icon={Text}
          >
            <p className="text-muted-foreground text-body max-w-[60ch]">
              {product.description}
            </p>
          </CatalogDetailAccordionRow>
        )}

        <CatalogInstallations
          installations={product.installations}
          supplier={product.supplier}
        />

        {specs.length > 0 && (
          <CatalogDetailAccordionRow
            value="specs"
            label="ficha técnica"
            icon={List}
          >
            <dl className="border-border border-t">
              {specs.map(([key, value], index) => (
                <CatalogDetailRow
                  key={key}
                  term={key}
                  value={value}
                  last={index === specs.length - 1}
                />
              ))}
            </dl>
          </CatalogDetailAccordionRow>
        )}

        <CatalogDetailAccordionRow
          value="supplier"
          label="proveedor"
          icon={Shop}
        >
          <CatalogSupplierBlock supplier={product.supplier} />
        </CatalogDetailAccordionRow>
      </CatalogDetailAccordion>

      <CatalogSupplierRelated
        items={related}
        supplierName={product.supplier.name}
      />
    </CatalogDetailShell>
  );
}
