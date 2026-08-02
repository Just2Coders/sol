import Link from "next/link";
import { ArrowLeft } from "reicon-react";

import { CatalogPhotoColumn } from "@/components/catalog/detail/photo-column";
import { Button } from "@/components/ui/button";
import type { CatalogPhoto } from "@/lib/catalog/photos";

/**
 * El armazón de una ficha: fotos a la izquierda, datos a la derecha, y **tres
 * regiones que no se empujan entre sí**.
 *
 * La ficha no se hojea como un documento: son cosas que se consultan a la vez.
 * De ahí el reparto en escritorio:
 *
 * 1. **Las fotos** tienen su propio scroll. Recorrerlas no mueve el precio.
 * 2. **La cabecera de datos** (`head`: qué es, cuánto cuesta, el botón) no
 *    scrollea con nada. Es la decisión de compra: sale de pantalla solo cuando
 *    el visitante se va de la página, no cuando baja a leer la letra pequeña.
 * 3. **Las secciones plegadas y lo demás del proveedor** son lo único que se
 *    recorre en la columna derecha, y lo hacen entre la cabecera y el pie.
 * 4. **El pie** (`footer`: hasta dónde llega el proveedor) tampoco se mueve. Es
 *    la otra mitad de la decisión —el botón de arriba no sirve de nada si el
 *    equipo no llega a donde vive quien mira— y por eso acompaña al botón en
 *    vez de esperar al final del scroll.
 *
 * `overscroll-contain` en las dos zonas con scroll evita que al llegar al final
 * de una se arrastre la de al lado. En móvil no hay dos columnas que cuadrar:
 * la página vuelve a tener un solo scroll, con las fotos acostadas arriba (ver
 * `photo-column.tsx`) y los datos debajo — fijar la cabecera en una pantalla
 * pequeña le comería al contenido la mitad del alto disponible.
 *
 * El alto lo hereda del layout del catálogo, que ya es una columna del alto de
 * la ventana con el header como techo fijo (`app/catalog/layout.tsx`).
 *
 * El `scroll-smooth` está en las dos capas a propósito: en móvil, saltar a la
 * foto de un componente tiene que subir la página **y** correr el carrusel, y
 * cada movimiento lo hace un contenedor distinto.
 */
export function CatalogDetailShell({
  photos,
  fallbackAlt,
  head,
  footer,
  children,
}: {
  photos: CatalogPhoto[];
  fallbackAlt: string;
  /** La cabecera fija de la columna derecha: `CatalogDetailHead`. */
  head: React.ReactNode;
  /** El pie fijo: la cobertura del proveedor (`CatalogSupplierCoverage`). */
  footer?: React.ReactNode;
  /** Lo que se recorre: el acordeón de secciones y la tira de relacionados. */
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-0 flex-1 scroll-smooth overflow-y-auto motion-reduce:scroll-auto lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:overflow-hidden">
      {/* La envoltura existe para anclar la salida: el enlace es hermano de la
          tira de fotos, no hijo, así que no se mueve cuando la tira scrollea.
          Lleva el papel de la ficha —el mismo al que el duotono recorta las
          altas luces de la foto— para que cuando la tira no llegue a llenar el
          alto, lo que sobre por debajo siga siendo la misma hoja y no el fondo
          del documento. */}
      <div className="bg-card relative lg:h-full lg:min-h-0">
        <CatalogPhotoColumn photos={photos} fallbackAlt={fallbackAlt} />

        {/* La salida, clavada sobre la primera foto. Sin texto: una flecha atrás
            sobre una foto es de las pocas señales que no necesitan rótulo, y el
            nombre se lo lleva escrito para quien no la ve.
            Mismo `outline` que los botones de cantidad: los tres son controles
            secundarios de la ficha —moverse, sumar, restar— y ninguno es la
            acción, que la quiere entera el botón de comprar. La sombra es la que
            le toca a algo que flota sobre una imagen. */}
        <Button
          asChild
          variant="outline"
          size="icon-lg"
          className="absolute top-4 left-4 z-10 shadow-sm lg:top-6 lg:left-6"
        >
          <Link href="/catalog" title="Volver al catálogo">
            <ArrowLeft aria-hidden />
            <span className="sr-only">Volver al catálogo</span>
          </Link>
        </Button>
      </div>

      {/* Sin línea entre columnas en escritorio: desde que el duotono recorta
          las luces de la foto al papel de la ficha, las dos mitades son la misma
          hoja, y un filete en medio la partía en dos otra vez. El canto de la
          foto ya marca dónde acaba una y empieza la otra. En móvil sí queda la
          línea: ahí la foto se acuesta encima de los datos y el pliegue es lo
          único que separa dos cosas del mismo tono. */}
      <div className="bg-card border-border flex min-h-0 flex-col border-t lg:h-full lg:border-t-0">
        <div className="shrink-0">{head}</div>

        <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain">
          {children}
        </div>

        <div className="shrink-0">{footer}</div>
      </div>
    </main>
  );
}
