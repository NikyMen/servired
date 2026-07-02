import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const categories = [
  { slug: "hogar", name: "Hogar", icon: "🏠" },
  { slug: "plomeria", name: "Plomería", icon: "🔧" },
  { slug: "electricidad", name: "Electricidad", icon: "⚡" },
  { slug: "limpieza", name: "Limpieza", icon: "🧽" },
  { slug: "jardineria", name: "Jardinería", icon: "🌿" },
  { slug: "pintura", name: "Pintura", icon: "🎨" },
  { slug: "gasista", name: "Gasista", icon: "🔥" },
  { slug: "carpinteria", name: "Carpintería", icon: "🪚" },
  { slug: "abogado", name: "Abogados", icon: "⚖️" },
  { slug: "contador", name: "Contadores", icon: "📊" },
  { slug: "diseno", name: "Diseño", icon: "🖌️" },
];

type ProSeed = {
  name: string;
  headline: string;
  bio: string;
  categorySlug: string;
  avatarColor: string;
  rating: number;
  reviewsCount: number;
  zone: string;
  priceFrom: number;
  verified: boolean;
  featured: boolean;
  yearsExperience: number;
  services: {
    title: string;
    description: string;
    categoryLabel: string;
    priceFrom: number;
    status?: "activo" | "pausado";
    requestsCount?: number;
  }[];
  reviews: { authorName: string; rating: number; comment: string; serviceTag?: string }[];
  photos: { color: string; caption?: string }[];
};

