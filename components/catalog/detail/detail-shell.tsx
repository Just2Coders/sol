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
 * 2. **La columna de datos** (`head` y las secciones plegadas) scrollea entera
 *    y junta. El nombre y el botón de comprar iban clavados arriba, pero eso
 *    le dejaba a lo demás —descripción, ficha técnica, alcance— una franja tan
 *    baja que apenas se leía una línea sin mover el cursor: la cabecera pesaba
 *    más que el contenido que la sigue.
 *
 * Las dos columnas llevan `lg:min-h-0` además de `lg:h-full`: sin él, un hijo
 * flex no se encoge por debajo del alto de su contenido aunque el padre tenga
 * alto fijo, así que la columna crecía con el acordeón entero en vez de
 * quedarse clavada al alto de la fila y dejar que su propio `overflow-y-auto`
 * hiciera el scroll interno — el síntoma era un scroll de más al desplazarse
 * cerca de la cabecera de una sección.
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
  children,
}: {
  photos: CatalogPhoto[];
  fallbackAlt: string;
  /** La cabecera fija de la columna derecha: `CatalogDetailHead`. */
  head: React.ReactNode;
  /** Lo que se recorre: el acordeón de secciones y la tira de relacionados. */
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-0 flex-1 scroll-smooth overflow-y-auto motion-reduce:scroll-auto lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:overflow-hidden">
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
            En tinta y no en el `outline` de los botones de cantidad: aquellos
            son controles sobre papel, este flota sobre una foto y necesita su
            propio contraste — el mismo `canvas`/`canvas-foreground` de las
            etiquetas de foto de al lado, no un tono nuevo. */}
        <Button
          asChild
          variant="outline"
          size="icon-lg"
          className="border-canvas bg-canvas text-canvas-foreground hover:bg-canvas/90 absolute top-4 left-4 z-10 shadow-sm lg:top-6 lg:left-6"
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
      <div className="bg-card border-border flex min-h-0 flex-col border-t lg:h-full lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:border-t-0">
        {head}
        {children}
      </div>
    </main>
  );
}
