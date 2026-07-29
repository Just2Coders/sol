import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "reicon-react";

import { CatalogGallery } from "@/components/catalog/catalog-gallery";
import { CatalogPurchasePanel } from "@/components/catalog/catalog-purchase-panel";
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

  // El scroll es de la página, no del documento: el header del catálogo se
  // queda arriba mientras se recorre la ficha (ver app/catalog/layout.tsx).
  return (
    <main className="px-gutter py-section-sm min-h-0 flex-1 overflow-y-auto">
      <Link
        href="/catalog"
        className="text-muted-foreground hover:text-foreground text-label ease-standard inline-flex items-center gap-2 font-mono transition-colors duration-base"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        volver al catálogo
      </Link>

      <div className="lg:gap-grid mt-10 grid gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <CatalogGallery images={product.images} alt={product.name} />

        <div>
          <p className="text-muted-foreground text-marginalia font-mono">
            producto · {product.supplier.name}
          </p>
          <h1 className="text-foreground text-display-2 mt-3">{product.name}</h1>

          {product.description && (
            <p className="text-muted-foreground text-body-lg mt-6 max-w-[52ch]">
              {product.description}
            </p>
          )}

          <div className="mt-8">
            <CatalogPurchasePanel
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
              supplier={product.supplier}
              note={
                product.stock > 0 ? (
                  <p className="text-success text-marginalia font-mono">
                    en stock · {product.stock}{" "}
                    {product.stock === 1 ? "unidad" : "unidades"}
                  </p>
                ) : (
                  <p className="text-warning text-marginalia font-mono">
                    sin stock ahora mismo
                  </p>
                )
              }
            />
          </div>

          {specs.length > 0 && (
            <section className="mt-12">
              <h2 className="text-muted-foreground text-label font-mono">
                ficha técnica
              </h2>
              <dl className="border-border mt-4 border-t">
                {specs.map(([key, value]) => (
                  <div
                    key={key}
                    className="border-border flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b py-3"
                  >
                    <dt className="text-muted-foreground text-body-sm">
                      {key}
                    </dt>
                    <dd className="text-foreground text-data font-mono">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
