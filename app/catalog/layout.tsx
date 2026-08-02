import { SiteHeader } from "@/components/landing/site-header";
import { getSession } from "@/lib/session";

/**
 * El catálogo no se hojea como un documento: es una pantalla de trabajo. El
 * header es el techo de una columna del alto de la ventana y el scroll ocurre
 * **dentro** de la página, no en el documento — nadie necesita saber cuánto
 * mide el header para colocarse debajo: basta con ser la siguiente fila.
 *
 * Cada página de aquí abajo se encarga de su propio scroll: la que no declare
 * un contenedor con overflow se quedaría cortada.
 *
 * El layout es **síncrono a propósito**. Un `await` aquí arriba no retrasa solo
 * al header: los componentes de servidor se renderizan en orden, así que
 * mientras el layout espera, la página de abajo ni siquiera ha empezado a pedir
 * el catálogo. La sesión —que es lo único que se esperaba— la pide el header
 * por su cuenta, y las dos lecturas salen a la vez.
 */
export default function CatalogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-svh flex-col overflow-hidden">
      <CatalogHeader />
      {children}
    </div>
  );
}

async function CatalogHeader() {
  const session = await getSession();
  return <SiteHeader session={session} />;
}
