import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { ProfessionalCard } from "@/components/ProfessionalCard";
import { HeroFondo } from "@/components/HeroFondo";
import { MapView } from "@/components/MapView";
import { rankProfessionals } from "@/lib/search";

export const dynamic = "force-dynamic";

type Search = { q?: string; categoria?: string };

async function getData({ q, categoria }: Search) {
  // Categoría y ubicación filtran en la base; el texto libre se rankea en memoria
  // (ver src/lib/search.ts: LIKE de SQLite no ignora acentos ni tolera typos).
  const where: Prisma.ProfessionalWhereInput = {};
  if (categoria) where.category = { slug: categoria };

  const [categories, found, requests, workPhotos] = await Promise.all([
    prisma.category.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.professional.findMany({
      where,
      include: {
        category: true,
        _count: { select: { bookings: { where: { status: "completada" } } } },
        bookings: {
          where: { status: "completada" },
          orderBy: { updatedAt: "desc" },
          take: 1,
          select: { finalPrice: true, service: { select: { priceFrom: true } } },
        },
        services: {
          where: { status: "activo" },
          select: { title: true, description: true, categoryLabel: true },
        },
      },
    }),
    prisma.serviceRequest.findMany({
      where: { status: "abierta" },
      orderBy: { createdAt: "desc" },
      include: { category: true },
    }),
    prisma.workPhoto.findMany({
      where: { latitude: { not: null }, longitude: { not: null } },
      orderBy: { createdAt: "desc" },
      include: { professional: { select: { id: true, name: true, businessName: true } } },
    }),
  ]);
  return { categories, pros: rankProfessionals(found, q ?? ""), requests, workPhotos };
}

