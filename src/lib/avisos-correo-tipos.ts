/** Los tipos de aviso por correo, sin base de datos: también los usa el perfil, que es de cliente. */
export const TIPOS_AVISO = ["mensajes", "solicitudes", "propuestas"] as const;
export type TipoAviso = (typeof TIPOS_AVISO)[number];

export const ETIQUETA_AVISO: Record<TipoAviso, string> = {
  mensajes: "Mensajes nuevos y sin contestar",
  solicitudes: "Solicitudes nuevas de mis rubros",
  propuestas: "Presupuestos recibidos, aceptados o rechazados",
};

export function esTipoAviso(value: unknown): value is TipoAviso {
  return typeof value === "string" && (TIPOS_AVISO as readonly string[]).includes(value);
}
