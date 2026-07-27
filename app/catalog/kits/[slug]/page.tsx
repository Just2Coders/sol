import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { CatalogGallery } from "@/components/catalog/catalog-gallery";
import { CatalogPurchasePanel } from "@/components/catalog/catalog-purchase-panel";
import { catalogItemHref } from "@/lib/catalog/filters";
import { getCatalogKit, type CatalogKitItem } from "@/lib/catalog/queries";
import { formatUsd } from "@/lib/utils";

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

// Los centavos se cierran por línea: el precio se guarda en numeric(10,2).
function lineTotalUsd(item: CatalogKitItem): number {
  return Math.round(item.unitPriceUsd * item.quantity * 100) / 100;
}

export default async function KitPage({ params }: KitPageProps) {
  const kit = await getCatalogKit((await params).slug);
  if (!kit) notFound();

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
        <CatalogGallery images={kit.images} alt={kit.name} />

        <div>
          <p className="text-muted-foreground text-marginalia font-mono">
            kit · {kit.supplier.name}
          </p>
          <h1 className="text-foreground text-display-2 mt-3">{kit.name}</h1>

          {kit.description && (
            <p className="text-muted-foreground text-body-lg mt-6 max-w-[52ch]">
              {kit.description}
            </p>
          )}

          <div className="mt-8">
            <CatalogPurchasePanel
              priceUsd={kit.priceUsd}
              supplier={kit.supplier}
              note={
                kit.savingsUsd > 0 ? (
                  <p className="text-success text-marginalia font-mono">
                    ahorras {formatUsd(kit.savingsUsd)} frente a comprarlo
                    suelto
                  </p>
                ) : undefined
              }
            />
          </div>

          {kit.items.length > 0 && (
            <section className="mt-12">
              <h2 className="text-muted-foreground text-label font-mono">
                qué incluye
              </h2>
              <ul className="border-border mt-4 border-t">
                {kit.items.map((item) => (
                  <li
                    key={item.productId}
                    className="border-border flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b py-3"
                  >
                    <span className="text-foreground text-body">
                      {item.productActive ? (
                        <Link
                          href={catalogItemHref("PRODUCT", item.productSlug)}
                          className="underline-offset-4 hover:underline"
                        >
                          {item.productName}
                        </Link>
                      ) : (
                        item.productName
                      )}
                      <span className="text-muted-foreground text-data ml-3 font-mono">
                        ×{item.quantity}
                      </span>
                    </span>
                    <span className="text-muted-foreground text-data font-mono">
                      {formatUsd(lineTotalUsd(item))}
                    </span>
                  </li>
                ))}
              </ul>

              {/* La suma de las piezas sueltas: es lo que justifica el precio
                  del kit, así que se enseña aunque no haya ahorro. */}
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3">
                <span className="text-muted-foreground text-body-sm">
                  Comprando cada pieza por separado
                </span>
                <span className="text-muted-foreground text-data font-mono">
                  {formatUsd(kit.itemsTotalUsd)}
                </span>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
