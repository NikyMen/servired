import { existsSync } from "node:fs";
import maxmind, { type CityResponse, type Reader } from "maxmind";

/**
 * Ciudad aproximada de una IP, con la base gratuita "IP to City Lite" de
 * DB-IP (https://db-ip.com, CC BY 4.0) en formato .mmdb. La consulta es local:
 * la IP no sale del server ni se guarda. Sin `GEOIP_DB` (o sin el archivo) no
 * hay ubicación y las estadísticas lo dicen; nada más se rompe.
 */
let lector: Promise<Reader<CityResponse> | null> | null = null;

function abrir() {
  const archivo = process.env.GEOIP_DB?.trim();
  if (!archivo || !existsSync(archivo)) return Promise.resolve(null);
  // El archivo se actualiza una vez por mes: `watchForUpdates` lo recarga solo.
  return maxmind.open<CityResponse>(archivo, { watchForUpdates: true, watchForUpdatesNonPersistent: true }).catch((error) => {
    console.error("[geoip] no se pudo abrir la base:", error instanceof Error ? error.message : error);
    return null;
  });
}

export function geoipConfigurado() {
  const archivo = process.env.GEOIP_DB?.trim();
  return Boolean(archivo && existsSync(archivo));
}

export type Ubicacion = { country: string | null; region: string | null; city: string | null; latitude: number | null; longitude: number | null };

export async function ubicarIp(ip: string): Promise<Ubicacion | null> {
  if (!maxmind.validate(ip)) return null;
  lector ??= abrir();
  const reader = await lector;
  if (!reader) return null;
  try {
    const r = reader.get(ip);
    if (!r) return null;
    const nombre = (n?: { es?: string; en?: string }) => n?.es || n?.en || null;
    return {
      country: r.country?.iso_code ?? null,
      region: nombre(r.subdivisions?.[0]?.names),
      city: nombre(r.city?.names),
      latitude: r.location?.latitude ?? null,
      longitude: r.location?.longitude ?? null,
    };
  } catch {
    return null;
  }
}
