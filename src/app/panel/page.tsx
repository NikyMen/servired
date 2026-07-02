import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatARS, formatNumber } from "@/lib/format";
import { PanelTopbar } from "@/components/PanelTopbar";
import { PanelSidebar } from "@/components/PanelSidebar";
import { Button, StatusPill } from "@/components/ui";
import {
  BriefcaseIcon,
  EyeIcon,
  StarIcon,
  CheckCircleIcon,
  WalletIcon,
  PlusIcon,
  ExternalIcon,
  PencilIcon,
  ChartIcon,
  DotsIcon,
} from "@/components/icons";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Panel del profesional" };

async function getOwner() {
  // El profesional "logueado" en la demo: el electricista con su cartera de servicios.
  return prisma.professional.findFirst({
    where: { category: { slug: "electricidad" } },
    include: { services: { orderBy: { createdAt: "asc" } }, category: true },
  });
}

export default async function PanelPage() {
  const pro = await getOwner();
  if (!pro) notFound();

  const solicitudes = pro.services.reduce((acc, s) => acc + s.requestsCount, 0);
  const activos = pro.services.filter((s) => s.status === "activo").length;

  const stats = [
    { icon: BriefcaseIcon, tint: "bg-brand-blue/10 text-brand-blue", label: "Servicios publicados", value: String(pro.services.length), sub: `${activos} activos` },
    { icon: EyeIcon, tint: "bg-emerald-50 text-emerald-600", label: "Visualizaciones", value: formatNumber(1248), sub: "Este mes" },
    { icon: StarIcon, tint: "bg-amber-50 text-amber-500", label: "Solicitudes", value: String(solicitudes), sub: "Este mes" },
    { icon: CheckCircleIcon, tint: "bg-violet-50 text-violet-600", label: "Contrataciones", value: "18", sub: "Este mes" },
    { icon: WalletIcon, tint: "bg-rose-50 text-rose-600", label: "Ingresos", value: formatARS(1250000), sub: "Este mes" },
  ];

  return (
    <div className="min-h-screen bg-canvas">
      <PanelTopbar name={pro.name} role={pro.headline} />

      <div className="mx-auto flex max-w-[1440px] gap-6 px-4 py-6 lg:px-6">
        <PanelSidebar name={pro.name} role={pro.headline} />

        <main className="min-w-0 flex-1 space-y-6">
          {/* Encabezado */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-navy-900">Mis servicios</h1>
              <p className="text-slate-500">Gestioná los servicios que ofrecés en ServiRed.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" href={`/profesionales/${pro.id}`}>
                <ExternalIcon width={18} height={18} /> Ver mi perfil público
              </Button>
              <Button variant="primary">
                <PlusIcon width={18} height={18} /> Publicar nuevo servicio
              </Button>
            </div>
          </div>

          {/* Métricas */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${s.tint}`}>
                    <Icon width={20} height={20} />
                  </span>
                  <p className="mt-3 text-2xl font-bold text-navy-900">{s.value}</p>
                  <p className="text-sm font-medium text-slate-600">{s.label}</p>
                  <p className="text-xs text-slate-400">{s.sub}</p>
                </div>
              );
            })}
          </div>

          {/* Contenido: tabla + rail */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_300px]">
            {/* Lista de servicios */}
            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 p-5">
                <h2 className="font-bold text-navy-900">Lista de servicios</h2>
                <select className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none">
                  <option>Todos los estados</option>
                  <option>Activos</option>
                  <option>Pausados</option>
                </select>
              </div>

              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-slate-400">
                      <th className="px-5 py-3 font-medium">Servicio</th>
                      <th className="px-3 py-3 font-medium">Categoría</th>
                      <th className="px-3 py-3 font-medium">Precio desde</th>
                      <th className="px-3 py-3 font-medium">Estado</th>
                      <th className="px-3 py-3 font-medium">Solicitudes</th>
                      <th className="px-5 py-3 text-right font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pro.services.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/60">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-blue/10 text-lg">
                              {pro.category.icon}
                            </span>
                            <div>
                              <p className="font-medium text-navy-900">{s.title}</p>
                              <p className="text-xs text-slate-400">{s.description}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-slate-600">{s.categoryLabel}</td>
                        <td className="px-3 py-3 font-medium text-navy-900">{formatARS(s.priceFrom)}</td>
                        <td className="px-3 py-3"><StatusPill status={s.status} /></td>
                        <td className="px-3 py-3 text-slate-600">{s.requestsCount}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-1 text-slate-400">
                            <button className="rounded-md p-1.5 hover:bg-slate-100 hover:text-navy-900" aria-label="Editar"><PencilIcon width={16} height={16} /></button>
                            <button className="rounded-md p-1.5 hover:bg-slate-100 hover:text-navy-900" aria-label="Estadísticas"><ChartIcon width={16} height={16} /></button>
                            <button className="rounded-md p-1.5 hover:bg-slate-100 hover:text-navy-900" aria-label="Más"><DotsIcon width={16} height={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 p-4 text-sm text-slate-500">
                <span>Mostrando {pro.services.length} servicios</span>
                <div className="flex gap-1">
                  <button className="rounded-md border border-slate-200 px-2.5 py-1 hover:bg-slate-50">‹</button>
                  <button className="rounded-md bg-brand-blue px-3 py-1 text-white">1</button>
                  <button className="rounded-md border border-slate-200 px-2.5 py-1 hover:bg-slate-50">›</button>
                </div>
              </div>
            </div>

            {/* Rail derecho */}
            <aside className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="font-bold text-navy-900">Consejos para más clientes</h3>
                <div className="mt-4 space-y-4 text-sm">
                  <div>
                    <p className="font-medium text-navy-900">Completá tu perfil</p>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full w-4/5 rounded-full bg-emerald-500" />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">80% completo</p>
                  </div>
                  <div>
                    <p className="font-medium text-navy-900">Subí fotos de tus trabajos</p>
                    <p className="text-xs text-slate-400">Los perfiles con fotos reciben 5x más visitas.</p>
                  </div>
                  <div>
                    <p className="font-medium text-navy-900">Respondé rápido</p>
                    <p className="text-xs text-slate-400">Los profesionales rápidos tienen más contrataciones.</p>
                  </div>
                </div>
                <button className="mt-4 text-sm font-medium text-brand-blue hover:underline">
                  Ver más consejos →
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="font-bold text-navy-900">Plan actual</h3>
                <p className="mt-3 inline-flex items-center gap-2 font-semibold text-brand-blue">
                  <StarIcon width={18} height={18} className="text-amber-400" /> Plan Profesional
                </p>
                <p className="mt-1 text-xs text-slate-400">Vence el 20/06/2024</p>
                <Link href="#" className="mt-3 block w-full rounded-xl border border-slate-300 py-2 text-center text-sm font-medium text-brand-blue hover:bg-slate-50">
                  Ver mi plan
                </Link>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="font-bold text-navy-900">¿Necesitás ayuda?</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Nuestro equipo está para ayudarte en lo que necesites.
                </p>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
