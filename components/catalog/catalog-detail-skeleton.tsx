/**
 * Silueta de una ficha: la columna de fotos y la de datos, con la misma retícula
 * y el mismo reparto que la página real.
 *
 * Existe porque el `loading.tsx` del catálogo envuelve también a sus hijos: sin
 * esto, entrar a un producto enseñaba el título "Catálogo" y una grilla de celdas
 * que no van a llegar. La geometría se copia de `detail-shell.tsx`; si cambia el
 * reparto de columnas o el de sus tres regiones, cambia aquí.
 */
export function CatalogDetailSkeleton() {
  return (
    <main
      aria-busy
      className="min-h-0 flex-1 overflow-y-auto lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:overflow-hidden"
    >
      <div className="bg-muted aspect-[4/5] animate-pulse lg:aspect-auto lg:h-full" />

      <div className="bg-card border-border flex min-h-0 flex-col border-t lg:h-full lg:border-t-0">
        {/* La cabecera fija: qué es, cómo se llama, cuánto cuesta y el botón.
            El hueco se reserva entero para que al llegar no empuje nada. */}
        <div className="lg:px-gutter shrink-0 px-6 pt-6 pb-9 lg:pt-8 lg:pb-12">
          <div className="bg-muted h-3 w-32 animate-pulse rounded-md" />
          <div className="bg-muted mt-3 h-10 w-4/5 animate-pulse rounded-md" />
          <div className="bg-muted mt-5 h-8 w-32 animate-pulse rounded-md" />

          <div className="mt-7 flex items-center gap-3">
            <div className="bg-muted h-8 w-28 animate-pulse rounded-md" />
            <div className="bg-muted h-9 flex-1 animate-pulse rounded-md" />
          </div>
        </div>

        {/* Las secciones plegadas: una fila por cosa, solo el rótulo. */}
        <div className="border-border-strong flex-1 border-t">
          {[0, 1, 2, 3].map((row) => (
            <div
              key={row}
              className="border-border-strong lg:px-gutter flex items-center justify-between border-b px-6 py-5"
            >
              <div className="bg-muted h-3 w-24 animate-pulse rounded-md" />
              <div className="bg-muted size-3 animate-pulse rounded-md" />
            </div>
          ))}
        </div>

        {/* El pie fijo: hasta dónde llega el proveedor. */}
        <div className="border-border-strong lg:px-gutter shrink-0 border-t px-6 py-4">
          <div className="bg-muted h-3 w-52 animate-pulse rounded-md" />
        </div>
      </div>
    </main>
  );
}
