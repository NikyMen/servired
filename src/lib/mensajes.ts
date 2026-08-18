/**
 * Sin leer: quién vio qué y hasta cuándo.
 *
 * La conversación guarda una marca de tiempo por lado (`leidoCliente` /
 * `leidoPro`) en vez de un flag por mensaje: alcanza para saber qué quedó sin
 * ver y no hay que escribir una fila por mensaje cada vez que alguien abre el
 * hilo.
 */

/** El que mira la pantalla. Es el mismo valor que `Message.sender`. */
export type Viewer = "cliente" | "profesional";

/** Columna donde se anota la lectura de cada lado. */
export function campoLeido(viewer: Viewer): "leidoCliente" | "leidoPro" {
  return viewer === "profesional" ? "leidoPro" : "leidoCliente";
}

/**
 * Mensajes que le escribieron al que mira después de su última lectura.
 * Los propios nunca cuentan, aunque sean posteriores a la marca.
 */
export function contarNoLeidos(
  messages: { sender: string; createdAt: Date | string }[],
  viewer: Viewer,
  leido: Date | string | null | undefined
): number {
  const desde = leido ? new Date(leido).getTime() : null;
  return messages.filter(
    (m) => m.sender !== viewer && m.sender !== "sistema" && (desde === null || new Date(m.createdAt).getTime() > desde)
  ).length;
}

/**
 * El número del globito: chats con algo sin leer, no mensajes sueltos.
 * Cinco mensajes de la misma persona son un solo aviso.
 */
export function contarChatsConNoLeidos(porConversacion: Record<string, number>): number {
  return Object.values(porConversacion).filter((n) => n > 0).length;
}
