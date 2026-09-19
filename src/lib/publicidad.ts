/**
 * Placas de publicidad de la portada. Todas son la misma placa: cuadrada de
 * 800 × 800, en el celular y en la compu. Lo único que cambia de una a otra es
 * dónde aparece, así que acá no hay "tipos" ni medidas distintas: hay una
 * lista de lugares. Sin base de datos: lo usan la portada, el panel y el
 * recorte, que es de cliente.
 */

/** Medida única de todas las placas, en px. */
export const LADO_PLACA = 800;

export type Ubicacion = "izquierda" | "derecha" | "arriba" | "pie";

export const UBICACIONES: Record<Ubicacion, { nombre: string; donde: string }> = {
  izquierda: { nombre: "Costado izquierdo", donde: "Compu ancha: acompaña el scroll a la izquierda" },
  derecha: { nombre: "Costado derecho", donde: "Compu ancha: acompaña el scroll a la derecha" },
  arriba: { nombre: "Arriba", donde: "Celular y tablet: dos filas de tres, debajo del título" },
  pie: { nombre: "Pie", donde: "Todas las pantallas: al final de la portada" },
};

/** Los slots de cada lugar, en el orden en que se ven en la portada. */
export const SLOTS: Record<Ubicacion, string[]> = {
  izquierda: ["left-1", "left-2", "left-3"],
  derecha: ["right-1", "right-2", "right-3"],
  arriba: ["mobile-1", "mobile-2", "mobile-3", "mobile-4", "mobile-5", "mobile-6"],
  pie: ["bottom-1", "bottom-2", "bottom-3", "bottom-4"],
};

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

/** Nombre para mostrar: "Costado izquierdo 1". Cae al slot crudo si no lo conoce. */
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
