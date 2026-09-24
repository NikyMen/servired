import { ipCliente } from "@/lib/intentos";
import { prisma } from "@/lib/prisma";

type Acceso = {
  source: "kyc" | "credential";
  documentId: string;
  documentKind: string;
  ownerUserId: string | null;
};

/**
 * Deja constancia de que administración abrió un documento privado.
 * Si no se puede anotar, la ruta no sirve el archivo: un acceso sin registro
 * es justo lo que esto viene a evitar. La IP y el navegador están para
 * reconocer una sesión de admin usada desde otro lado.
 */
export async function registrarAcceso(req: Request, acceso: Acceso) {
  await prisma.documentAccessLog.create({
    data: {
      ...acceso,
      viewer: process.env.ADMIN_EMAIL || "admin",
      ip: ipCliente(req.headers),
      userAgent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
    },
  });
}

/**
 * El reproductor pide el video en pedazos (Range). Se anota solo el pedido que
 * arranca del principio: si no, un video visto una vez dejaría decenas de filas.
 */
export function esPrimerPedazo(req: Request) {
  const range = req.headers.get("range");
  return !range || /^bytes=0-/.test(range);
}
