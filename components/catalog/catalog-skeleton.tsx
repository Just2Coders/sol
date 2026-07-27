/**
 * Silueta de la barra de filtros y la grilla.
 *
 * La comparten el `loading.tsx` de la ruta (una navegación entrante al
 * catálogo) y el `Suspense` de la página (el título ya está pintado y el cuerpo
 * llega en streaming). Un solo sitio donde cuadrar la silueta con lo real: si
 * la grilla cambia de columnas o la celda de proporción, se toca aquí y las dos
 * esperas siguen midiendo igual.
 */
export function CatalogSkeleton() {
  return (
    <>
      <div className="border-border px-gutter border-y py-4">
        <div className="bg-muted h-10 w-full animate-pulse rounded-md" />
      </div>

      <ul className="bg-border grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <li key={index} className="bg-background">
            <div className="bg-muted aspect-[4/3] animate-pulse" />
            <div className="flex flex-col gap-3 p-6">
              <div className="bg-muted h-5 w-3/4 animate-pulse rounded-md" />
              <div className="bg-muted h-4 w-24 animate-pulse rounded-md" />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
