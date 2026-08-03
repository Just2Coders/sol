import Image from "next/image";

import { FlatCta } from "./flat-cta";
import { KitFinder } from "./kit-finder";

/**
 * Hero de la home.
 *
 * Dirección "Taller Solar Caribeño": plano amplio y calmado, luz natural de
 * atardecer y la casa como sujeto. El scrim va en el tono del lienzo oscuro
 * (`bg-scrim-hero`) para que la foto pertenezca a la paleta, y el encuadre se
 * desplaza al 72% para que el sujeto no quede detrás del titular.
 *
 * Todo el texto cae centrado en el tercio inferior, apoyado en la parte densa
 * del degradado: es la única zona de la foto donde el blanco tiene contraste
 * garantizado a cualquier hora del día que muestre la imagen.
 *
 * La sección no recorta lo que le sobresale: el buscador de kits nace dentro y
 * cuelga por debajo del borde de la foto, y es la sección siguiente la que
 * reserva el aire para recibirlo (`pt-section-lg`).
 *
 * La altura es `h-hero` (100vh menos la barra del sitio) y no un píxel fijo:
 * la barra quedó `sticky top-0` y sigue reservando su hueco en el flujo, así
 * que si el hero no descuenta ese alto sobra ese hueco al final del scroll de
 * una pantalla. Con la resta, barra + hero llenan exactamente una pantalla en
 * cualquier viewport.
 */
export function Hero() {
  // El buscador lee el kit elegido del contexto, así que esta sección no tiene
  // que saber nada de kits para colocarlo.
  return (
    <section className="relative flex h-hero flex-col justify-end">
      <Image
        src="/images/hero-home.jpg"
        alt="Casa cubana al atardecer con paneles solares en el techo y un kit de energía instalado en la pared"
        fill
        priority
        sizes="100vw"
        className="object-cover object-[72%_center]"
      />
      <div aria-hidden className="bg-scrim-hero absolute inset-0" />

      <div className="px-gutter relative z-10 flex flex-col items-center pb-32 text-center">
     
        <h1 className="text-foreground-inverse text-display-1 mt-6 max-w-225">
          Cuando se va la luz, tu casa sigue encendida.
        </h1>
        <p className="text-foreground-inverse text-body-lg mt-6 max-w-155">
          Kits solares con paneles, inversor, baterías e instalación incluida.
          Te los monta un proveedor de tu provincia y el pago va por Solaris,
          con factura.
        </p>
        <FlatCta href="/catalog" className="mt-8">
          Ver catálogo
        </FlatCta>
      </div>

      {/* Colgado por debajo del borde de la foto y no a caballo: con el hero a
          `100vh` exacto, la mitad que antes quedaba sobre la foto asomaba
          cortada a mitad de botón en la primera pantalla. El desplazamiento
          alcanza para que toda la barra caiga fuera del pliegue — solo el
          galón queda a la vista como pista de scroll — y la sección de abajo
          (`pt-section-lg`) sigue teniendo de sobra para absorberla. */}
      <KitFinder className="absolute inset-x-0 -bottom-24 z-20" />
    </section>
  );
}
