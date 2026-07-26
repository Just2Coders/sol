import "server-only";
import { del } from "@vercel/blob";

/**
 * Utilidades de Vercel Blob para el almacenamiento de imágenes.
 *
 * Las imágenes se suben desde el cliente (ver `app/api/blob/upload/route.ts`) y
 * en la BD solo se guarda su URL. Estos helpers se encargan del ciclo de vida
 * inverso: borrar los ficheros que dejan de estar referenciados.
 */

const BLOB_HOST_SUFFIX = ".blob.vercel-storage.com";

/** El store está configurado (en local hace falta el token en `.env`). */
export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/** Distingue lo subido a nuestro store de una URL externa pegada a mano. */
export function isBlobUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith(BLOB_HOST_SUFFIX);
  } catch {
    return false;
  }
}

/**
 * Borra del store las imágenes que ya no se usan, para no acumular ficheros
 * huérfanos (se facturan por almacenamiento).
 *
 * No lanza: un fallo de limpieza no debe tumbar la mutación que ya se guardó
 * en la BD. En el peor caso queda un fichero suelto.
 */
export async function deleteBlobs(urls: string[]): Promise<void> {
  if (!isBlobConfigured()) return;

  const owned = urls.filter(isBlobUrl);
  if (owned.length === 0) return;

  try {
    await del(owned);
  } catch (error) {
    console.error("No se pudieron borrar imágenes de Blob:", error);
  }
}

/** Imágenes que estaban antes y ya no están en la nueva lista. */
export function removedImages(previous: string[], next: string[]): string[] {
  const keep = new Set(next);
  return previous.filter((url) => !keep.has(url));
}
