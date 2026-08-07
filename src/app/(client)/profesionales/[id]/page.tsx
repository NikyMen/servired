import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatARS } from "@/lib/format";
import { Avatar, Rating, VerifiedBadge } from "@/components/ui";
import { ContratarBox } from "@/components/ContratarBox";
import { ContratarSheet } from "@/components/ContratarSheet";
import { StarIcon, MapPinIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

async function getPro(id: string) {
  return prisma.professional.findUnique({
    where: { id },
    include: {
      category: true,
      services: { where: { status: "activo" }, orderBy: { createdAt: "asc" } },
      reviews: { orderBy: { createdAt: "desc" } },
      bookings: {
        where: { status: "completada" },
        orderBy: { updatedAt: "desc" },
        include: {
          user: { select: { name: true, avatarColor: true } },
          service: { select: { title: true, description: true, priceFrom: true } },
        },
      },
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const pro = await getPro(id);
  return { title: pro ? `${pro.name} — ${pro.headline}` : "Profesional" };
}

export default async function ProfesionalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pro = await getPro(id);
  if (!pro) notFound();

  return (
    <div className="space-y-6">
      <Link href="/" className="text-sm font-medium text-cliente hover:underline">
        ← Volver a la búsqueda
      </Link>

      {/* Encabezado del perfil */}
      <section className="glass glass-solid rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <Avatar name={pro.name} color={pro.avatarColor} size={64} />
            <div className="min-w-0 flex-1 sm:hidden">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">{pro.name}</h1>
                {pro.verified && <VerifiedBadge />}
              </div>
              <p className="text-sm text-slate-500">
                {pro.headline} · {pro.category.icon} {pro.category.name}
              </p>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="hidden items-center gap-2 sm:flex">
              <h1 className="text-2xl font-bold text-slate-900">{pro.name}</h1>
              {pro.verified && <VerifiedBadge className="[&>svg]:h-6 [&>svg]:w-6" />}
            </div>
            <p className="hidden text-slate-500 sm:block">
              {pro.headline} · {pro.category.icon} {pro.category.name}
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 sm:mt-1">
              <Rating value={pro.rating} count={pro.reviewsCount} />
              <span className="flex items-center gap-1">
                <MapPinIcon width={15} height={15} className="text-slate-400" />
                {pro.zone}
              </span>
              <span>{pro.yearsExperience} años de experiencia</span>
            </div>
          </div>
        </div>
        {pro.bio && <p className="mt-4 border-t border-white/60 pt-4 text-sm text-slate-600 sm:text-base">{pro.bio}</p>}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          {/* Servicios */}
          <section className="glass glass-solid rounded-2xl p-4 sm:p-6">
            <h2 className="mb-4 text-lg font-bold text-slate-900">Servicios</h2>
            <ul className="divide-y divide-white/60">
              {pro.services.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-medium text-slate-900">{s.title}</p>
                    <p className="text-sm text-slate-500">{s.description}</p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-pro-dark">Presupuesto a convenir</p>
                </li>
              ))}
            </ul>
          </section>

          {/* Historial público de trabajos: conecta cliente, profesional y monto final. */}
          {pro.bookings.length > 0 && (
            <section className="glass glass-solid rounded-2xl p-4 sm:p-6">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold tracking-[0.16em] text-pro uppercase">Experiencia comprobable</p>
                  <h2 className="mt-1 text-lg font-bold text-slate-900">Trabajos realizados</h2>
                </div>
                <span className="rounded-full bg-emerald-500/12 px-2.5 py-1 text-xs font-semibold text-pro-dark ring-1 ring-emerald-400/25 ring-inset backdrop-blur-sm">
                  {pro.bookings.length} completado{pro.bookings.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {pro.bookings.map((booking) => {
                  const amount = booking.finalPrice ?? booking.service?.priceFrom;
                  return (
                    <article key={booking.id} className="glass glass-thin rounded-2xl border-emerald-300/35 bg-emerald-400/8 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-slate-900">
                            {booking.service?.title ?? "Servicio personalizado"}
                          </h3>
                          <p className="mt-1 text-sm leading-5 text-slate-600">
                            {booking.workSummary ?? booking.service?.description ?? "Trabajo coordinado por ServiRed."}
                          </p>
                        </div>
                        {amount != null && (
                          <div className="shrink-0 text-right">
                            <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">Monto final</p>
                            <p className="font-bold text-pro-dark">{formatARS(amount)}</p>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-emerald-100 pt-3 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Avatar name={booking.user.name ?? booking.clientName} color={booking.user.avatarColor} size={22} />
                          Contrató {booking.user.name ?? booking.clientName}
                        </span>
                        <span>·</span>
                        <span>Realizó {pro.name}</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {/* Opiniones */}
          <section className="glass glass-solid rounded-2xl p-4 sm:p-6">
            <h2 className="mb-4 text-lg font-bold text-slate-900">
              Opiniones ({pro.reviews.length})
            </h2>
            <ul className="space-y-5">
              {pro.reviews.map((r) => (
                <li key={r.id} className="flex gap-3">
                  <Avatar name={r.authorName} color="#94a3b8" size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-slate-900">{r.authorName}</p>
                      <span className="text-xs text-slate-400">
                        {new Date(r.createdAt).toLocaleDateString("es-AR")}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 text-amber-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <StarIcon
                          key={i}
                          width={14}
                          height={14}
                          filled={i < r.rating}
                          className={i < r.rating ? "" : "text-slate-200"}
                        />
                      ))}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{r.comment}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Contratación (desktop: tarjeta fija al costado) */}
        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <ContratarBox
              professionalId={pro.id}
              services={pro.services.map((s) => ({
                id: s.id,
                title: s.title,
                priceFrom: s.priceFrom,
              }))}
            />
          </div>
        </aside>
      </div>

      {/* Contratación (móvil: barra fija + bottom sheet) */}
      <ContratarSheet
        professionalId={pro.id}
        proName={pro.name}
        services={pro.services.map((s) => ({
          id: s.id,
          title: s.title,
          priceFrom: s.priceFrom,
        }))}
      />
    </div>
  );
}
