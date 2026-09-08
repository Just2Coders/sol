"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Galería de imágenes de un producto o kit.
 *
 * El fichero viaja del navegador a Vercel Blob directamente; el servidor solo
 * firma el permiso (`/api/blob/upload`). Aquí únicamente se mantiene la lista
 * de URLs resultante, que se envía al formulario como inputs ocultos `name`,
 * de modo que la Server Action sigue recibiendo texto plano.
 *
 * Se admite además pegar una URL externa: útil mientras el store no está
 * configurado y para imágenes ya alojadas en otro sitio.
 */
/**
 * Prefijo de la clave en el store. Blob no tiene carpetas de verdad —el store
 * es plano y la barra solo es parte del nombre—, pero el panel de Vercel las
 * pinta como un árbol y `list({ mode: "folded" })` las recorre. Es un union
 * cerrado a propósito: el prefijo queda grabado en URLs inmutables que van a la
 * BD, así que un typo aquí no se arregla luego sin migrar ficheros y filas.
 */
export type BlobFolder = "products" | "kits" | "services";

export function ImageUploader({
  name = "images",
  folder,
  defaultUrls = [],
  max = 10,
}: {
  name?: string;
  folder: BlobFolder;
  defaultUrls?: string[];
  max?: number;
}) {
  const [urls, setUrls] = useState<string[]>(defaultUrls);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualUrl, setManualUrl] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const remaining = max - urls.length;

  async function handleFiles(files: FileList) {
    setError(null);
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files).slice(0, remaining)) {
        const blob = await upload(`${folder}/${file.name}`, file, {
          access: "public",
          handleUploadUrl: "/api/blob/upload",
        });
        uploaded.push(blob.url);
      }
      setUrls((current) => [...current, ...uploaded].slice(0, max));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la imagen.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function addManualUrl() {
    const value = manualUrl.trim();
    if (!value) return;
    setUrls((current) =>
      current.includes(value) ? current : [...current, value].slice(0, max),
    );
    setManualUrl("");
  }

  return (
    <div className="grid gap-3">
      {urls.map((url) => (
        <input key={url} type="hidden" name={name} value={url} />
      ))}

      {urls.length > 0 && (
        <ul className="flex flex-wrap gap-3">
          {urls.map((url) => (
            <li
              key={url}
              className="relative h-24 w-24 overflow-hidden rounded-md border"
            >
              {/* Host arbitrario (Blob o URL externa pegada a mano) y miniatura
                  de solo-admin: `next/image` aquí no aporta y exigiría permitir
                  cualquier dominio. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setUrls((c) => c.filter((u) => u !== url))}
                className="bg-background/80 absolute top-1 right-1 rounded px-1.5 text-sm leading-tight"
                aria-label="Quitar imagen"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          disabled={uploading || remaining <= 0}
          onChange={(e) => e.target.files?.length && handleFiles(e.target.files)}
          className="text-sm file:mr-3 file:rounded-md file:border file:bg-transparent file:px-3 file:py-1.5 file:text-sm"
        />
        {uploading && (
          <span className="text-muted-foreground text-sm">Subiendo...</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="url"
          value={manualUrl}
          onChange={(e) => setManualUrl(e.target.value)}
          placeholder="...o pega una URL de imagen"
          className="max-w-xs"
          disabled={remaining <= 0}
        />
        <Button
          type="button"
          variant="outline"
          onClick={addManualUrl}
          disabled={remaining <= 0}
        >
          Añadir URL
        </Button>
      </div>

      <p className="text-muted-foreground text-sm">
        JPG, PNG, WebP o AVIF · máximo 5 MB por imagen · {remaining} de {max}{" "}
        disponibles.
      </p>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
