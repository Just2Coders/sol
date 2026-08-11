import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CatalogInstallations } from "@/components/catalog/catalog-installations";
import {
  CatalogDetailAccordion,
  CatalogDetailAccordionRow,
} from "@/components/catalog/detail/detail-accordion";
import { CatalogDetailHead } from "@/components/catalog/detail/detail-head";
import { CatalogDetailRow } from "@/components/catalog/detail/detail-row";
import { CatalogDetailShell } from "@/components/catalog/detail/detail-shell";
import { CatalogSupplierReach } from "@/components/catalog/detail/supplier-block";
// import { CatalogSupplierRelated } from "@/components/catalog/detail/supplier-related";
import { RestockNotice } from "@/components/catalog/detail/restock-notice";
import { isWatchingProduct } from "@/lib/inventory/queries";
import { isoDay } from "@/lib/inventory/restocks";
import { getSession } from "@/lib/session";
import { itemPhotos } from "@/lib/catalog/photos";
import { getCatalogProduct } from "@/lib/catalog/queries";

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

  const specs = Object.entries(product.specs);
  const photos = itemPhotos(product.images, product.name);

  // Solo se pregunta quién mira si hace falta: agotado y con sesión. Una ficha
  // con existencias no gasta ni una consulta en esto.
  const soldOut = product.available === 0;
  const session = soldOut ? await getSession() : null;
  const watching =
    session != null && (await isWatchingProduct(product.id, session.userId));

  return (
    <CatalogDetailShell
      photos={photos}
      fallbackAlt={product.name}
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
            stock: product.available,
          }}
          // Agotado, la compra deja el sitio a lo único útil que queda decir:
          // si vuelve y si te avisamos.
          purchase={
            soldOut ? (
              <RestockNotice
                restock={product.restock}
                today={isoDay(new Date())}
                watch={{
                  productId: product.id,
                  slug: product.slug,
                  signedIn: session != null,
                  watching,
                }}
              />
            ) : undefined
          }
          installations={
            <CatalogInstallations
              installations={product.installations}
              supplier={product.supplier}
            />
          }
        />
      }
    >
      {/* Lo que se lee primero llega abierto: qué es y qué da. Un valor que no
          tenga fila —un producto sin descripción— se ignora solo. */}
      <CatalogDetailAccordion defaultOpen={["description", "specs"]}>
        {product.description && (
          <CatalogDetailAccordionRow value="description" label="Descripción">
            <p className="text-muted-foreground text-body max-w-[60ch]">
              {product.description}
            </p>
          </CatalogDetailAccordionRow>
        )}

        {specs.length > 0 && (
          <CatalogDetailAccordionRow value="specs" label="Ficha técnica">
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

        <CatalogDetailAccordionRow value="scope" label="Alcance">
          <CatalogSupplierReach supplier={product.supplier} />
        </CatalogDetailAccordionRow>
      </CatalogDetailAccordion>

      {/* Desactivada hasta mejorar su diseño — ver CatalogSupplierRelated. */}
      {/* <CatalogSupplierRelated
        items={related}
        supplierName={product.supplier.name}
      /> */}
    </CatalogDetailShell>
  );
}
