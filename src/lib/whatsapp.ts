/**
 * Enlaces de WhatsApp, sin base de datos: lo usan el perfil, las placas de
 * publicidad y el botón de ayuda, y también el formulario de administración.
 */

/** El texto con el que arranca el chat al tocar el WhatsApp de un perfil. */
export function saludoPerfil(nombre: string) {
  return `Hola ${nombre}, te encontré en ServiRed y quería consultarte por un trabajo.`;
}

export const AYUDA_DEFAULT = "Hola, necesito ayuda con ServiRed.";

/**
 * wa.me quiere el número con país y sin signos. Los perfiles guardan el
 * teléfono como lo escribió la persona: si trae el 0 de larga distancia se lo
 * sacamos, y si no trae el 54 le ponemos 549 (celular argentino).
 */
export function waLink(phone: string, message?: string | null) {
  let digits = phone.replace(/\D/g, "");
  if (!digits.startsWith("54")) digits = `549${digits.replace(/^0+/, "")}`;
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}

/** "3794404086" → "+54 9 3794 40-4086", como se escribe en Argentina. */
export function telefonoLegible(digitos: string) {
  return `+54 9 ${digitos.slice(0, 4)} ${digitos.slice(4, -4)}-${digitos.slice(-4)}`;
}

/**
 * Número de soporte: característica sin 0 + número sin 15, diez dígitos en
 * total (ej. 3794123456). Devuelve los dígitos o null si no sirve.
 */
export function validSupportPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 10 || digits.startsWith("0") || digits.startsWith("15")) return null;
  return digits;
}
