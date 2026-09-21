/**
 * Placas de publicidad. Todas son la misma placa: cuadrada de 800 × 800, en el
 * celular y en la compu. Lo único que cambia de una a otra es dónde aparece,
 * así que acá no hay "tipos" ni medidas distintas: hay una lista de lugares.
 *
 * Son 12, ni una más: 3 en el costado izquierdo y 3 en el derecho, que
 * acompañan el scroll en todas las pantallas del sitio, y 6 debajo de la
 * portada. En el celular no hay costados: las 12 se ven juntas, de 4 en 4,
 * debajo de la portada. Sin base de datos: lo usan la portada, el layout del
 * cliente, el panel y el recorte, que es de cliente.
 */

/** Medida única de todas las placas, en px. */
export const LADO_PLACA = 800;

export type Ubicacion = "izquierda" | "derecha" | "debajo";

export const UBICACIONES: Record<Ubicacion, { nombre: string; donde: string }> = {
  izquierda: { nombre: "Izquierda", donde: "Franja del costado izquierdo: se ve en todo el sitio y acompaña el scroll (solo en la compu)" },
  derecha: { nombre: "Derecha", donde: "Franja del costado derecho: se ve en todo el sitio y acompaña el scroll (solo en la compu)" },
  debajo: { nombre: "Debajo de la portada", donde: "Debajo de la portada, en la pantalla de inicio" },
};

/**
 * Los 12 lugares, en el orden en que se ven en el celular (las 12 juntas, de 4
 * en 4). Los slots conservan los nombres viejos —`portada-N` y `bottom-N`—
 * porque esas filas ya existen en la base con las imágenes que cargó el
 * cliente: renombrarlas sería perder el contenido sin ninguna necesidad.
 * `bottom-4` quedó afuera (eran 13 lugares y ahora son 12); lo que tenga
 * cargado lo rescata `prisma/reubicar-placas.ts`.
 */
export const SLOTS: Record<Ubicacion, string[]> = {
  izquierda: ["portada-1", "portada-2", "portada-3"],
  derecha: ["portada-4", "portada-5", "portada-6"],
  debajo: ["portada-7", "portada-8", "portada-9", "bottom-1", "bottom-2", "bottom-3"],
};

/**
 * Lugares que ya no se muestran, de las dos vueltas anteriores: los 6 de solo
 * celular y los costados de antes (`mobile-*`, `left-*`, `right-*`) y el cuarto
 * del pie, que sobraba al pasar de 13 lugares a 12. Quedan acá para
 * `prisma/reubicar-placas.ts`, que rescata lo que se había cargado en ellos.
 * El orden es el de la mudanza: primero lo que se veía hasta ayer.
 */
export const SLOTS_VIEJOS = [
  "bottom-4",
  "mobile-1", "mobile-2", "mobile-3", "mobile-4", "mobile-5", "mobile-6",
  "left-1", "left-2", "left-3",
  "right-1", "right-2", "right-3",
];

export type Placa = { slot: string; ubicacion: Ubicacion; numero: number; nombre: string };

/** Todas las placas en una sola lista, que es como se administran. */
export const PLACAS: Placa[] = (Object.keys(SLOTS) as Ubicacion[]).flatMap((ubicacion) =>
  SLOTS[ubicacion].map((slot, i) => ({ slot, ubicacion, numero: i + 1, nombre: `${UBICACIONES[ubicacion].nombre} ${i + 1}` })),
);

const POR_SLOT = new Map(PLACAS.map((placa) => [placa.slot, placa]));

/** La placa de ese slot, o null si el slot no es una placa ("ayuda" es del botón de soporte). */
export function placaDeSlot(slot: string): Placa | null {
  return POR_SLOT.get(slot) ?? null;
}

/** Solo estos slots son placas; "ayuda" y cualquier otro texto quedan afuera. */
export function esSlotDePlaca(slot: string) {
  return POR_SLOT.has(slot);
}

/** Nombre para mostrar: "Izquierda 1". Cae al slot crudo si no lo conoce. */
export function nombreDeSlot(slot: string) {
  return POR_SLOT.get(slot)?.nombre ?? slot;
}

export const CONSEJOS_PLACA = [
  "Dejá el texto importante lejos de los bordes: en pantallas chicas se ve más pequeño.",
  "Letra grande y pocas palabras: se lee de pasada.",
  "Buen contraste entre el texto y el fondo.",
  "Mejor una foto clara que muchos elementos chicos.",
  "Si el logo queda cortado, alejalo y elegí un color de fondo igual al de la imagen.",
];

/** La placa venía del editor viejo (acercar, mover, estirar): conviene re-subirla con el recorte nuevo. */
export function necesitaReencuadre(ad: { imageUrl: string | null; imageScale: number; imageX: number; imageY: number; imageStretchX: number; imageStretchY: number }) {
  if (!ad.imageUrl) return false;
  return ad.imageScale !== 1 || ad.imageX !== 0 || ad.imageY !== 0 || ad.imageStretchX !== 1 || ad.imageStretchY !== 1;
}

/** Valores neutros del encuadre viejo: con el recorte fijo ya no se usan. */
export const ENCUADRE_NEUTRO = { imageScale: 1, imageX: 0, imageY: 0, imageStretchX: 1, imageStretchY: 1 };
