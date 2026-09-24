/** Localidad que viene elegida en los formularios; la persona puede cambiarla por cualquier otra. */
export const LOCALIDAD_POR_DEFECTO = { name: "Resistencia", province: "Chaco" };

/** Id de la localidad por defecto dentro de la lista, o la primera si no está (la desactivaron). */
export function idPorDefecto(localidades: { id: string; name: string; province: string }[]) {
  const elegida = localidades.find((l) => l.name === LOCALIDAD_POR_DEFECTO.name && l.province === LOCALIDAD_POR_DEFECTO.province);
  return (elegida ?? localidades[0])?.id ?? "";
}
