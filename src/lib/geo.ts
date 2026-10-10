/**
 * Geografía sin base de datos: la usan el servidor (distancias, filtro de
 * 10 km) y el navegador (cookie de ubicación, agrupar pines).
 */

export type Punto = { lat: number; lng: number };

/** Radio fijo de la búsqueda y del mapa del cliente. */
export const RADIO_KM = 10;

/**
 * Zona de trabajo que marca el oferente: unas 3 cuadras a la redonda. Se
 * dibuja como círculo, no como pin, para que el punto exacto no se lea como
 * "acá vive".
 */
export const RADIO_ZONA_M = 300;

/** Diámetro del círculo con que el mapa de la home marca a cada uno: unas 3 cuadras y media. */
export const DIAMETRO_ZONA_M = 375;

/**
 * Cómo arranca el mapa de la home en Corrientes Capital: la ciudad entera,
 * del puente a Laguna Brava. En pantalla ancha cae justo en zoom 13; en el
 * celular se aleja lo necesario para que entre igual.
 */
export const ENCUADRE_CORRIENTES = { sur: -27.506, oeste: -58.872, norte: -27.448, este: -58.712 };
const CENTRO_CORRIENTES: Punto = { lat: -27.4692, lng: -58.8306 };

/** Está en Corrientes Capital (o en sus barrios de borde). */
export function enCorrientesCapital(p: Punto) {
  return haversineKm(p, CENTRO_CORRIENTES) <= 8;
}

/**
 * La zona que manda un formulario: las dos coordenadas o ninguna. Vacío =
 * "no quiero marcar" (null); cualquier otra cosa rara = undefined (inválida).
 */
export function leerZona(latitude: unknown, longitude: unknown): Punto | null | undefined {
  const vacio = (v: unknown) => v == null || v === "";
  if (vacio(latitude) && vacio(longitude)) return null;
  const punto = { lat: Number(latitude), lng: Number(longitude) };
  return dentroDeArgentina(punto) ? punto : undefined;
}

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

/**
 * Cómo se reparten los que no marcaron zona alrededor del centro de su
 * localidad. Rumbos en grados desde el norte, en sentido horario. En
 * Corrientes Capital el río queda al norte y al oeste del centro: el reparto
 * va solo hacia la ciudad (este, sur y sudoeste), y más amplio porque es grande.
 */
type Reparto = { minKm: number; maxKm: number; desde: number; hasta: number };
const REPARTO_GENERAL: Reparto = { minKm: 0.3, maxKm: 1.5, desde: 0, hasta: 360 };
const REPARTOS_LOCALES: { centro: Punto; reparto: Reparto }[] = [
  { centro: CENTRO_CORRIENTES, reparto: { minKm: 0.5, maxKm: 3, desde: 90, hasta: 230 } },
];

/** FNV-1a de 32 bits, pasado a [0, 1): el mismo texto da siempre el mismo número. */
function azarFijo(texto: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    hash ^= texto.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) / 2 ** 32;
}

/**
 * Un punto estable cerca de `centro`, elegido por `id`. Es para los que no
 * marcaron zona: si todos cayeran justo en el centro de la localidad, el
 * mapa los apilaba uno encima del otro. Siempre el mismo lugar para el mismo
 * id (no salta entre visitas), repartido parejo por superficie.
 */
export function puntoAproximado(id: string, centro: Punto): Punto {
  const reparto = REPARTOS_LOCALES.find((r) => haversineKm(r.centro, centro) <= 1)?.reparto ?? REPARTO_GENERAL;
  const rumbo = ((reparto.desde + azarFijo(`${id}:rumbo`) * (reparto.hasta - reparto.desde)) * Math.PI) / 180;
  const km = Math.sqrt(reparto.minKm ** 2 + azarFijo(`${id}:distancia`) * (reparto.maxKm ** 2 - reparto.minKm ** 2));
  const kmPorGradoLat = 111.32;
  return {
    lat: centro.lat + (km * Math.cos(rumbo)) / kmPorGradoLat,
    lng: centro.lng + (km * Math.sin(rumbo)) / (kmPorGradoLat * Math.cos((centro.lat * Math.PI) / 180)),
  };
}

/** El pin con el que arranca "Publicar solicitud": si quedó ahí, nadie lo movió. */
export function esPinPorDefecto(p: Punto) {
  return Math.abs(p.lat - CENTRO_CORRIENTES.lat) < 1e-6 && Math.abs(p.lng - CENTRO_CORRIENTES.lng) < 1e-6;
}

/**
 * Dónde está un profesional: su punto; si no marcó uno, un lugar aproximado
 * (`puntoAproximado`) alrededor del de su localidad o, sin localidad, del
 * respaldo (Capital).
 */
export function puntoDePro(pro: { id: string; latitude: number | null; longitude: number | null }, localidad: Punto | null, respaldo: Punto): Punto & { aproximado: boolean } {
  if (pro.latitude != null && pro.longitude != null) return { lat: pro.latitude, lng: pro.longitude, aproximado: false };
  return { ...puntoAproximado(pro.id, localidad ?? respaldo), aproximado: true };
}
