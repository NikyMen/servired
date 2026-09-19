/**
 * Geografía sin base de datos: la usan el servidor (distancias, filtro de
 * 10 km) y el navegador (cookie de ubicación, agrupar pines).
 */

export type Punto = { lat: number; lng: number };

/** Radio fijo de la búsqueda y del mapa del cliente. */
export const RADIO_KM = 10;

/** Cookie donde el navegador deja la ubicación en tiempo real, redondeada. */
export const COOKIE_UBICACION = "servired_ubic";

/** Distancia en línea recta sobre la esfera, en km. */
export function haversineKm(a: Punto, b: Punto) {
  const rad = (grados: number) => (grados * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** "a menos de 1 km", "3,2 km" por debajo de 10 y "12 km" desde 10. */
export function formatoDistancia(km: number) {
  if (km < 1) return "a menos de 1 km";
  if (km < 10) return `${km.toFixed(1).replace(".", ",")} km`;
  return `${Math.round(km)} km`;
}

export function dentroDeArgentina(p: Punto) {
  return Number.isFinite(p.lat) && Number.isFinite(p.lng) && p.lat >= -56 && p.lat <= -21 && p.lng >= -74 && p.lng <= -53;
}

/**
 * Tres decimales son unos 100 m: alcanza para un radio de 10 km y no deja la
 * dirección exacta de nadie viajando en cada pedido. La coma no puede ir en
 * el valor de una cookie, por eso el separador es "|".
 */
export function valorCookieUbicacion(p: Punto) {
  return `${p.lat.toFixed(3)}|${p.lng.toFixed(3)}`;
}

/** Lee la cookie; cualquier cosa rara (o fuera de Argentina) cuenta como que no hay. */
export function leerPuntoCookie(valor: string | null | undefined): Punto | null {
  if (!valor) return null;
  const [lat, lng] = decodeURIComponent(valor).split("|").map(Number);
  const punto = { lat, lng };
  return dentroDeArgentina(punto) ? { lat: Math.round(lat * 1000) / 1000, lng: Math.round(lng * 1000) / 1000 } : null;
}

/**
 * Agrupa pines cercanos en pantalla: los ubica en píxeles de la proyección del
 * mapa (web Mercator) al zoom actual y junta los que caen en la misma celda.
 * Se recalcula con cada zoom, así que al acercarse los grupos se abren.
 */
export function agruparPuntos<T extends Punto>(items: T[], zoom: number, celdaPx = 56) {
  const escala = 256 * 2 ** zoom;
  const grupos = new Map<string, T[]>();
  for (const item of items) {
    const x = ((item.lng + 180) / 360) * escala;
    const seno = Math.sin((item.lat * Math.PI) / 180);
    const y = (0.5 - Math.log((1 + seno) / (1 - seno)) / (4 * Math.PI)) * escala;
    const clave = `${Math.floor(x / celdaPx)}:${Math.floor(y / celdaPx)}`;
    const grupo = grupos.get(clave);
    if (grupo) grupo.push(item);
    else grupos.set(clave, [item]);
  }
  return [...grupos.values()].map((grupo) => ({
    lat: grupo.reduce((n, p) => n + p.lat, 0) / grupo.length,
    lng: grupo.reduce((n, p) => n + p.lng, 0) / grupo.length,
    items: grupo,
  }));
}

/** Dónde está un profesional: su punto; si no marcó uno, el de su localidad; si tampoco, el respaldo (Capital). */
export function puntoDePro(pro: { latitude: number | null; longitude: number | null }, localidad: Punto | null, respaldo: Punto): Punto {
  if (pro.latitude != null && pro.longitude != null) return { lat: pro.latitude, lng: pro.longitude };
  return localidad ?? respaldo;
}
