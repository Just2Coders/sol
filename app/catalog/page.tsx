import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, ArrowRight } from "reicon-react";

import { browseWholeCountry } from "@/app/actions/preferences";
import { CatalogCard } from "@/components/catalog/catalog-card";
import { CatalogFilters } from "@/components/catalog/catalog-filters";
import { CatalogSkeleton } from "@/components/catalog/catalog-skeleton";
import { Button } from "@/components/ui/button";
import {
  catalogHref,
  hasNarrowingFilters,
  parseCatalogFilters,
  type CatalogFilters as Filters,
  type RawSearchParams,
} from "@/lib/catalog/filters";
import { getCatalog, type CatalogResult } from "@/lib/catalog/queries";
import { getZonePreference } from "@/lib/zones/preference";
import { getZoneFilterOptions } from "@/lib/zones/queries";

export const metadata: Metadata = {
  title: "Catálogo — Solaris",
  description:
    "Kits solares, equipos sueltos e instalación de proveedores verificados, filtrados por la provincia donde vas a instalar.",
  alternates: { canonical: "/catalog" },
  openGraph: {
    title: "Catálogo — Solaris",
    description:
      "Kits solares, equipos sueltos e instalación de proveedores verificados, filtrados por la provincia donde vas a instalar.",
    url: "/catalog",
    type: "website",
  },
};

// Sin `force-dynamic`: la página ya es dinámica por sí sola (lee la cookie de
// zona y los query params). Declararlo además apagaba el caché de *todo* lo que
// cuelga de la ruta, incluido el árbol de provincias, que no cambia nunca y
// ahora se sirve cacheado por etiqueta desde `lib/zones/queries.ts`.

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;
  // Sin zona en la URL manda la que el visitante eligió antes (cookie).
  const filters = parseCatalogFilters(params, await getZonePreference());

  return (
    // El scroll vive aquí dentro, no en el documento: el header queda arriba
    // fijo y la barra de filtros se ancla en el borde de este contenedor, así
    // que no puede salirse de pantalla por mucho que se baje.
    <main className="min-h-0 flex-1 overflow-y-auto">
      {/* El título ocupa la primera pantalla y se va con el scroll: a partir de
          ahí manda la barra de filtros. */}
      <section className="px-gutter pt-section-sm pb-section-md">
        <h1 className="text-foreground text-display-1">Catálogo</h1>
      </section>

      {/* El título no espera a la base de datos: sale con el primer byte y el
          cuerpo entra en streaming detrás.

          Sin `key`: si la frontera se remontara en cada cambio de filtro se
          vería el esqueleto en vez de la grilla vieja, y lo que se quiere es lo
          contrario — la transición del cliente mantiene los resultados
          anteriores hasta que llegan los nuevos. */}
      <Suspense fallback={<CatalogSkeleton />}>
        <CatalogBody filters={filters} />
      </Suspense>
    </main>
  );
}

async function CatalogBody({ filters }: { filters: Filters }) {
  const [catalog, zones] = await Promise.all([
    getCatalog(filters),
    getZoneFilterOptions(),
  ]);

  return (
    <>
      <CatalogFilters
        filters={filters}
        zones={zones}
        suppliers={catalog.suppliers}
        counts={catalog.counts}
      />

      {catalog.items.length === 0 ? (
        <section className="px-gutter py-section-sm">
          <EmptyState filters={filters} catalog={catalog} />
        </section>
      ) : (
        <>
          {/* Espaciada, no a sangre: la misma anatomía de card que
              `OfferCard` en la home necesita aire alrededor para leerse como
              una ficha y no como una celda de tabla. */}
          <ul className="px-gutter grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {catalog.items.map((item) => (
              <CatalogCard key={`${item.type}-${item.id}`} item={item} />
            ))}
          </ul>

          <Pagination filters={filters} catalog={catalog} />
        </>
      )}
    </>
  );
}

/**
 * Las páginas son enlaces, no botones: el corte lo hace la query (`LIMIT`), así
 * que cada página es una URL de verdad — se comparte, se indexa y el botón
 * atrás funciona, igual que el resto de filtros.
 */
