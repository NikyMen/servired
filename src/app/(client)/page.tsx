import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { CategoryItem, ProCard } from "@/lib/types";
import { CategoryChips } from "@/components/CategoryChips";
import { ProfessionalCard } from "@/components/ProfessionalCard";
import { Avatar, Rating } from "@/components/ui";
import {
  ShieldIcon,
  VerifiedIcon,
  StarIcon,
  HeadsetIcon,
  ExternalIcon,
  CheckCircleIcon,
  ChatIcon,
} from "@/components/icons";

export const dynamic = "force-dynamic";

async function getData() {
  const [categoriesRaw, prosRaw] = await Promise.all([
    prisma.category.findMany({
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { professionals: true } } },
    }),
    prisma.professional.findMany({
      where: { featured: true },
      orderBy: { rating: "desc" },
      include: { category: true },
      take: 4,
    }),
  ]);

  const categories: CategoryItem[] = categoriesRaw.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    icon: c.icon,
    count: c._count.professionals,
  }));

  const pros: ProCard[] = prosRaw.map((p) => ({
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
  }));

  return { categories, pros };
}

const trust = [
  { icon: ShieldIcon, title: "Pagos seguros", text: "Tu pago está protegido hasta que el servicio sea realizado." },
  { icon: VerifiedIcon, title: "Profesionales verificados", text: "Revisamos identidad, experiencia y opiniones para garantizar confianza." },
  { icon: StarIcon, title: "Opiniones reales", text: "Calificaciones de clientes verificados que ya contrataron el servicio." },
  { icon: HeadsetIcon, title: "Soporte 24/7", text: "Estamos para ayudarte en todo momento." },
];

const activity = [
  { color: "bg-emerald-500", icon: CheckCircleIcon, title: "Tu pago fue procesado", sub: "Servicio de Plomería", time: "Hace 2 horas" },
  { color: "bg-brand-blue", icon: ChatIcon, title: "Nuevo mensaje", sub: "De Carlos López", time: "Hace 5 horas" },
  { color: "bg-emerald-500", icon: CheckCircleIcon, title: "Servicio confirmado", sub: "Electricista", time: "Hace 1 día" },
];

export default async function HomePage() {
  const { categories, pros } = await getData();

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
      {/* Columna principal */}
      <div className="min-w-0 space-y-8">
        {/* Hero */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="grid gap-6 p-6 md:grid-cols-[1.4fr_1fr] md:p-8">
            <div>
              <h1 className="text-3xl font-bold leading-tight text-navy-900 md:text-4xl">
                Encontrá al profesional ideal para lo que necesitás
              </h1>
              <p className="mt-3 max-w-lg text-slate-500">
                Profesionales verificados, opiniones reales y pagos seguros.
                Conectamos personas con servicios de confianza.
              </p>
              <div className="mt-6">
                <CategoryChips categories={categories} max={5} />
              </div>
            </div>

            {/* Ilustración */}
            <div className="relative hidden items-center justify-center md:flex">
              <div className="flex h-56 w-56 items-center justify-center rounded-full bg-brand-blue/10">
                <div className="flex h-40 w-40 items-center justify-center rounded-full bg-brand-blue/20 text-7xl">
                  🧰
                </div>
              </div>
              <div className="absolute bottom-2 left-0 flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-md ring-1 ring-slate-100">
                <span className="text-brand-blue">
                  <VerifiedIcon width={20} height={20} />
                </span>
                <span className="text-xs font-medium text-navy-900">
                  Profesionales verificados
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Profesionales destacados */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-navy-900">Profesionales destacados</h2>
            <Link href="/buscar" className="text-sm font-medium text-brand-blue hover:underline">
              Ver todos
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-4">
            {pros.map((pro) => (
              <ProfessionalCard key={pro.id} pro={pro} />
            ))}
          </div>
        </section>

        {/* Confianza */}
        <section className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-6 sm:grid-cols-2 lg:grid-cols-4">
          {trust.map((t) => {
            const Icon = t.icon;
            return (
              <div key={t.title} className="flex gap-3">
                <span className="mt-0.5 text-brand-blue">
                  <Icon width={26} height={26} />
                </span>
                <div>
                  <p className="font-semibold text-navy-900">{t.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{t.text}</p>
                </div>
              </div>
            );
          })}
        </section>
      </div>

      {/* Columna lateral derecha */}
      <aside className="space-y-6">
        {/* Solicitá un servicio */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="font-bold text-navy-900">Solicitá un servicio</h3>
          <p className="mt-1 text-sm text-slate-500">
            Contanos qué necesitás y recibí presupuestos de profesionales cercanos.
          </p>
          <Link
            href="/publicar-solicitud"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-blue py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-blue/90"
          >
            <ExternalIcon width={18} height={18} />
            Publicar solicitud
          </Link>
          <Link
            href="/solicitudes"
            className="mt-2 block text-center text-sm font-medium text-brand-blue hover:underline"
          >
            Ver solicitudes abiertas
          </Link>
        </div>

        {/* Actividad reciente */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="font-bold text-navy-900">Actividad reciente</h3>
          <ul className="mt-4 space-y-4">
            {activity.map((a, i) => {
              const Icon = a.icon;
              return (
                <li key={i} className="flex gap-3">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${a.color}`}>
                    <Icon width={18} height={18} />
                  </span>
                  <div className="text-sm">
                    <p className="font-semibold text-navy-900">{a.title}</p>
                    <p className="text-slate-500">{a.sub}</p>
                    <p className="text-xs text-slate-400">{a.time}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          <button className="mt-4 text-sm font-medium text-brand-blue hover:underline">
            Ver toda la actividad
          </button>
        </div>

        {/* Tus contrataciones */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-navy-900">Tus contrataciones</h3>
            <Link href="/mis-contrataciones" className="text-xs font-medium text-brand-blue hover:underline">
              Ver todas
            </Link>
          </div>
          <div className="mt-4 flex gap-3">
            <Avatar name="Limpieza Total" color="#2E6FB8" size={44} />
            <div className="text-sm">
              <p className="font-semibold text-navy-900">Limpieza de hogar</p>
              <p className="text-emerald-600">Completado</p>
              <div className="mt-0.5 flex items-center gap-2 text-slate-500">
                <span>Limpieza Total</span>
                <Rating value={4.7} />
              </div>
              <p className="text-xs text-slate-400">10/05/2024</p>
            </div>
          </div>
          <button className="mt-4 w-full rounded-xl border border-slate-300 py-2.5 text-sm font-medium text-brand-blue transition-colors hover:bg-slate-50">
            Dejar una opinión
          </button>
        </div>
      </aside>
    </div>
  );
}
