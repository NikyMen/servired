import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
