import type { SessionUser } from "@/lib/auth";
import { getLocalidades } from "@/lib/localidades";
import { TERMS_DEFAULT, TERMS_SLUG, getSiteText, parseTexto } from "@/lib/site-text";

/**
 * Lo que necesita la pantalla de aceptación. Se arma solo cuando hace falta:
 * a una cuenta al día no se le lee ni el texto ni la lista de localidades.
 */
export async function datosCompletarAlta(user: SessionUser) {
  const [texto, localidades] = await Promise.all([
    getSiteText(TERMS_SLUG, TERMS_DEFAULT),
    user.localityId ? Promise.resolve([]) : getLocalidades(),
  ]);
  return {
    titulo: user.termsVersion == null ? "Completá tu alta" : !user.termsOk ? "Actualizamos los términos" : "Elegí tu localidad",
    pedirTerminos: !user.termsOk,
    textoTitulo: texto.title,
    bloques: parseTexto(texto.body),
    version: texto.version,
    localidades: localidades.map(({ id, name, province }) => ({ id, name, province })),
  };
}
