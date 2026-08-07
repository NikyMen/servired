import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { ProfessionalCard } from "@/components/ProfessionalCard";
import { SearchBox } from "@/components/SearchBox";
import { HeroFondo } from "@/components/HeroFondo";
import { normalize, rankProfessionals } from "@/lib/search";

export const dynamic = "force-dynamic";

type Search = { q?: string; categoria?: string; ubicacion?: string };
const popularSearches = ["Pérdida de agua", "Luminarias LED", "Limpieza profunda"];

async function getData({ q, categoria, ubicacion }: Search) {
  // Categoría y ubicación filtran en la base; el texto libre se rankea en memoria
  // (ver src/lib/search.ts: LIKE de SQLite no ignora acentos ni tolera typos).
  const where: Prisma.ProfessionalWhereInput = {};
  if (categoria) where.category = { slug: categoria };

  const [categories, found] = await Promise.all([
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
  ]);

  // La zona también se compara normalizada: "Núñez" tiene que encontrarse con "nunez".
  const byZone = ubicacion?.trim()
    ? found.filter((p) => {
        const zone = normalize(p.zone);
        return normalize(ubicacion).split(" ").every((term) => zone.includes(term));
      })
    : found;

  return { categories, pros: rankProfessionals(byZone, q ?? "") };
}

function chipHref(params: Search, categoria: string) {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.ubicacion) sp.set("ubicacion", params.ubicacion);
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
  const { categories, pros } = await getData(params);

  return (
    <div className="space-y-6">
      {/* Hero: oficios trabajando de noche, con el buscador apoyado encima en
          vidrio. El fondo es la foto de public/hero-soldador.jpg; si no está,
          <HeroFondo> cae en la escena dibujada en canvas. */}
      {/* z-10: el desplegable del buscador se sale del banner por abajo, y sin
          esto lo taparían los chips de categoría que vienen después. */}
      <div className="relative">
        <aside
          aria-label="Publicidad"
          className="absolute top-1/2 right-full mr-4 hidden h-48 w-28 -translate-y-1/2 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 text-xs font-semibold tracking-[0.2em] text-slate-400 shadow-sm backdrop-blur-sm xl:flex 2xl:w-44"
        >
          ADS
        </aside>

        <section className="hero-weld relative z-10 min-h-[480px] rounded-[2rem] p-5 text-white sm:min-h-[520px] sm:p-8 md:p-10">
          <HeroFondo />

          <div className="hero-weld-content flex min-h-[440px] flex-col justify-between">
            <div className="max-w-2xl">
              <span className="glass glass-thin glass-dark hero-arc-glow inline-flex rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.2em] uppercase">
                ServiRed · oficios que resuelven
              </span>
              <h1 className="mt-5 max-w-xl text-3xl leading-[1.1] font-bold tracking-tight drop-shadow-[0_2px_18px_rgba(2,6,23,0.8)] sm:text-4xl md:text-5xl">
                Tu problema tiene solución. Encontrala acá.
              </h1>
              <p className="mt-3 max-w-lg text-sm leading-6 text-slate-200 drop-shadow-[0_1px_10px_rgba(2,6,23,0.9)] sm:text-base">
                Soldadores, plomeros, electricistas y más. Verificados, con
                trabajos hechos a la vista y contacto directo para coordinar sin
                vueltas.
              </p>
            </div>

            <div className="mt-8">
              <SearchBox
                defaultQuery={params.q ?? ""}
                defaultZone={params.ubicacion ?? ""}
                categoria={params.categoria}
              />
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-white/90">Probá con:</span>
                {popularSearches.map((term) => (
                  <Link
                    key={term}
                    href={`/?q=${encodeURIComponent(term)}`}
                    className="glass glass-thin glass-dark rounded-full px-3 py-1.5 transition hover:bg-white/20"
                  >
                    {term}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <aside
          aria-label="Publicidad"
          className="absolute top-1/2 left-full ml-4 hidden h-48 w-28 -translate-y-1/2 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 text-xs font-semibold tracking-[0.2em] text-slate-400 shadow-sm backdrop-blur-sm xl:flex 2xl:w-44"
        >
          ADS
        </aside>
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
            Probá con otra categoría, ubicación o término de búsqueda.
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