function Pagination({
  filters,
  catalog,
}: {
  filters: Filters;
  catalog: CatalogResult;
}) {
  if (catalog.pageCount <= 1) return null;

  const previous = catalog.page > 1 ? catalog.page - 1 : null;
  const next = catalog.page < catalog.pageCount ? catalog.page + 1 : null;

  return (
    <nav
      aria-label="Paginación del catálogo"
      className="border-border px-gutter flex items-center justify-between gap-4 border-t py-8"
    >
      <p className="text-muted-foreground text-marginalia font-mono">
        página {catalog.page} de {catalog.pageCount}
      </p>

      <div className="flex items-center gap-2">
        <PageLink page={previous} filters={filters} rel="prev">
          <ArrowLeft aria-hidden />
          Anterior
        </PageLink>

        <PageLink page={next} filters={filters} rel="next">
          Siguiente
          <ArrowRight aria-hidden />
        </PageLink>
      </div>
    </nav>
  );
}

/**
 * En el extremo del listado se dibuja un `<button disabled>` de verdad, no un
 * enlace apagado: es lo único que apaga el puntero y baja la opacidad por sí
 * solo, y deja el hueco ocupado para que la fila no salte al llegar al final.
 */
function PageLink({
  page,
  filters,
  rel,
  children,
}: {
  page: number | null;
  filters: Filters;
  rel: "prev" | "next";
  children: React.ReactNode;
}) {
  if (page === null) {
    return (
      <Button variant="outline" disabled>
        {children}
      </Button>
    );
  }

  return (
    <Button asChild variant="outline">
      <Link href={catalogHref({ ...filters, page })} rel={rel}>
        {children}
      </Link>
    </Button>
  );
}

/**
 * El vacío no es uno solo, y cada uno tiene su salida: una provincia que no
 * existe, una sin proveedores todavía, unos filtros demasiado estrechos, una
 * página fuera de rango o un catálogo que aún nadie ha publicado.
 */
function EmptyState({
  filters,
  catalog,
}: {
  filters: Filters;
  catalog: CatalogResult;
}) {
  if (catalog.unknownZone) {
    return (
      <Message
        title="No conocemos esa provincia."
        body="El enlace trae una zona que no existe. Empieza de nuevo desde el catálogo completo."
      >
        <Button asChild variant="outline" size="lg">
          <Link href="/catalog">Ver el catálogo completo</Link>
        </Button>
      </Message>
    );
  }

  if (catalog.suppliers.length === 0 && catalog.zone) {
    return (
      <Message
        title={`Todavía no llegamos a ${catalog.zone.name}.`}
        body="Ningún proveedor instala ahí por ahora. Puedes mirar lo que hay en el resto de la isla mientras tanto."
      >
        {/* Un enlace no bastaría: hay que borrar la zona guardada, o la
            siguiente visita volvería a caer en esta misma pantalla. */}
        <form action={browseWholeCountry}>
          <Button type="submit" variant="outline" size="lg">
            Ver toda la isla
          </Button>
        </form>
      </Message>
    );
  }

  // Hay resultados, pero no en esta página: el enlace se ha quedado viejo o
  // alguien ha escrito el número a mano.
  if (catalog.page > catalog.pageCount) {
    return (
      <Message
        title="Esa página ya no existe."
        body="Quedan menos resultados que cuando se guardó el enlace. Vuelve al principio del listado."
      >
        <Button asChild variant="outline" size="lg">
          <Link href={catalogHref({ ...filters, page: 1 })}>
            Volver a la primera página
          </Link>
        </Button>
      </Message>
    );
  }

  if (!hasNarrowingFilters(filters) && catalog.counts.all === 0) {
    return (
      <Message
        title="Todavía no hay nada publicado."
        body="Los proveedores están cargando sus kits, equipos e instalaciones. Vuelve en unos días."
      />
    );
  }

  return (
    <Message
      title="Nada cumple esos filtros."
      body="Prueba a ensanchar el rango de precio o a quitar el proveedor."
    >
      {hasNarrowingFilters(filters) && (
        <Button asChild variant="outline" size="lg">
          <Link
            href={catalogHref({
              ...filters,
              supplier: null,
              type: null,
              minUsd: null,
              maxUsd: null,
              sort: "suggested",
              page: 1,
            })}
          >
            Limpiar filtros
          </Link>
        </Button>
      )}
    </Message>
  );
}

function Message({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="border-border mt-8 flex flex-col items-start gap-4 rounded-md border border-dashed p-10">
      <h2 className="text-foreground text-heading-2 max-w-[24ch]">{title}</h2>
      <p className="text-muted-foreground text-body max-w-[50ch]">{body}</p>
      {children}
    </div>
  );
}
