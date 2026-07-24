import { redirect } from "next/navigation";
import { deleteSession } from "@/lib/session";

// Un RSC no puede borrar cookies (solo Server Actions o Route Handlers), así
// que el DAL redirige aquí cuando detecta una sesión huérfana (cookie válida
// pero usuario ya inexistente en la BD) para limpiarla y liberar al usuario.
export async function GET() {
  await deleteSession();
  redirect("/login");
}
