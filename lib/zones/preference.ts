import "server-only";
import { cookies } from "next/headers";

/**
 * Zona elegida por el visitante, persistida en cookie.
 *
 * Es una preferencia, no una sesión: no identifica a nadie y solo decide qué
 * catálogo se ve por defecto. Se guarda httpOnly porque quien la lee es el
 * servidor (la página del catálogo), no el navegador.
 */
const ZONE_COOKIE = "zone";
const ZONE_MAX_AGE_S = 365 * 24 * 60 * 60; // un año

export async function getZonePreference(): Promise<string | null> {
  const store = await cookies();
  return store.get(ZONE_COOKIE)?.value ?? null;
}

/** Solo se puede llamar desde una Server Action o un Route Handler. */
export async function setZonePreference(slug: string | null): Promise<void> {
  const store = await cookies();

  if (slug === null) {
    store.delete(ZONE_COOKIE);
    return;
  }

  store.set(ZONE_COOKIE, slug, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ZONE_MAX_AGE_S,
    path: "/",
  });
}
