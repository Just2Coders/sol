import { SiteHeader } from "@/components/landing/site-header";
import { getSession } from "@/lib/session";

/**
 * El checkout necesita la barra por una razón que no es decorativa: **el
 * carrito**.
 *
 * La pantalla dice cosas como «quita "X" para seguir» —un proveedor que ya no
 * llega a la zona, algo que se agotó— y sin el panel lateral no habría dónde
 * hacerlo. Sería un callejón: se le pide al comprador exactamente lo único que
 * no puede hacer desde ahí.
 *
 * Va en un layout y no dentro de la página para que la barra no se vuelva a
 * montar cuando la Action devuelve estado.
 */
export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <CheckoutHeader />
      {children}
    </>
  );
}

// La sesión la pide el header por su cuenta: si la esperara el layout, la
// página de abajo ni siquiera habría empezado a leer sus zonas.
async function CheckoutHeader() {
  return <SiteHeader session={await getSession()} />;
}
