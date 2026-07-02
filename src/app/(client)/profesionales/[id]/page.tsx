import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatARS } from "@/lib/format";
import { Avatar, Rating, VerifiedBadge, Button, StatusPill } from "@/components/ui";
import { StarIcon, MapPinIcon, ChatIcon, ExternalIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

async function getPro(id: string) {
  return prisma.professional.findUnique({
    where: { id },
    include: {
      category: true,
      services: { orderBy: { createdAt: "asc" } },
      reviews: { orderBy: { createdAt: "desc" } },
      photos: true,
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

  const activeServices = pro.services.filter((s) => s.status === "activo");

  return (
    <div className="space-y-6">
      <Link href="/buscar" className="text-sm font-medium text-brand-blue hover:underline">
        ← Volver a explorar
      </Link>

      {/* Encabezado del perfil */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div
          className="h-32 md:h-40"
          style={{
            background: `linear-gradient(135deg, ${pro.avatarColor} 0%, ${pro.avatarColor}bb 100%)`,
          }}
        />
        <div className="px-6 pb-6">
          <div className="-mt-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex items-end gap-4">
              <Avatar name={pro.name} color={pro.avatarColor} size={96} ring />
              <div className="pb-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-navy-900">{pro.name}</h1>
                  {pro.verified && <VerifiedBadge className="[&>svg]:h-6 [&>svg]:w-6" />}
                </div>
                <p className="text-slate-500">
                  {pro.headline} · {pro.category.icon} {pro.category.name}
                </p>
              </div>
            </div>
            <div className="flex gap-2 pb-1">
              <Button variant="outline">
                <ChatIcon width={18} height={18} /> Mensaje
              </Button>
              <Button variant="primary">
                <ExternalIcon width={18} height={18} /> Contratar
              </Button>
            </div>
          </div>

          {/* Métricas rápidas */}
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-4">
            <Metric label="Calificación" value={pro.rating.toFixed(1)} sub={`${pro.reviewsCount} opiniones`} star />
            <Metric label="Experiencia" value={`${pro.yearsExperience} años`} sub="en el rubro" />
            <Metric label="Zona" value={pro.zone} />
            <Metric label="Precio desde" value={formatARS(pro.priceFrom)} />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Contenido principal */}
        <div className="min-w-0 space-y-6">
          {/* Sobre mí */}
          {pro.bio && (
            <Card title="Sobre el profesional">
              <p className="text-slate-600">{pro.bio}</p>
            </Card>
          )}

          {/* Servicios ofrecidos */}
          <Card title="Servicios ofrecidos">
            <ul className="divide-y divide-slate-100">
              {activeServices.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-medium text-navy-900">{s.title}</p>
                    <p className="text-sm text-slate-500">{s.description}</p>
                    <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                      {s.categoryLabel}
                    </span>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm text-slate-400">desde</p>
                    <p className="font-semibold text-navy-900">{formatARS(s.priceFrom)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {/* Fotos de trabajos */}
          {pro.photos.length > 0 && (
            <Card title="Fotos de trabajos realizados">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {pro.photos.map((ph) => (
                  <div
                    key={ph.id}
                    className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl"
                    style={{ background: `linear-gradient(135deg, ${ph.color}, ${ph.color}aa)` }}
                  >
                    <span className="text-4xl opacity-90">{pro.category.icon}</span>
                    {ph.caption && (
                      <span className="absolute bottom-0 left-0 right-0 bg-black/30 px-2 py-1 text-xs text-white">
                        {ph.caption}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Opiniones */}
          <Card title={`Opiniones verificadas (${pro.reviews.length})`}>
            <ul className="space-y-5">
              {pro.reviews.map((r) => (
                <li key={r.id} className="flex gap-3">
                  <Avatar name={r.authorName} color="#94a3b8" size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-navy-900">{r.authorName}</p>
                      <span className="text-xs text-slate-400">
                        {new Date(r.createdAt).toLocaleDateString("es-AR")}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 text-amber-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <StarIcon key={i} width={14} height={14} filled={i < r.rating} className={i < r.rating ? "" : "text-slate-200"} />
                      ))}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{r.comment}</p>
                    {r.serviceTag && (
                      <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                        {r.serviceTag}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Panel de contratación */}
        <aside className="space-y-4">
          <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Precio desde</p>
            <p className="text-2xl font-bold text-navy-900">{formatARS(pro.priceFrom)}</p>
            <div className="mt-2">
              <Rating value={pro.rating} count={pro.reviewsCount} />
            </div>

            <Button variant="primary" className="mt-4 w-full">
              <ExternalIcon width={18} height={18} /> Contratar ahora
            </Button>
            <Button variant="outline" className="mt-2 w-full">
              <ChatIcon width={18} height={18} /> Enviar mensaje
            </Button>

            <div className="mt-5 space-y-3 border-t border-slate-100 pt-4 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <MapPinIcon width={16} height={16} className="text-slate-400" />
                Cobertura: {pro.zone}
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <span className="text-brand-blue"><VerifiedBadge /></span>
                {pro.verified ? "Identidad verificada" : "Sin verificar"}
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <StatusPill status="activo" /> {activeServices.length} servicios activos
              </div>
            </div>

            <p className="mt-4 rounded-xl bg-brand-blue/5 p-3 text-xs text-slate-500">
              🔒 Tu pago queda protegido: liberamos el dinero al profesional recién cuando confirmás el servicio.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
  star,
}: {
  label: string;
  value: string;
  sub?: string;
  star?: boolean;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 flex items-center gap-1 font-semibold text-navy-900">
        {star && <StarIcon width={16} height={16} className="text-amber-400" />}
        {value}
      </p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-bold text-navy-900">{title}</h2>
      {children}
    </section>
  );
}