const pros: ProSeed[] = [
  {
    name: "Carlos López",
    headline: "Plomero matriculado",
    bio: "Plomero con más de 12 años de experiencia en instalaciones y reparaciones. Trabajo prolijo, presupuesto sin cargo y garantía escrita en cada servicio.",
    categorySlug: "plomeria",
    avatarColor: "#1B4DA0",
    rating: 4.9,
    reviewsCount: 128,
    zone: "Zona Norte, CABA",
    priceFrom: 15000,
    verified: true,
    featured: true,
    yearsExperience: 12,
    services: [
      { title: "Destapaciones", description: "Destapación de cañerías con máquina.", categoryLabel: "Plomería", priceFrom: 15000, requestsCount: 14 },
      { title: "Reparación de pérdidas", description: "Detección y reparación de filtraciones.", categoryLabel: "Plomería", priceFrom: 18000, requestsCount: 9 },
      { title: "Instalación de termotanques", description: "Colocación y conexión de termotanques.", categoryLabel: "Plomería", priceFrom: 25000, requestsCount: 6 },
    ],
    reviews: [
      { authorName: "María G.", rating: 5, comment: "Puntual y muy prolijo. Resolvió una pérdida que otros no encontraban.", serviceTag: "Reparación de pérdidas" },
      { authorName: "Diego R.", rating: 5, comment: "Excelente trato y precio justo. Recomendado 100%.", serviceTag: "Destapaciones" },
      { authorName: "Sofía P.", rating: 4, comment: "Buen trabajo, llegó un poco tarde pero avisó.", serviceTag: "Instalación de termotanques" },
    ],
    photos: [
      { color: "#1B4DA0", caption: "Instalación de baño completo" },
      { color: "#2E6FB8", caption: "Reparación de cañería" },
      { color: "#0F2A52", caption: "Colocación de termotanque" },
    ],
  },
  {
    name: "Martín Gómez",
    headline: "Electricista matriculado",
    bio: "Electricista matriculado especializado en instalaciones domiciliarias y comerciales. Certificados de seguridad eléctrica y atención el mismo día.",
    categorySlug: "electricidad",
    avatarColor: "#0F2A52",
    rating: 4.8,
    reviewsCount: 96,
    zone: "CABA y alrededores",
    priceFrom: 20000,
    verified: true,
    featured: true,
    yearsExperience: 10,
    services: [
      { title: "Instalaciones eléctricas", description: "Instalaciones nuevas y mantenimiento.", categoryLabel: "Electricidad", priceFrom: 15000, status: "activo", requestsCount: 8 },
      { title: "Colocación de luminarias", description: "Colocación de todo tipo de luminarias.", categoryLabel: "Electricidad", priceFrom: 8000, status: "activo", requestsCount: 5 },
      { title: "Tableros eléctricos", description: "Armado y mantenimiento de tableros.", categoryLabel: "Electricidad", priceFrom: 20000, status: "activo", requestsCount: 3 },
      { title: "Reparaciones eléctricas", description: "Diagnóstico y solución de fallas.", categoryLabel: "Electricidad", priceFrom: 12000, status: "activo", requestsCount: 4 },
      { title: "Instalación de porteros eléctricos", description: "Instalación y configuración.", categoryLabel: "Seguridad", priceFrom: 18000, status: "pausado", requestsCount: 1 },
      { title: "Cableado estructurado", description: "Redes y cableado para empresas.", categoryLabel: "Redes", priceFrom: 25000, status: "activo", requestsCount: 2 },
    ],
    reviews: [
      { authorName: "Lucía M.", rating: 5, comment: "Instaló todo el tablero nuevo en un día. Impecable.", serviceTag: "Tableros eléctricos" },
      { authorName: "Andrés T.", rating: 5, comment: "Muy profesional, dejó todo certificado.", serviceTag: "Instalaciones eléctricas" },
      { authorName: "Carla V.", rating: 4, comment: "Resolvió el problema rápido. Buen precio.", serviceTag: "Reparaciones eléctricas" },
    ],
    photos: [
      { color: "#0F2A52", caption: "Tablero nuevo" },
      { color: "#1B4DA0", caption: "Luminarias LED" },
      { color: "#2E6FB8", caption: "Cableado de oficina" },
    ],
  },
  {
    name: "Limpieza Total",
    headline: "Servicio de limpieza",
    bio: "Equipo profesional de limpieza para hogares y oficinas. Personal de confianza, productos incluidos y resultados garantizados.",
    categorySlug: "limpieza",
    avatarColor: "#2E6FB8",
    rating: 4.7,
    reviewsCount: 73,
    zone: "CABA y GBA",
    priceFrom: 12000,
    verified: true,
    featured: true,
    yearsExperience: 6,
    services: [
      { title: "Limpieza de hogar", description: "Limpieza general y profunda.", categoryLabel: "Limpieza", priceFrom: 12000, requestsCount: 11 },
      { title: "Limpieza de oficinas", description: "Servicio recurrente para empresas.", categoryLabel: "Limpieza", priceFrom: 18000, requestsCount: 7 },
      { title: "Limpieza post obra", description: "Limpieza fina después de refacciones.", categoryLabel: "Limpieza", priceFrom: 22000, requestsCount: 4 },
    ],
    reviews: [
      { authorName: "Paula S.", rating: 5, comment: "Dejaron el departamento impecable. Muy recomendables.", serviceTag: "Limpieza de hogar" },
      { authorName: "Federico L.", rating: 4, comment: "Buen servicio y puntuales.", serviceTag: "Limpieza de oficinas" },
    ],
    photos: [
      { color: "#2E6FB8", caption: "Cocina impecable" },
      { color: "#1B4DA0", caption: "Oficina limpia" },
    ],
  },
  {
    name: "Jardines Verdes",
    headline: "Jardinería y paisajismo",
    bio: "Diseño, mantenimiento y parquización de espacios verdes. Cortamos, podamos y transformamos tu jardín.",
    categorySlug: "jardineria",
    avatarColor: "#2F7D4F",
    rating: 4.9,
    reviewsCount: 54,
    zone: "Zona Oeste, GBA",
    priceFrom: 18000,
    verified: true,
    featured: true,
    yearsExperience: 8,
    services: [
      { title: "Mantenimiento de jardín", description: "Corte de césped y poda.", categoryLabel: "Jardinería", priceFrom: 18000, requestsCount: 10 },
      { title: "Diseño de paisajismo", description: "Proyecto y ejecución de jardines.", categoryLabel: "Jardinería", priceFrom: 40000, requestsCount: 3 },
    ],
    reviews: [
      { authorName: "Roberto N.", rating: 5, comment: "Dejaron el jardín como nuevo. Muy detallistas.", serviceTag: "Mantenimiento de jardín" },
      { authorName: "Valeria C.", rating: 5, comment: "Excelente diseño, superó lo que esperaba.", serviceTag: "Diseño de paisajismo" },
    ],
    photos: [
      { color: "#2F7D4F", caption: "Jardín renovado" },
      { color: "#3E9B63", caption: "Cantero nuevo" },
    ],
  },
  {
    name: "Ana Ferreyra",
    headline: "Pintora profesional",
    bio: "Pintura de interiores y exteriores con terminaciones prolijas. Presupuesto sin cargo y materiales de primera calidad.",
    categorySlug: "pintura",
    avatarColor: "#C2554B",
    rating: 4.6,
    reviewsCount: 41,
    zone: "CABA",
    priceFrom: 10000,
    verified: true,
    featured: false,
    yearsExperience: 5,
    services: [
      { title: "Pintura de interiores", description: "Paredes, cielorrasos y aberturas.", categoryLabel: "Pintura", priceFrom: 10000, requestsCount: 8 },
      { title: "Pintura de frentes", description: "Impermeabilización y pintura exterior.", categoryLabel: "Pintura", priceFrom: 20000, requestsCount: 3 },
    ],
    reviews: [
      { authorName: "Gabriel P.", rating: 5, comment: "Terminación impecable y muy limpia.", serviceTag: "Pintura de interiores" },
    ],
    photos: [{ color: "#C2554B", caption: "Living pintado" }],
  },
  {
    name: "Roberto Díaz",
    headline: "Gasista matriculado",
    bio: "Gasista matriculado. Instalaciones, reparaciones y certificaciones de seguridad. Trabajo habilitado y garantía.",
    categorySlug: "gasista",
    avatarColor: "#B85C1E",
    rating: 4.8,
    reviewsCount: 67,
    zone: "Zona Sur, GBA",
    priceFrom: 16000,
    verified: true,
    featured: false,
    yearsExperience: 15,
    services: [
      { title: "Instalación de gas", description: "Cañerías y artefactos habilitados.", categoryLabel: "Gasista", priceFrom: 16000, requestsCount: 6 },
      { title: "Certificación de seguridad", description: "Detección de fugas y certificado.", categoryLabel: "Gasista", priceFrom: 22000, requestsCount: 4 },
    ],
    reviews: [
      { authorName: "Marina D.", rating: 5, comment: "Muy responsable, dejó todo certificado.", serviceTag: "Certificación de seguridad" },
    ],
    photos: [{ color: "#B85C1E", caption: "Instalación de cocina" }],
  },
  {
    name: "Estudio Paz & Asociados",
    headline: "Abogados",
    bio: "Estudio jurídico con atención en derecho civil, laboral y de familia. Primera consulta orientativa sin cargo.",
    categorySlug: "abogado",
    avatarColor: "#334155",
    rating: 4.9,
    reviewsCount: 38,
    zone: "CABA",
    priceFrom: 25000,
    verified: true,
    featured: false,
    yearsExperience: 20,
    services: [
      { title: "Consulta legal", description: "Asesoramiento en derecho civil y laboral.", categoryLabel: "Legal", priceFrom: 25000, requestsCount: 5 },
    ],
    reviews: [
      { authorName: "Hernán B.", rating: 5, comment: "Claros y muy profesionales. Resolvieron mi caso.", serviceTag: "Consulta legal" },
    ],
    photos: [{ color: "#334155", caption: "Estudio" }],
  },
  {
    name: "Laura Méndez",
    headline: "Contadora pública",
    bio: "Contadora pública matriculada. Monotributo, impuestos y asesoramiento para pymes y emprendedores.",
    categorySlug: "contador",
    avatarColor: "#1F6E6A",
    rating: 4.7,
    reviewsCount: 52,
    zone: "CABA y GBA",
    priceFrom: 18000,
    verified: true,
    featured: false,
    yearsExperience: 11,
    services: [
      { title: "Gestión de monotributo", description: "Altas, bajas y recategorización.", categoryLabel: "Contable", priceFrom: 18000, requestsCount: 9 },
      { title: "Asesoramiento a pymes", description: "Impuestos y liquidaciones.", categoryLabel: "Contable", priceFrom: 30000, requestsCount: 4 },
    ],
    reviews: [
      { authorName: "Nicolás F.", rating: 5, comment: "Me ordenó todo el monotributo. Muy atenta.", serviceTag: "Gestión de monotributo" },
    ],
    photos: [{ color: "#1F6E6A", caption: "Oficina" }],
  },
];

