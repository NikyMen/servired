/** Separa la localidad elegida al registrarse y agrupa el resto por ciudad. */
export function agruparProfesionales<T extends {
  localidadId: string | null;
  localidadNombre: string | null;
  provinciaNombre: string | null;
  zone: string;
  distanciaKm: number | null;
}>(pros: T[], localidadId: string | null) {
  const locales: T[] = [];
  const otras = new Map<string, { titulo: string; pros: T[]; distancia: number; orden: number }>();

  for (const pro of pros) {
    if (localidadId && pro.localidadId === localidadId) {
      locales.push(pro);
      continue;
    }
    const titulo = pro.localidadNombre
      ? `${pro.localidadNombre}${pro.provinciaNombre ? `, ${pro.provinciaNombre}` : ""}`
      : pro.zone || "Otra ubicación";
    const clave = pro.localidadId ?? `zona:${titulo}`;
    let grupo = otras.get(clave);
    if (!grupo) {
      grupo = { titulo, pros: [], distancia: Infinity, orden: otras.size };
      otras.set(clave, grupo);
    }
    grupo.pros.push(pro);
    grupo.distancia = Math.min(grupo.distancia, pro.distanciaKm ?? Infinity);
  }

  return {
    locales,
    otras: [...otras.values()]
      .sort((a, b) => a.distancia - b.distancia || a.orden - b.orden)
      .map(({ titulo, pros }) => ({
        titulo,
        pros: pros.sort((a, b) => (a.distanciaKm ?? Infinity) - (b.distanciaKm ?? Infinity)),
      })),
  };
}
