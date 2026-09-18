import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { COOKIE_UBICACION, leerPuntoCookie, type Punto } from "@/lib/geo";
import { CAPITAL, LOCALIDADES_BASE } from "@/lib/localidades";

export type Ubicacion = { punto: Punto; origen: "gps" | "localidad"; localidad: string };

/**
 * Desde dónde se calculan los 20 km de un usuario con sesión: la ubicación en
 * tiempo real que dejó el navegador; si no dio permiso, su localidad; si ni
 * eso (cuenta vieja), Corrientes Capital. La ubicación exacta no se guarda en
 * la base: vive solo en la cookie, redondeada.
 */
export async function resolverUbicacion(user: { localityId: string | null }): Promise<Ubicacion> {
  const jar = await cookies();
  const gps = leerPuntoCookie(jar.get(COOKIE_UBICACION)?.value);
  const propia = user.localityId ? await prisma.locality.findUnique({ where: { id: user.localityId }, select: { name: true, latitude: true, longitude: true } }) : null;
  const respaldo = propia ?? (await capital());
  if (gps) return { punto: gps, origen: "gps", localidad: respaldo.name };
  return { punto: { lat: respaldo.latitude, lng: respaldo.longitude }, origen: "localidad", localidad: respaldo.name };
}

/** Capital de la base (por si administración le corrigió el punto) o de la lista base. */
export async function capital() {
  const fila = await prisma.locality.findUnique({ where: { name_province: CAPITAL }, select: { name: true, latitude: true, longitude: true } });
  return fila ?? LOCALIDADES_BASE[0];
}
