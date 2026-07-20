import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { ProfessionalCard } from "@/components/ProfessionalCard";
import { SearchBox } from "@/components/SearchBox";
import { normalize, rankProfessionals } from "@/lib/search";

export const dynamic = "force-dynamic";

type Search = { q?: string; categoria?: string; ubicacion?: string };

async function getData({ q, categoria, ubicacion }: Search) {
  // Categoría y ubicación filtran en la base; el texto libre se rankea en memoria
  // (ver src/lib/search.ts: LIKE de SQLite no ignora acentos ni tolera typos).
  const where: Prisma.ProfessionalWhereInput = {};
  if (categoria) where.category = { slug: categoria };

  const [categories, found] = await Promise.all([
    prisma.category.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.professional.findMany({
      where,
      include: { category: true, services: { select: { title: true, description: true } } },
    }),
  ]);

  // La zona también se compara normalizada: "Núñez" tiene que encontrarse con "nunez".
  const byZone = ubicacion?.trim()
    ? found.filter((p) => normalize(p.zone).includes(normalize(ubicacion)))
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
      {/* Hero + buscador */}
      <section className="rounded-2xl bg-cliente p-5 text-white sm:p-6 md:p-8">
        <h1 className="text-2xl font-bold md:text-3xl">
          ¿Qué servicio necesitás?
        </h1>
        <p className="mt-1 text-blue-100">
          Buscá profesionales verificados, contratá y coordiná por mensaje.
        </p>

        <SearchBox
          defaultQuery={params.q ?? ""}
          defaultZone={params.ubicacion ?? ""}
          categoria={params.categoria}
        />
      </section>

      {/* Categorías: carrusel horizontal en móvil, wrap en desktop */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
        <Link
          href={chipHref(params, "")}
          className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
            !params.categoria
              ? "border-cliente bg-cliente text-white"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
          }`}
        >
          Todos
        </Link>
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={chipHref(params, c.slug)}
            className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
              params.categoria === c.slug
                ? "border-cliente bg-cliente text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            {c.icon} {c.name}
          </Link>
        ))}
      </div>

      {/* Resultados */}
      {pros.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
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
                priceFrom: p.priceFrom,
                verified: p.verified,
                featured: p.featured,
                yearsExperience: p.yearsExperience,
              }}
            />
          ))}
        </div>
      )}

      {/* CTA solicitud */}
      <section className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-bold text-slate-900">¿No encontrás lo que buscás?</h2>
          <p className="text-sm text-slate-500">
            Publicá tu solicitud y los profesionales te contactan.
          </p>
        </div>
        <Link
          href="/publicar-solicitud"
          className="shrink-0 rounded-xl bg-cliente px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cliente-dark"
        >
          Publicar solicitud
        </Link>
      </section>

      {/* CTA preinscripción */}
      <section className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-bold text-slate-900">¿Todavía no estamos en tu zona?</h2>
          <p className="text-sm text-slate-500">
            Preinscribite y te avisamos apenas abramos, seas cliente o profesional.
          </p>
        </div>
        <Link
          href="/preinscripcion"
          className="shrink-0 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Preinscribirme
        </Link>
      </section>
    </div>
  );
}
