import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/session";
import { safeInternalPath } from "@/lib/utils";

// Chequeo optimista con la cookie (sin BD). La verificación real vive en el
// DAL (lib/dal.ts), que cada página protegida llama de nuevo.
export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const session = await decrypt(req.cookies.get("session")?.value);

  const isAdminRoute = path.startsWith("/admin");
  const isAccountRoute = path.startsWith("/cuenta");
  const isAuthRoute = path === "/login" || path === "/registro";

  if ((isAdminRoute || isAccountRoute) && !session) {
    const login = new URL("/login", req.nextUrl);
    login.searchParams.set("desde", path);
    return NextResponse.redirect(login);
  }

  if (isAdminRoute && session?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  if (isAuthRoute && session) {
    const desde = safeInternalPath(req.nextUrl.searchParams.get("desde"));
    return NextResponse.redirect(new URL(desde ?? "/", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp)$).*)"],
};
