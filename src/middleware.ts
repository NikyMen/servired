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
 *
 * Por eso /api ni entra al middleware: si entrara, Next le corta el cuerpo a
 * 10 MB (middlewareClientMaxBodySize) y el alta de oferente, que manda DNI
 * frente y dorso, foto y un video de hasta 25 MB, llegaba incompleta y
 * rebotaba con "No pudimos leer el formulario.".
 */
const DOMINIO = "servired.ar";
const REDIRIGEN = new Set(["www.servired.ar", "servired.consultoriadigital.io"]);

export function middleware(request: NextRequest) {
  const hostname = (request.headers.get("host") ?? request.nextUrl.host).split(":")[0].toLowerCase();
  if (!REDIRIGEN.has(hostname)) return NextResponse.next();
  return NextResponse.redirect(new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, `https://${DOMINIO}`), 308);
}

export const config = { matcher: ["/((?!api/|_next/static|_next/image).*)"] };
