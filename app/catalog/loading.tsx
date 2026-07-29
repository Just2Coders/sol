import { CatalogSkeleton } from "@/components/catalog/catalog-skeleton";

/**
 * Esqueleto de la primera carga del catálogo. Los cambios de filtro no pasan
 * por aquí: van dentro de una transición, así que la grilla vieja se queda en
 * pantalla hasta que llega la nueva.
 *
 * El título no se finge: es estático, así que se dibuja tal cual y solo se
 * esperan la barra y la grilla.
 */
export default function CatalogLoading() {
  return (
    <main aria-busy className="min-h-0 flex-1 overflow-y-auto">
      <section className="px-gutter pt-section-sm pb-section-md">
        <h1 className="text-foreground text-display-1">Catálogo</h1>
      </section>

      <CatalogSkeleton />
    </main>
  );
}
