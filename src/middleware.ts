import { NextRequest, NextResponse } from "next/server";

// El sitio se sirve con dos caras desde el mismo proceso:
// servired.ar sale al público en modo preinscripción, y cualquier otro dominio
// (el de demo del cliente, y localhost en desarrollo) muestra la web completa.
const HOSTS_SOLO_PREINSCRIPCION = new Set(["servired.ar", "www.servired.ar"]);

function soloPreinscripcion(request: NextRequest) {
  const host = request.headers.get("host") ?? request.nextUrl.host;
  return HOSTS_SOLO_PREINSCRIPCION.has(host.split(":")[0].toLowerCase());
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!soloPreinscripcion(request)) return NextResponse.next();

  // Durante el lanzamiento solo queda visible la landing y el formulario.
  if (
    pathname === "/" ||
    pathname === "/landing-preinscripcion" ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/api/preinscripciones" ||
    pathname === "/api/admin" ||
    pathname.startsWith("/api/admin/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/uploads/") ||
    /\.[^/]+$/.test(pathname)
  ) {
    if (pathname === "/") {
      return NextResponse.rewrite(new URL("/landing-preinscripcion", request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/", request.url));
}

export const config = { matcher: ["/((?!_next/static|_next/image).*)"] };
