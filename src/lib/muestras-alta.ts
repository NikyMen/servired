/**
 * Muestras de trabajos que el oferente carga, de forma opcional, en el alta.
 *
 * Mientras completa el formulario todavía no tiene perfil (nace al enviar el
 * alta), así que las fotos se suben de a una a /uploads y las muestras viajan
 * como JSON en el mismo envío. Sin imports de Node: el formulario del cliente
 * usa los límites.
 */

/** Tope de muestras que se cargan en el alta; el resto, desde Mi perfil. */
export const MAX_MUESTRAS_ALTA = 6;
export const MAX_FOTOS_MUESTRA = 5;
export const TITULO_MUESTRA = { min: 3, max: 80 } as const;
export const DESCRIPCION_MUESTRA_MAX = 600;

export type MuestraAlta = { title: string; description: string; urls: string[] };

/**
 * Lee el campo `muestras` del formulario. Devuelve la lista limpia o un error
 * para mostrar. `urlValida` es la regex de las URLs de /uploads (vive en un
 * módulo con imports de Node, por eso entra por parámetro).
 */
export function leerMuestrasAlta(raw: unknown, urlValida: RegExp): { muestras: MuestraAlta[] } | { error: string } {
  if (raw == null || raw === "") return { muestras: [] };
  let data: unknown;
  try { data = JSON.parse(String(raw)); } catch { return { error: "No pudimos leer las muestras de trabajos." }; }
  if (!Array.isArray(data)) return { error: "No pudimos leer las muestras de trabajos." };
  if (data.length > MAX_MUESTRAS_ALTA) return { error: `En el alta podés cargar hasta ${MAX_MUESTRAS_ALTA} muestras. El resto, desde Mi perfil.` };
  const muestras: MuestraAlta[] = [];
  for (const item of data) {
    const m = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const title = typeof m.title === "string" ? m.title.trim() : "";
    const description = typeof m.description === "string" ? m.description.trim().slice(0, DESCRIPCION_MUESTRA_MAX) : "";
    const urls = Array.isArray(m.urls) ? [...new Set(m.urls.filter((url): url is string => typeof url === "string" && urlValida.test(url)))] : [];
    if (title.length < TITULO_MUESTRA.min || title.length > TITULO_MUESTRA.max) return { error: `Cada muestra necesita un título de ${TITULO_MUESTRA.min} a ${TITULO_MUESTRA.max} caracteres.` };
    if (urls.length < 1 || urls.length > MAX_FOTOS_MUESTRA) return { error: `Cada muestra necesita entre 1 y ${MAX_FOTOS_MUESTRA} fotos.` };
    muestras.push({ title, description, urls });
  }
  return { muestras };
}
