"use client";

import { useState } from "react";

import { CatalogMedia } from "@/components/catalog/catalog-media";
import { cn } from "@/lib/utils";

/**
 * Galería de la ficha: una foto grande y, si hay más de una, la tira de
 * miniaturas debajo. Sin carrusel automático ni lightbox — la foto está para
 * reconocer el equipo, no para exhibirlo.
 */
export function CatalogGallery({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  const [active, setActive] = useState(0);
  const current = images[active] ?? null;

  return (
    <div>
      <CatalogMedia
        src={current}
        alt={alt}
        sizes="(min-width: 1024px) 55vw, 92vw"
        priority
        className="aspect-[4/3] rounded-md"
      />

      {images.length > 1 && (
        <ul className="mt-4 flex flex-wrap gap-3">
          {images.map((image, index) => (
            <li key={image}>
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Ver foto ${index + 1} de ${images.length}`}
                aria-current={index === active}
                className={cn(
                  "ease-standard block overflow-hidden rounded-md border transition-colors duration-base",
                  index === active
                    ? "border-primary"
                    : "border-border hover:border-border-strong",
                )}
              >
                <CatalogMedia
                  src={image}
                  alt=""
                  sizes="80px"
                  className="size-20"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
