import { SiteHeader } from "@/components/landing/site-header";
import { getSession } from "@/lib/session";

/**
 * La barra del sitio también aquí dentro.
 *
 * Faltaba: quien entraba a su cuenta se quedaba sin manera de volver al catálogo
 * que no fuera el botón de atrás del navegador. Y con los pedidos colgando de
 * `/account` la falta se nota más, porque el checkout redirige justo aquí — el
 * comprador acaba de terminar una compra y lo primero que puede querer es seguir
 * mirando.
 */
export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AccountHeader />
      {children}
    </>
  );
}

async function AccountHeader() {
  return <SiteHeader session={await getSession()} />;
}
