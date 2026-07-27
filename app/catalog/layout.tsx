import { SiteHeader } from "@/components/landing/site-header";
import { getSession } from "@/lib/session";

/**
 * El catálogo no se hojea como un documento: es una pantalla de trabajo. El
 * header es el techo fijo de una columna del alto de la ventana y el scroll
 * ocurre **dentro** de la página, no en el documento — por eso el header no
 * flota (`floating={false}`) y nadie necesita saber cuánto mide para colocarse
 * debajo: basta con ser la siguiente fila.
 *
 * Cada página de aquí abajo se encarga de su propio scroll: la que no declare
 * un contenedor con overflow se quedaría cortada.
 */
export default async function CatalogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <div className="flex h-svh flex-col overflow-hidden">
      <SiteHeader session={session} floating={false} />
      {children}
    </div>
  );
}
