import { PrismaClient } from "@prisma/client";
import { PLACAS, SLOTS_VIEJOS } from "../src/lib/publicidad";

/**
 * Se corre una vez por cada cambio de lugares de la publicidad: las imágenes
 * que el cliente ya cargó en lugares que dejaron de mostrarse (SLOTS_VIEJOS)
 * se mudan a los que quedaron libres, así no tiene que subirlas de nuevo.
 *
 * - Se mudan las que tienen imagen, en el orden de SLOTS_VIEJOS: primero lo
 *   que se veía hasta el cambio.
 * - NO pisa un lugar nuevo que ya tenga imagen, y saltea la placa cuya imagen
 *   ya esté puesta en alguno de los lugares nuevos. Eso es lo que hace que
 *   correrlo dos veces no cambie nada: si mirara solo los lugares libres,
 *   la segunda corrida volvería a copiar los mismos avisos más adelante.
 * - NO borra nada: las filas viejas y sus archivos quedan donde están. Si hay
 *   más placas cargadas que lugares, las que no entran se listan al final para
 *   que el cliente decida dónde ponerlas.
 */
const prisma = new PrismaClient();
const DESTINOS = PLACAS.map((placa) => placa.slot);

async function main() {
  const viejas = await prisma.ad.findMany({ where: { slot: { in: SLOTS_VIEJOS }, NOT: { imageUrl: null } } });
  // El orden de findMany no es el de la lista: lo imponemos nosotros.
  viejas.sort((a, b) => SLOTS_VIEJOS.indexOf(a.slot) - SLOTS_VIEJOS.indexOf(b.slot));

  const ocupados = await prisma.ad.findMany({ where: { slot: { in: DESTINOS }, NOT: { imageUrl: null } }, select: { slot: true, imageUrl: true } });
  const libres = DESTINOS.filter((slot) => !ocupados.some((o) => o.slot === slot));
  const yaPuestas = new Set(ocupados.map((o) => o.imageUrl));

  // Las que ya están en la portada nueva no se vuelven a mudar.
  const pendientes = viejas.filter((vieja) => !yaPuestas.has(vieja.imageUrl));

  const mudadas: string[] = [];
  for (const vieja of pendientes) {
    const destino = libres.shift();
    if (!destino) break;
    const data = {
      title: vieja.title,
      imageUrl: vieja.imageUrl,
      imageScale: vieja.imageScale,
      imageX: vieja.imageX,
      imageY: vieja.imageY,
      imageStretchX: vieja.imageStretchX,
      imageStretchY: vieja.imageStretchY,
      whatsappPhone: vieja.whatsappPhone,
      whatsappMessage: vieja.whatsappMessage,
      enabled: vieja.enabled,
    };
    await prisma.ad.upsert({ where: { slot: destino }, create: { slot: destino, ...data }, update: data });
    mudadas.push(`${vieja.slot} → ${destino}${vieja.title ? ` (${vieja.title})` : ""}`);
  }

  const sinLugar = pendientes.slice(mudadas.length).map((a) => `${a.slot}${a.title ? ` (${a.title})` : ""}`);
  console.log(`Placas de lugares viejos con imagen: ${viejas.length}. Ya estaban en un lugar nuevo: ${viejas.length - pendientes.length}. Mudadas ahora: ${mudadas.length}.`);
  for (const linea of mudadas) console.log(`  ${linea}`);
  if (sinLugar.length) {
    console.log(`No entraron (la imagen sigue guardada, se pueden subir a mano a cualquier lugar): ${sinLugar.join(", ")}.`);
  }
}

main().finally(() => prisma.$disconnect());
