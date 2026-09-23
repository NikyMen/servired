import { NextRequest, NextResponse } from "next/server";

/**
 * servired.ar es el dominio de ServiRed. Los otros nombres que Traefik manda al
 * mismo proceso redirigen ahí con la misma ruta: www, y el de demo que se usó
 * antes de salir. Las sesiones y el ida y vuelta con Mercado Pago dependen de
 * estar siempre en el mismo dominio (las cookies son de cada uno).
 *
 * La API no se redirige: un aviso de Mercado Pago o un pedido a medio camino
 * con la dirección vieja tiene que seguir contestándose (un POST no sigue
 * redirecciones).
 */
const DOMINIO = "servired.ar";
const REDIRIGEN = new Set(["www.servired.ar", "servired.consultoriadigital.io"]);

export function middleware(request: NextRequest) {
  const hostname = (request.headers.get("host") ?? request.nextUrl.host).split(":")[0].toLowerCase();
  if (!REDIRIGEN.has(hostname) || request.nextUrl.pathname.startsWith("/api/")) return NextResponse.next();
  return NextResponse.redirect(new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, `https://${DOMINIO}`), 308);
}

export const config = { matcher: ["/((?!_next/static|_next/image).*)"] };
