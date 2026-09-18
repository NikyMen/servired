"use server";

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { TIPOS_AVISO, darDeBajaAviso, esTipoAviso, firmaValida, guardarPreferenciasAvisos } from "@/lib/avisos-correo";

/** Confirmación de la baja desde el enlace del mail. Se vuelve a validar la firma: los argumentos viajan por el navegador. */
export async function bajaDesdeEnlaceAction(userId: string, tipo: string, firma: string) {
  if (!firmaValida(userId, tipo, firma) || !esTipoAviso(tipo)) redirect("/avisos-correo?invalido=1");
  await darDeBajaAviso(userId, tipo);
  redirect(`/avisos-correo?listo=${tipo}`);
}

export type AvisosState = { ok?: boolean; error?: string; values?: Record<(typeof TIPOS_AVISO)[number], boolean> } | undefined;

/** Interruptores del perfil: exige sesión y guarda los tres tipos juntos. */
export async function guardarAvisosAction(_prev: AvisosState, formData: FormData): Promise<AvisosState> {
  const user = await getSessionUser();
  if (!user) return { error: "Entrá para cambiar tus avisos." };
  const prefs = Object.fromEntries(TIPOS_AVISO.map((tipo) => [tipo, formData.get(tipo) === "on"])) as Record<(typeof TIPOS_AVISO)[number], boolean>;
  await guardarPreferenciasAvisos(user.id, prefs);
  // Se devuelven porque React 19 resetea el form después de la acción.
  return { ok: true, values: prefs };
}
