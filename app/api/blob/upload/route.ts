import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getSession } from "@/lib/session";

/**
 * Emisor de tokens para las subidas de imágenes desde el cliente.
 *
 * El navegador sube el fichero directamente a Vercel Blob (los bytes no pasan
 * por esta función), pero antes pide aquí un token de un solo uso. Este
 * endpoint es, por tanto, la única puerta de seguridad: sin la comprobación de
 * rol cualquiera podría escribir en el store.
 *
 * `proxy.ts` no cubre `/api/**`, así que la sesión se verifica aquí mismo.
 */

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB por imagen

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const session = await getSession();
        if (session?.role !== "ADMIN") {
          throw new Error("Solo un administrador puede subir imágenes.");
        }

        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/avif",
          ],
          maximumSizeInBytes: MAX_IMAGE_BYTES,
          // Evita que dos ficheros con el mismo nombre se pisen entre sí.
          addRandomSuffix: true,
        };
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Subida rechazada." },
      { status: 400 },
    );
  }
}
