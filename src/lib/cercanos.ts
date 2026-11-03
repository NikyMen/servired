import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { RADIO_KM, haversineKm, puntoDePro, type Punto } from "@/lib/geo";
import { parseQuery, rankProfessionals, type SearchablePro } from "@/lib/search";
import { capital } from "@/lib/ubicacion";

export type Filtros = { q?: string; categoria?: string; tipo?: "profesional" | "oficio"; urgencias?: boolean };

/** Mismas condiciones que un perfil tiene que cumplir para aparecer en cualquier búsqueda. */
export function filtroProfesionales({ categoria, tipo, urgencias }: Filtros): Prisma.ProfessionalWhereInput {
  const filters: Prisma.ProfessionalWhereInput[] = [
    { profileStatus: "approved" },
    { OR: [{ userId: null }, { user: { accountStatus: "approved", perfilOculto: false } }] },
  ];
  if (categoria) filters.push({ OR: [{ category: { OR: [{ slug: categoria }, { parent: { slug: categoria } }] } }, { categoryLinks: { some: { category: { OR: [{ slug: categoria }, { parent: { slug: categoria } }], approvalStatus: "approved" } } } }] });
  if (tipo) filters.push({ providerType: tipo });
  if (urgencias) filters.push({ urgencias24: true });
  return { AND: filters };
}

/**
 * Profesionales para la portada y el mapa. La portada puede pedir todos;
 * el mapa conserva su radio de 10 km. Sin centro (invitado), todos.
 */
export async function buscarProfesionales(filtros: Filtros, centro: Punto | null, radioKm: number | null = RADIO_KM) {
  const [found, respaldo] = await Promise.all([
    prisma.professional.findMany({
      where: filtroProfesionales(filtros),
      include: {
        category: true,
        categoryLinks: { where: { category: { approvalStatus: "approved" } }, include: { category: true } },
        _count: { select: { bookings: { where: { status: "completed" } }, workSamples: true } },
        services: { where: { status: "activo" }, select: { title: true, description: true, categoryLabel: true } },
        user: { select: { locality: { select: { id: true, name: true, province: true, latitude: true, longitude: true } } } },
      },
    }),
    capital(),
  ]);
  return ubicarProfesionales(found, { lat: respaldo.latitude, lng: respaldo.longitude }, filtros, centro, radioKm);
}

/** El mapa no necesita conteos de trabajos ni los datos completos de las tarjetas. */
export async function buscarProfesionalesMapa(filtros: Filtros, centro: Punto) {
  const sinBusqueda = parseQuery(filtros.q ?? "").empty;
  const [found, respaldo] = await Promise.all([
    prisma.professional.findMany({
      where: filtroProfesionales(filtros),
      select: {
        id: true, name: true, businessName: true, headline: true, zone: true,
        avatarUrl: true, avatarColor: true, latitude: true, longitude: true,
        verified: true, matriculado: true, rating: true, featured: true,
        posicionFija: true, approvedAt: true, createdAt: true,
        bio: !sinBusqueda,
        category: { select: { slug: true, name: true } },
        categoryLinks: { where: { category: { approvalStatus: "approved" } }, select: { category: { select: { slug: true, name: true } } } },
        services: sinBusqueda ? false : { where: { status: "activo" }, select: { title: true, description: true, categoryLabel: true } },
        user: { select: { locality: { select: { id: true, name: true, province: true, latitude: true, longitude: true } } } },
      },
    }),
    capital(),
  ]);
  return ubicarProfesionales(found.map((pro) => ({ ...pro, bio: pro.bio ?? null, services: pro.services ?? [] })), { lat: respaldo.latitude, lng: respaldo.longitude }, filtros, centro, RADIO_KM);
}

type ProUbicable = SearchablePro & {
  latitude: number | null;
  longitude: number | null;
  categoryLinks: { category: { slug: string; name: string } }[];
  user: { locality: { id: string; name: string; province: string; latitude: number; longitude: number } | null } | null;
};

function ubicarProfesionales<T extends ProUbicable>(found: T[], respaldo: Punto, filtros: Filtros, centro: Punto | null, radioKm: number | null) {
  const conPunto = found.map((pro) => {
    const localidad = pro.user?.locality ?? null;
    const punto = puntoDePro(pro, localidad ? { lat: localidad.latitude, lng: localidad.longitude } : null, respaldo);
    return {
      ...pro,
      categories: pro.categoryLinks.map((link) => link.category),
      punto,
      localidadId: localidad?.id ?? null,
      localidadNombre: localidad?.name ?? null,
      provinciaNombre: localidad?.province ?? null,
      distanciaKm: centro ? haversineKm(centro, punto) : null,
    };
  });
  const dentro = centro && radioKm !== null ? conPunto.filter((pro) => pro.distanciaKm! <= radioKm) : conPunto;
  return rankProfessionals(dentro, filtros.q ?? "", (a, b) => (a.distanciaKm ?? 0) - (b.distanciaKm ?? 0));
}
