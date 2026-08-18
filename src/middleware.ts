import { NextRequest, NextResponse } from "next/server";

const PREINSCRIPTION_HOSTS = new Set(["servired.ar", "www.servired.ar"]);

export function middleware(request: NextRequest) {
  const hostname = (request.headers.get("host") ?? request.nextUrl.host).split(":")[0].toLowerCase();
  if (!PREINSCRIPTION_HOSTS.has(hostname)) return NextResponse.next();
  const { pathname } = request.nextUrl;
  if (pathname === "/") return NextResponse.rewrite(new URL("/landing-preinscripcion", request.url));
  if (pathname === "/landing-preinscripcion" || pathname === "/api/preinscripciones" || pathname.startsWith("/_next/") || pathname.startsWith("/uploads/") || /\.[^/]+$/.test(pathname)) return NextResponse.next();
  return NextResponse.redirect(new URL("/", request.url));
}

export const config = { matcher: ["/((?!_next/static|_next/image).*)"] };