function chipHref(params: Search, categoria: string) {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (categoria) sp.set("categoria", categoria);
  const qs = sp.toString();
  return qs ? `/?${qs}` : "/";
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const params = await searchParams;
  const { categories, pros, requests, workPhotos } = await getData(params);

  return (
    <div className="space-y-6">
      <aside aria-label="Publicidad" className="flex min-h-20 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/70 text-xs font-semibold tracking-[0.2em] text-slate-400 shadow-sm sm:min-h-24">
        ADS
      </aside>
      {/* Hero: oficios trabajando de noche, con el buscador apoyado encima en
          vidrio. El fondo es la foto de public/hero-soldador.jpg; si no está,
          <HeroFondo> cae en la escena dibujada en canvas. */}
      {/* z-10: el desplegable del buscador se sale del banner por abajo, y sin
          esto lo taparían los chips de categoría que vienen después. */}
      <div className="relative">
        <aside
          aria-label="Publicidad"
          className="absolute inset-y-0 right-full mr-4 hidden w-28 items-center justify-center rounded-[1.5rem] border border-dashed border-slate-300 bg-white/70 text-xs font-semibold tracking-[0.2em] text-slate-400 shadow-sm xl:flex 2xl:w-44"
        >
          ADS
        </aside>

        {/* min-h más bajo que antes: en móvil el alto es lo que decide cuánto
            se agranda la foto, así que un banner menos alto deja entrar más
            escena a lo ancho en vez de un primer plano. En md+ manda la
            proporción de la foto (ver .hero-weld en globals.css). */}
        <section className="hero-weld relative z-10 min-h-[215px] rounded-[1.5rem] p-5 text-white sm:min-h-[470px] sm:p-8 md:p-10">
          <HeroFondo />

          <div className="hero-weld-content flex min-h-[175px] flex-col justify-center sm:min-h-[406px] sm:justify-between md:min-h-[390px]">
            <div className="max-w-2xl">
              <span className="glass glass-thin glass-dark hero-arc-glow inline-flex rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.2em] uppercase">
                ServiRed · oficios que resuelven
              </span>
              <h1 className="mt-5 max-w-xl text-3xl leading-[1.1] font-bold tracking-tight drop-shadow-[0_2px_18px_rgba(2,6,23,0.8)] sm:text-4xl md:text-5xl">
                Tu problema tiene solución. Encontrala acá.
              </h1>
            </div>

          </div>
        </section>

        <aside
          aria-label="Publicidad"
          className="absolute inset-y-0 left-full ml-4 hidden w-28 items-center justify-center rounded-[1.5rem] border border-dashed border-slate-300 bg-white/70 text-xs font-semibold tracking-[0.2em] text-slate-400 shadow-sm xl:flex 2xl:w-44"
        >
          ADS
        </aside>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:hidden">
        <aside aria-label="Publicidad lateral izquierda" className="flex min-h-24 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/70 text-xs font-semibold tracking-[0.2em] text-slate-400">ADS</aside>
        <aside aria-label="Publicidad lateral derecha" className="flex min-h-24 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/70 text-xs font-semibold tracking-[0.2em] text-slate-400">ADS</aside>
      </div>

      {/* Categorías: carrusel horizontal en móvil, wrap en desktop */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
        <Link
          href={chipHref(params, "")}
          className={`glass-chip shrink-0 px-3.5 py-2 text-sm font-medium whitespace-nowrap ${
            !params.categoria ? "glass-chip-on" : "text-slate-600"
          }`}
        >
          Todos
        </Link>
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={chipHref(params, c.slug)}
            className={`glass-chip shrink-0 px-3.5 py-2 text-sm font-medium whitespace-nowrap ${
              params.categoria === c.slug ? "glass-chip-on" : "text-slate-600"
            }`}
          >
            {c.icon} {c.name}
          </Link>
        ))}
      </div>

      {/* Resultados */}
      {pros.length === 0 ? (
        <div className="glass glass-solid rounded-[1.5rem] p-12 text-center">
          <p className="text-lg font-semibold text-slate-900">Sin resultados</p>
          <p className="mt-1 text-slate-500">
            Probá con otra categoría o término de búsqueda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {pros.map((p) => (
            <ProfessionalCard
              key={p.id}
              pro={{
                id: p.id,
                name: p.name,
                headline: p.headline,
                category: { slug: p.category.slug, name: p.category.name, icon: p.category.icon },
                avatarColor: p.avatarColor,
                avatarUrl: p.avatarUrl,
                rating: p.rating,
                reviewsCount: p.reviewsCount,
                zone: p.zone,
                lastWorkPrice: p.bookings[0]?.finalPrice ?? p.bookings[0]?.service?.priceFrom ?? null,
                completedJobs: p._count.bookings,
                verified: p.verified,
                featured: p.featured,
                yearsExperience: p.yearsExperience,
              }}
            />
          ))}
        </div>
      )}

      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Mapa de oportunidades</h2>
          <p className="text-sm text-slate-500">Trabajos abiertos y profesionales o negocios adheridos en Corrientes.</p>
        </div>
        <MapView
          points={[
            ...pros.map((p, index) => ({
              id: p.id, type: "profesional" as const, title: p.businessName || p.name,
              subtitle: `${p.headline} · ${p.zone}`, latitude: p.latitude ?? -27.4692 + (index % 4) * 0.008, longitude: p.longitude ?? -58.8306 + (index % 5) * 0.009, href: `/profesionales/${p.id}`,
            })),
            ...requests.map((r) => ({
              id: r.id, type: "solicitud" as const, title: r.title,
              subtitle: `${r.category?.name ?? "Otro"} · ${r.zone}`, latitude: r.latitude, longitude: r.longitude, href: "/solicitudes",
            })),
            ...workPhotos.map((work) => ({
              id: work.id, type: "trabajo" as const, title: work.title,
              subtitle: `${work.professional.businessName || work.professional.name} · ${work.address || "Corrientes"}`, latitude: work.latitude!, longitude: work.longitude!, href: `/profesionales/${work.professional.id}`,
            })),
          ]}
        />
        <div className="flex flex-wrap gap-3 text-xs text-slate-500"><span>🟢 Profesionales</span><span>🔵 Trabajos abiertos</span><span>🟠 Trabajos realizados</span></div>
      </section>

      {/* CTA solicitud */}
      <section className="glass glass-solid glass-card flex flex-col items-start justify-between gap-3 rounded-[1.5rem] p-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-bold text-slate-900">¿No encontrás lo que buscás?</h2>
          <p className="text-sm text-slate-500">
            Publicá tu solicitud y los profesionales te contactan.
          </p>
        </div>
        <Link href="/publicar-solicitud" className="glass-btn shrink-0 px-4 py-2.5 text-sm">
          Publicar solicitud
        </Link>
      </section>

      {/* CTA preinscripción */}
      <section className="glass glass-solid glass-card flex flex-col items-start justify-between gap-3 rounded-[1.5rem] p-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-bold text-slate-900">¿Todavía no estamos en tu zona?</h2>
          <p className="text-sm text-slate-500">
            Preinscribite y te avisamos apenas abramos, seas cliente o profesional.
          </p>
        </div>
        <Link
          href="/preinscripcion"
          className="glass-btn glass-btn-ghost shrink-0 px-4 py-2.5 text-sm"
        >
          Preinscribirme
        </Link>
      </section>
    </div>
  );
}
