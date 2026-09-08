import { countDrift, runSweep } from "@/lib/inventory/sweep";

/**
 * El barrido periódico, disparado por el cron de Vercel (ver `vercel.ts`).
 *
 * La ruta es pública en el router, así que **el secreto es la única puerta**.
 * Vercel manda `Authorization: Bearer $CRON_SECRET` en cada llamada; sin la
 * variable configurada esto responde 503 y no hace nada — falla cerrado, porque
 * un endpoint que muta inventario sin autenticar es peor que un cron que no
 * corre.
 */

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json(
      { error: "CRON_SECRET no está configurado" },
      { status: 503 },
    );
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("No autorizado", { status: 401 });
  }

  const report = await runSweep();
  // Se cuenta el descuadre pero no se repara: arreglarlo en silencio escondería
  // el bug que lo causó. Que salga en los logs y lo mire alguien.
  const drift = await countDrift();

  return Response.json({ ok: true, ...report, drift });
}