async function main() {
  console.log("🌱 Limpiando base de datos...");
  await prisma.review.deleteMany();
  await prisma.workPhoto.deleteMany();
  await prisma.service.deleteMany();
  await prisma.serviceRequest.deleteMany();
  await prisma.professional.deleteMany();
  await prisma.category.deleteMany();

  console.log("🌱 Creando categorías...");
  const categoryMap = new Map<string, string>();
  for (const c of categories) {
    const created = await prisma.category.create({ data: c });
    categoryMap.set(c.slug, created.id);
  }

  console.log("🌱 Creando profesionales...");
  for (const p of pros) {
    const categoryId = categoryMap.get(p.categorySlug);
    if (!categoryId) throw new Error(`Categoría faltante: ${p.categorySlug}`);

    await prisma.professional.create({
      data: {
        name: p.name,
        headline: p.headline,
        bio: p.bio,
        avatarColor: p.avatarColor,
        rating: p.rating,
        reviewsCount: p.reviewsCount,
        zone: p.zone,
        priceFrom: p.priceFrom,
        verified: p.verified,
        featured: p.featured,
        yearsExperience: p.yearsExperience,
        categoryId,
        services: {
          create: p.services.map((s) => ({
            title: s.title,
            description: s.description,
            categoryLabel: s.categoryLabel,
            priceFrom: s.priceFrom,
            status: s.status ?? "activo",
            requestsCount: s.requestsCount ?? 0,
          })),
        },
        reviews: { create: p.reviews },
        photos: { create: p.photos },
      },
    });
  }

  console.log("🌱 Creando solicitudes de ejemplo...");
  const requests = [
    { title: "Pérdida de agua en la cocina", description: "Tengo una pérdida debajo de la bacha de la cocina, necesito un plomero lo antes posible.", categorySlug: "plomeria", zone: "Belgrano, CABA", budget: 20000, contactName: "Julieta R." },
    { title: "Instalar 3 luminarias LED", description: "Compré 3 plafones LED y necesito que me los instalen en living y pasillo.", categorySlug: "electricidad", zone: "Caballito, CABA", budget: 15000, contactName: "Marcos D." },
    { title: "Limpieza profunda de departamento", description: "Departamento de 2 ambientes, limpieza profunda antes de mudanza.", categorySlug: "limpieza", zone: "Vicente López, GBA", budget: 18000, contactName: "Sofía L." },
    { title: "Mantenimiento de jardín mensual", description: "Busco alguien para corte de césped y poda una vez por mes en casa con jardín grande.", categorySlug: "jardineria", zone: "Ituzaingó, GBA", contactName: "Gustavo P." },
    { title: "Pintar dos habitaciones", description: "Necesito pintar dos dormitorios, paredes y techo. Color blanco.", categorySlug: "pintura", zone: "Palermo, CABA", budget: 35000, contactName: "Ana M." },
  ];

  for (const r of requests) {
    await prisma.serviceRequest.create({
      data: {
        title: r.title,
        description: r.description,
        zone: r.zone,
        budget: r.budget ?? null,
        contactName: r.contactName,
        categoryId: categoryMap.get(r.categorySlug) ?? null,
      },
    });
  }

  const total = await prisma.professional.count();
  console.log(
    `✅ Seed completo: ${categories.length} categorías, ${total} profesionales, ${requests.length} solicitudes.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
