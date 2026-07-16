import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { ProfessionalCard } from "@/components/ProfessionalCard";
import { SearchIcon, MapPinIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

type Search = { q?: string; categoria?: string; ubicacion?: string };

async function getData({ q, categoria, ubicacion }: Search) {
  const where: Prisma.ProfessionalWhereInput = {};
  if (categoria) where.category = { slug: categoria };
  if (ubicacion) where.zone = { contains: ubicacion };
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { headline: { contains: q } },
      { bio: { contains: q } },
      { services: { some: { title: { contains: q } } } },
      { category: { name: { contains: q } } },
    ];
  }

  const [categories, pros] = await Promise.all([
    prisma.category.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.professional.findMany({
      where,
      orderBy: [{ featured: "desc" }, { rating: "desc" }],
      include: { category: true },
    }),
  ]);

  return { categories, pros };
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

        <form action="/" className="mt-5 flex flex-col gap-2 rounded-xl bg-white p-2 md:flex-row">
          <div className="flex flex-1 items-center gap-2 px-3">
            <SearchIcon className="shrink-0 text-slate-400" width={18} height={18} />
            <input
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Plomería, electricidad, limpieza…"
              className="w-full bg-transparent py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>
          <div className="flex items-center gap-2 border-t border-slate-200 px-3 md:w-52 md:border-l md:border-t-0">
            <MapPinIcon className="shrink-0 text-slate-400" width={18} height={18} />
            <input
              name="ubicacion"
              defaultValue={params.ubicacion ?? ""}
              placeholder="Ubicación"
              className="w-full bg-transparent py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>
          {params.categoria && <input type="hidden" name="categoria" value={params.categoria} />}
          <button
            type="submit"
            className="rounded-lg bg-cliente px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cliente-dark"
          >
            Buscar
          </button>
        </form>
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
