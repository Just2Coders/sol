import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Hero de la home.
 *
 * Dirección "Taller Solar Caribeño": plano amplio y calmado, luz natural de
 * atardecer y la casa como sujeto. El scrim va en el tono del lienzo oscuro (token
 * --scrim-hero) para que la foto pertenezca a la paleta, y el encuadre se
 * desplaza al 72% para dejar libre la mitad izquierda, donde cae el titular.
 *
 * La navegación no vive aquí: es `SiteHeader`, fijo a nivel de página, para que
 * la marca siga presente al pasar el hero.
 */
export function Hero() {
  return (
    <section className="px-gutter pb-section-sm relative flex h-screen min-h-[640px] flex-col justify-end">
      <Image
        src="/images/hero-home.jpg"
        alt="Casa cubana al atardecer con paneles solares en el techo y un kit de energía instalado en la pared"
        fill
        priority
        sizes="100vw"
        className="object-cover object-[72%_center]"
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ backgroundImage: "var(--scrim-hero)" }}
      />

      <p className="text-foreground-inverse/80 text-marginalia right-gutter absolute top-[104px] z-10 hidden text-right font-mono md:block">
        kit-01 · 3.2 kWh
        <br />
        respaldo 8 h
      </p>

      <h1 className="text-foreground-inverse text-display-1 relative z-10 max-w-[12ch]">
        El sol ya trabaja para tu casa.
      </h1>
      <p className="text-foreground-inverse/90 text-body-lg relative z-10 mt-5 mb-[30px] max-w-[44ch]">
        Kits solares de proveedores confiables, armados para casas y negocios
        cubanos. Compara, escoge y coordina la instalación en tu provincia.
      </p>
      <div className="relative z-10">
        <Button asChild size="lg">
          <Link href="/catalog">Explora los kits</Link>
        </Button>
      </div>

      <p className="text-foreground-inverse/80 text-marginalia right-gutter bottom-section-sm absolute z-10 hidden font-mono md:block">
        instalación en 14 provincias
      </p>

      {/* Centinela: marca dónde termina la foto para que SiteHeader sepa cuándo
          pasar de transparente a sólido. */}
      <div aria-hidden data-hero-end className="absolute inset-x-0 bottom-0 h-px" />
    </section>
  );
}
