/**
 * Placas de publicidad de la portada. Todas son cuadradas y de la misma medida
 * (800 × 800), en el celular y en la compu: una sola imagen sirve para
 * cualquier lugar, y lo que administración encuadra es lo que se ve en
 * cualquier pantalla. Sin base de datos: lo usan la portada, el panel y el
 * recorte, que es de cliente.
 */

export type TipoPlaca = "lateral" | "superior" | "pie";

/** Medida única de todas las placas, en px. */
export const LADO_PLACA = 800;

export const TIPOS_PLACA: Record<TipoPlaca, { nombre: string; donde: string; ancho: number; alto: number; slots: string[] }> = {
  lateral: { nombre: "Costados", donde: "Compu ancha, a los lados; acompañan el scroll", ancho: LADO_PLACA, alto: LADO_PLACA, slots: ["left-1", "left-2", "right-1", "right-2"] },
  superior: { nombre: "Arriba", donde: "Celular y tablet, debajo del título: 2 filas de 3", ancho: LADO_PLACA, alto: LADO_PLACA, slots: ["mobile-1", "mobile-2", "mobile-3", "mobile-4", "mobile-5", "mobile-6"] },
  pie: { nombre: "Pie", donde: "Todas las pantallas, al final de la portada", ancho: LADO_PLACA, alto: LADO_PLACA, slots: ["bottom-1", "bottom-2", "bottom-3", "bottom-4"] },
};

export const CONSEJOS_PLACA = [
  "Dejá el texto importante lejos de los bordes: en pantallas chicas se ve más pequeño.",
  "Letra grande y pocas palabras: se lee de pasada.",
  "Buen contraste entre el texto y el fondo.",
  "Mejor una foto clara que muchos elementos chicos.",
  "Si el logo queda cortado, alejalo y elegí un color de fondo igual al de la imagen.",
];

export function tipoDeSlot(slot: string): TipoPlaca | null {
  for (const [tipo, datos] of Object.entries(TIPOS_PLACA) as [TipoPlaca, (typeof TIPOS_PLACA)[TipoPlaca]][]) {
    if (datos.slots.includes(slot)) return tipo;
  }
  return null;
}

/** Solo estos slots son placas; "ayuda" es del botón de soporte. */
export function esSlotDePlaca(slot: string) {
  return tipoDeSlot(slot) !== null;
}

/** La placa venía del editor viejo (acercar, mover, estirar): conviene re-subirla con el recorte nuevo. */
export function necesitaReencuadre(ad: { imageUrl: string | null; imageScale: number; imageX: number; imageY: number; imageStretchX: number; imageStretchY: number }) {
  if (!ad.imageUrl) return false;
  return ad.imageScale !== 1 || ad.imageX !== 0 || ad.imageY !== 0 || ad.imageStretchX !== 1 || ad.imageStretchY !== 1;
}

/** Valores neutros del encuadre viejo: con el recorte fijo ya no se usan. */
export const ENCUADRE_NEUTRO = { imageScale: 1, imageX: 0, imageY: 0, imageStretchX: 1, imageStretchY: 1 };
