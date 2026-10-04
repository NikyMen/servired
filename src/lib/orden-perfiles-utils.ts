export type OrdenPerfilesInput = { ids: string[]; anteriores: string[] };

export function mismoOrden(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

/** Posición final desde cero; null devuelve el perfil al orden automático. */
export function ubicarPerfil(ids: readonly string[], id: string, posicion: number | null) {
  const siguiente = ids.filter((actual) => actual !== id);
  if (posicion !== null) siguiente.splice(Math.max(0, Math.min(posicion, siguiente.length)), 0, id);
  return siguiente;
}

export function validarOrdenPerfiles(input: unknown): input is OrdenPerfilesInput {
  if (!input || typeof input !== "object") return false;
  const { ids, anteriores } = input as Partial<OrdenPerfilesInput>;
  const listaValida = (value: unknown): value is string[] => Array.isArray(value)
    && value.length <= 10000
    && value.every((id) => typeof id === "string" && id.length > 0 && id.length <= 128)
    && new Set(value).size === value.length;
  return listaValida(ids) && listaValida(anteriores);
}
