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
    </main>
  );
}
