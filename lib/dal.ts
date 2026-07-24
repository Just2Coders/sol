import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getSession } from "@/lib/session";

// Chequeo optimista (solo cookie): para páginas que requieren sesión.
export const verifySession = cache(async () => {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
});

// Igual, pero exige rol ADMIN.
export const verifyAdmin = cache(async () => {
  const session = await verifySession();
  if (session.role !== "ADMIN") redirect("/");
  return session;
});

// Chequeo seguro (va a la BD): devuelve el usuario actual o null.
// Úsalo cuando se necesiten datos reales del usuario, no solo saber si hay sesión.
export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
    columns: { passwordHash: false },
    with: { zone: true },
  });

  // Sesión huérfana: cookie válida pero el usuario ya no existe (p. ej. cuenta
  // eliminada). Sin esto el usuario queda atrapado: proxy.ts lo trata como
  // logueado y le bloquea /login y /registro hasta que expire la cookie.
  if (!user) redirect("/api/auth/logout");

  return user;
});
