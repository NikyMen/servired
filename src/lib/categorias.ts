export const CATEGORY_KIND = "categoria";

export const CATEGORY_GROUPS = [
  {
    slug: "categoria-hogar",
    name: "Hogar",
    icon: "🏠",
    members: [
      "hogar", "arquitecto", "albanil", "carpinteria", "cerrajero", "electricidad", "electricista", "fumigador", "gasista",
      "herrero", "jardineria", "limpieza", "pintor", "pintura", "plomeria", "refrigeracion", "reparaciones-del-hogar",
      "reparaciones-hogar", "revestimientos", "tapicero", "trabajos-con-durlock", "trabajos-durlock", "vidriero",
    ],
  },
  {
    slug: "legal-finanzas",
    name: "Legal y finanzas",
    icon: "⚖️",
    members: ["abogado", "abogados", "consultoria", "consultorias", "contador", "contadores", "escribano", "gestion-de-tramites", "gestion-tramites", "seguros"],
  },
  {
    slug: "tecnologia-diseno",
    name: "Tecnología y diseño",
    icon: "💻",
    members: ["diseno", "disenador-grafico", "programador", "tecnico-en-computacion"],
  },
  {
    slug: "salud-cuidados",
    name: "Salud y cuidados",
    icon: "💚",
    members: ["cuidado-de-personas", "cuidado-personas", "cuidado-de-mascotas", "cuidado-mascotas", "masajista", "veterinario"],
  },
  {
    slug: "educacion-comunicacion",
    name: "Educación y comunicación",
    icon: "📚",
    members: ["licenciaturas", "periodista", "profesor-particular"],
  },
  {
    slug: "eventos-gastronomia",
    name: "Eventos y gastronomía",
    icon: "🎉",
    members: ["barista", "cocinero", "dj", "fotografo", "org-de-eventos", "org-eventos", "organizacion-de-eventos", "organizacion-eventos"],
  },
  {
    slug: "vehiculos-transporte",
    name: "Vehículos y transporte",
    icon: "🚗",
    members: ["baterias", "flete-mudanzas", "gomeria", "mecanica"],
  },
  {
    slug: "otros-servicios",
    name: "Otros servicios",
    icon: "🧰",
    members: ["otro"],
  },
] as const;

export const CATEGORY_GROUP_SLUGS = new Set<string>(CATEGORY_GROUPS.map((group) => group.slug));

export function groupSlugForCategory(slug: string): string {
  return CATEGORY_GROUPS.find((group) => (group.members as readonly string[]).includes(slug))?.slug ?? "otros-servicios";
}
