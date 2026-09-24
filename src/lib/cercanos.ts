import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { RADIO_KM, haversineKm, puntoDePro, type Punto } from "@/lib/geo";
import { rankProfessionals } from "@/lib/search";
import { capital } from "@/lib/ubicacion";

export type Filtros = { q?: string; categoria?: string; tipo?: "profesional" | "oficio" };

/** Mismas condiciones que un perfil tiene que cumplir para aparecer en cualquier búsqueda. */
export function filtroProfesionales({ categoria, tipo }: Filtros): Prisma.ProfessionalWhereInput {
  const filters: Prisma.ProfessionalWhereInput[] = [
    { profileStatus: "approved" },
    { OR: [{ userId: null }, { user: { accountStatus: "approved", perfilOculto: false } }] },
  ];
  if (categoria) filters.push({ OR: [{ category: { OR: [{ slug: categoria }, { parent: { slug: categoria } }] } }, { categoryLinks: { some: { category: { OR: [{ slug: categoria }, { parent: { slug: categoria } }], approvalStatus: "approved" } } } }] });
  if (tipo) filters.push({ providerType: tipo });
  return { AND: filters };
}

/**
 * Profesionales para la portada y el mapa. Con `centro` (usuario con sesión)
 * se quedan los que están a 10 km o menos, cada uno con su distancia, y a
 * igual relevancia va primero el más cerca. Sin centro (invitado), todos.
 */
export async function buscarProfesionales(filtros: Filtros, centro: Punto | null) {
  const [found, respaldo] = await Promise.all([
    prisma.professional.findMany({
      where: filtroProfesionales(filtros),
      include: {
        category: true,
        categoryLinks: { where: { category: { approvalStatus: "approved" } }, include: { category: true } },
        _count: { select: { bookings: { where: { status: "completed" } }, workSamples: true } },
        services: { where: { status: "activo" }, select: { title: true, description: true, categoryLabel: true } },
        user: { select: { locality: { select: { name: true, latitude: true, longitude: true } } } },
      },
    }),
    capital(),
  ]);
  const conPunto = found.map((pro) => {
    const localidad = pro.user?.locality ?? null;
    const punto = puntoDePro(pro, localidad ? { lat: localidad.latitude, lng: localidad.longitude } : null, { lat: respaldo.latitude, lng: respaldo.longitude });
    return {
      ...pro,
      categories: pro.categoryLinks.map((link) => link.category),
      punto,
      localidadNombre: localidad?.name ?? null,
      distanciaKm: centro ? haversineKm(centro, punto) : null,
    };
  });
  const dentro = centro ? conPunto.filter((pro) => pro.distanciaKm! <= RADIO_KM) : conPunto;
  return rankProfessionals(dentro, filtros.q ?? "", (a, b) => (a.distanciaKm ?? 0) - (b.distanciaKm ?? 0));
}
