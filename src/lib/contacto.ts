/**
 * Bloqueo de teléfonos en lo que se escriben cliente y profesional.
 *
 * El contacto va por ServiRed: así queda registro de lo acordado, se paga por
 * acá y la calificación vale. Un número de celular en el chat es la puerta
 * para arreglar por fuera, así que no se deja mandar.
 *
 * Sin dependencias de servidor: lo usa la API para rechazar y el chat para
 * avisar antes de enviar.
 */

export const MENSAJE_CONTACTO_BLOQUEADO =
  "No se pueden compartir números de teléfono ni WhatsApp por acá. Coordiná todo por el chat de ServiRed: así queda registro de lo que acuerdan y el trabajo queda cubierto.";

/** Con 8 cifras seguidas ya es un teléfono: el más corto con característica tiene 10, y "15" + número local, 9. */
const MIN_CIFRAS = 8;

const PALABRAS_CIFRA: Record<string, string> = {
  cero: "0", uno: "1", una: "1", dos: "2", tres: "3", cuatro: "4", cinco: "5",
  seis: "6", siete: "7", ocho: "8", nueve: "9",
};

/** Links que abren un chat por fuera: wa.me/549…, api.whatsapp.com, t.me/… */
const LINK_CHAT_EXTERNO = /\b(?:wa\.me|wa\.link|api\.whatsapp\.com|chat\.whatsapp\.com|whatsapp\.com\/send|t\.me)\b/i;

/** Fechas (12/05/2026, 12-05-26): se sacan antes de contar para no confundirlas con un número. */
// Día y mes válidos, y sin cifras pegadas a los costados: "3794.12.34.56" no es una fecha.
const FECHA = /(?<![\d/.-]\s?)\b(?:0?[1-9]|[12]\d|3[01])[/.-](?:0?[1-9]|1[0-2])[/.-](?:\d{4}|\d{2})\b(?!\s?[/.-]?\s?\d)/g;

/** Plata: "$ 15.000.000", "15.000.000 pesos". No es un teléfono. */
const PLATA = /\$\s*\d[\d.,]*|[\d.,]+\s*(?:pesos|mil|millones?|ars|usd|d[oó]lares)\b/gi;

/**
 * Cifras sueltas que, juntas, forman un número: separadas por espacios, puntos,
 * guiones, paréntesis o "+". "+54 9 (379) 412-3456", "3794.12.34.56" o
 * "tres siete nueve cuatro…" escrito en letras.
 */
const TIRA_DE_CIFRAS = /\d(?:[\s.\-()+_*]*\d)+/g;

function sinAcentos(texto: string) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** ¿Este texto trae un teléfono o un link para chatear por fuera? */
export function tieneTelefono(texto: string): boolean {
  if (!texto) return false;
  if (LINK_CHAT_EXTERNO.test(texto)) return true;

  let limpio = sinAcentos(texto.toLowerCase());
  // Números escritos en letras ("tres siete nueve…") pasan a cifras. Antes de
  // sacar la plata, así "un millón" no se confunde con un número.
  limpio = limpio.replace(/\b(cero|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve)\b/g, (p) => PALABRAS_CIFRA[p]);
  // "tres, siete, nueve": comas entre cifras sueltas también separan. Sólo
  // entre cifras de a una, así "150.000, 200.000" sigue siendo una lista de precios.
  limpio = limpio.replace(/(?<=(?:^|[\s,])\d)\s*,\s*(?=\d(?![\d.]))/g, " ");
  // La letra "o" metida entre cifras para esquivar ("3794 1o 2345") cuenta como cero.
  // Pegada a una cifra ("1o", "o5"); con espacios ("2 o 3") sigue siendo la "o".
  limpio = limpio.replace(/(?<=\d)o|o(?=\d)/g, "0");
  limpio = limpio.replace(FECHA, " ").replace(PLATA, " ");

  for (const tira of limpio.match(TIRA_DE_CIFRAS) ?? []) {
    if (tira.replace(/\D/g, "").length >= MIN_CIFRAS) return true;
  }
  return false;
}

/** Para las rutas: el primer texto con teléfono corta, con el mensaje para mostrar. */
export function errorContacto(...textos: Array<string | null | undefined>): string | null {
  return textos.some((t) => typeof t === "string" && tieneTelefono(t)) ? MENSAJE_CONTACTO_BLOQUEADO : null;
}
