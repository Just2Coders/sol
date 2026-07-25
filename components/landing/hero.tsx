import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { SessionPayload } from "@/lib/session";

type HeroProps = {
  session: SessionPayload | null;
};

/**
 * Hero de la home.
 *
 * Dirección "Taller Solar Caribeño": plano amplio y calmado, luz natural de
 * atardecer y la casa como sujeto. El scrim va en verde profundo (token
 * --scrim-hero) para que la foto pertenezca a la paleta, y el encuadre se
 * desplaza al 72% para dejar libre la mitad izquierda, donde cae el titular.
 */
export function Hero({ session }: HeroProps) {
  return (
    <section className="relative flex h-screen min-h-[640px] flex-col justify-end px-[var(--space-section-x)] pb-[var(--space-section-y-sm)]">
      <Image
        src="/images/hero-inicio.jpg"
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

      <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-[var(--space-section-x)] py-[var(--space-header-y)]">
        <Link href="/" className="text-hueso hover:text-hueso">
          <span className="block text-xl font-bold tracking-[-0.01em]">solaris</span>
          <span className="text-hueso/75 block font-mono text-[10px] tracking-[0.14em]">
            energía · cuba
          </span>
        </Link>

        <nav className="flex items-center gap-7">
          <Link
            href="/catalogo"
            className="text-hueso/90 hover:text-hueso hidden text-[length:var(--text-nav-size)] font-medium sm:block"
          >
            Kits
          </Link>
          {session ? (
            <>
              {session.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="text-hueso/90 hover:text-hueso hidden text-[length:var(--text-nav-size)] font-medium sm:block"
                >
                  Panel admin
                </Link>
              )}
              <Link
                href="/cuenta"
                className="text-hueso/90 hover:text-hueso hidden text-[length:var(--text-nav-size)] font-medium sm:block"
              >
                Mi cuenta
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="text-hueso/90 hover:text-hueso hidden text-[length:var(--text-nav-size)] font-medium sm:block"
            >
              Iniciar sesión
            </Link>
          )}
          <Button asChild>
            <Link href="/catalogo">Explora los kits</Link>
          </Button>
        </nav>
      </header>

      <p className="text-hueso/80 absolute top-[104px] right-[var(--space-section-x)] z-10 hidden text-right font-mono text-[length:var(--text-marginalia-size)] leading-[var(--text-marginalia-leading)] tracking-[var(--text-marginalia-tracking)] md:block">
        kit-01 · 3.2 kWh
        <br />
        respaldo 8 h
      </p>

      <h1 className="text-hueso relative z-10 max-w-[12ch] text-[length:var(--text-display-1-size)] leading-[var(--text-display-1-leading)] font-bold tracking-[var(--text-display-1-tracking)]">
        El sol ya trabaja para tu casa.
      </h1>
      <p className="text-hueso/90 relative z-10 mt-5 mb-[30px] max-w-[44ch] text-[length:var(--text-body-lg-size)] leading-[var(--text-body-lg-leading)]">
        Kits solares de proveedores confiables, armados para casas y negocios
        cubanos. Compara, escoge y coordina la instalación en tu provincia.
      </p>
      <div className="relative z-10">
        <Button asChild size="lg">
          <Link href="/catalogo">Explora los kits</Link>
        </Button>
      </div>

      <p className="text-hueso/80 absolute right-[var(--space-section-x)] bottom-[var(--space-section-y-sm)] z-10 hidden font-mono text-[length:var(--text-marginalia-size)] tracking-[var(--text-marginalia-tracking)] md:block">
        instalación en 14 provincias
      </p>
    </section>
  );
}
