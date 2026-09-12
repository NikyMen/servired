import { prisma } from "@/lib/prisma";

/**
 * Textos legales editables desde el panel. Una fila por clave, igual que las
 * placas de publicidad (`Ad.slot`).
 */
export const TERMS_SLUG = "terminos";

/**
 * Texto inicial, para que la página no quede vacía ni tire 404 antes de que
 * administración la toque por primera vez. Es una base para editar, no un
 * documento revisado por un abogado.
 */
export const TERMS_DEFAULT = {
  title: "Términos y condiciones",
  body: `ServiRed es una plataforma que conecta personas que necesitan un servicio con quienes lo ofrecen. No somos parte del trabajo que se acuerda entre ellas.

## Qué hacemos y qué no
- Verificamos la identidad de quienes ofrecen servicios antes de publicarlos.
- Damos el lugar para acordar el trabajo, el monto y el plazo, y para dejar una opinión al terminar.
- No ejecutamos los trabajos ni respondemos por su resultado, sus materiales o sus plazos.
- No intervenimos en el pago: se acuerda y se hace entre las partes.

## Tu cuenta
- Los datos que cargás tienen que ser verdaderos y actualizados.
- La cuenta es personal: no se comparte ni se presta.
- Podés darla de baja cuando quieras desde la configuración de tu perfil. El borrado es definitivo.

## Si ofrecés servicios
- Tenés que estar en condiciones legales de prestar el servicio que publicás, con las matrículas o habilitaciones que correspondan.
- Las fotos que subís como muestra tienen que ser de trabajos tuyos. Publicar trabajos ajenos como propios es motivo de baja de la cuenta.
- El monto y el plazo que proponés son un compromiso con la otra persona.

## Contenido y conducta
- Cualquiera puede denunciar una imagen o un perfil. Las denuncias las revisa administración.
- Suspendemos o damos de baja cuentas que publiquen contenido ajeno, engañoso, ofensivo o ilegal.

## Datos personales
- Usamos tus datos para que la plataforma funcione: mostrar tu perfil, conectarte con la otra parte y verificar tu identidad.
- Los documentos de identidad y el video de verificación no son públicos: solo los ve administración.
- No vendemos tus datos.

## Cambios
Estos términos pueden cambiar. La fecha de la última modificación figura al pie de esta página.`,
};

export type Bloque =
  | { tipo: "titulo"; texto: string }
  | { tipo: "parrafo"; texto: string }
  | { tipo: "lista"; items: string[] };

/**
 * Lectura mínima del texto: "## " es subtítulo, "- " es ítem de lista, y un
 * renglón en blanco corta párrafo. Alcanza para un documento legal y evita
 * sumar una dependencia de markdown para una sola página.
 */
export function parseTexto(body: string): Bloque[] {
  const bloques: Bloque[] = [];
  for (const crudo of body.replace(/\r\n/g, "\n").split(/\n{2,}/)) {
    const parrafo = crudo.trim();
    if (!parrafo) continue;
    const lineas = parrafo.split("\n").map((linea) => linea.trim()).filter(Boolean);
    for (const linea of lineas) {
      if (linea.startsWith("## ")) {
        bloques.push({ tipo: "titulo", texto: linea.slice(3).trim() });
        continue;
      }
      if (linea.startsWith("- ")) {
        const ultimo = bloques[bloques.length - 1];
        if (ultimo?.tipo === "lista") ultimo.items.push(linea.slice(2).trim());
        else bloques.push({ tipo: "lista", items: [linea.slice(2).trim()] });
        continue;
      }
      const ultimo = bloques[bloques.length - 1];
      // Renglones seguidos del mismo párrafo se pegan; el corte lo hace la
      // línea en blanco, no el ancho con el que alguien tipeó. El párrafo
      // vacío que se empuja al cerrar cada bloque es el que marca ese corte.
      if (ultimo?.tipo === "parrafo" && ultimo.texto) ultimo.texto = `${ultimo.texto} ${linea}`;
      else if (ultimo?.tipo === "parrafo" && !ultimo.texto) ultimo.texto = linea;
      else bloques.push({ tipo: "parrafo", texto: linea });
    }
    // Un párrafo nuevo empieza después del renglón en blanco.
    bloques.push({ tipo: "parrafo", texto: "" });
  }
  return bloques.filter((bloque) => bloque.tipo !== "parrafo" || bloque.texto);
}

export async function getSiteText(slug: string, porDefecto: { title: string; body: string }) {
  const fila = await prisma.siteText.findUnique({ where: { slug } });
  return { title: fila?.title || porDefecto.title, body: fila?.body || porDefecto.body, updatedAt: fila?.updatedAt ?? null };
}
