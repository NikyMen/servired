import { redirect } from "next/navigation";
import { PerfilForm } from "@/components/PerfilForm";
import { getSessionUser } from "@/lib/auth";
import { AvisosCorreo } from "@/components/AvisosCorreo";
import { Matriculas } from "@/components/pro/Matriculas";
import { listarCredenciales } from "@/lib/matriculas";
import { preferenciasAvisos } from "@/lib/avisos-correo";
import { prisma } from "@/lib/prisma";
import { TrabajosParticulares } from "@/components/pro/TrabajosParticulares";
import { ACTIVE_JOB_STATUSES } from "@/lib/workflow";
import { BajaCuentaAviso } from "@/components/BajaCuentaAviso";
import { MercadoPagoCard } from "@/components/pro/MercadoPagoCard";
import { comisionPorcentaje, estadoMercadoPago } from "@/lib/mercadopago";
import { OfertasDependencia } from "@/components/pro/OfertasDependencia";

export default async function MiPerfilProfesionalPage({ searchParams }: { searchParams: Promise<{ mp?: string }> }) {
  const { mp } = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect("/entrar?next=/pro/mi-perfil");
  if (!user.canInteract) redirect("/onboarding");
  if (!user.professionalId) redirect("/pro");
  if (user.professionalStatus !== "approved") redirect("/pro");
  const pro = await prisma.professional.findUniqueOrThrow({ where: { id: user.professionalId }, include: { categoryLinks: true } });
  const [categories, workSamples, activeJobs, credenciales, mpEstado, cuenta] = await Promise.all([
    prisma.category.findMany({ where: { approvalStatus: "approved", kind: pro.providerType, parentId: { not: null } }, orderBy: [{ parentId: "asc" }, { name: "asc" }], select: { id: true, name: true, icon: true, parentId: true, parent: { select: { name: true } } } }),
    prisma.workSample.findMany({ where: { professionalId: user.professionalId }, orderBy: { createdAt: "desc" }, include: { images: { orderBy: { position: "asc" } } } }),
    prisma.booking.count({ where: { professionalId: user.professionalId, status: { in: ACTIVE_JOB_STATUSES } } }),
    listarCredenciales(user.professionalId),
    estadoMercadoPago(user.professionalId),
    prisma.user.findUnique({ where: { id: user.id }, select: { ofertasDependencia: true } }),
  ]);
  // El rubro de una matrícula sale de los rubros del propio perfil.
  const rubros = categories.filter((c) => pro.categoryLinks.some((l) => l.categoryId === c.id)).map((c) => ({ id: c.id, name: c.name }));
  return <div className="mx-auto max-w-3xl space-y-6"><div><h1 className="text-2xl font-bold text-slate-900">Mi perfil</h1><p className="text-sm text-slate-500">Perfil de tipo {pro.providerType}. Cambiar el tipo o la identidad requiere una nueva verificación.</p>{activeJobs === 0 ? <a href="/pro?editarKyc=1" className="mt-2 inline-block text-sm font-semibold text-pro-dark hover:underline">Solicitar cambio de tipo o datos de identidad</a> : <p className="mt-2 text-xs text-amber-700">Terminá tus trabajos activos antes de solicitar ese cambio.</p>}</div><MercadoPagoCard estado={mpEstado} aviso={mp} comision={comisionPorcentaje()} /><PerfilForm categories={categories} perfil={{ name: pro.name, avatarUrl: pro.avatarUrl, businessName: pro.businessName, headline: pro.headline, bio: pro.bio, address: pro.address, zone: pro.zone, categoryId: pro.categoryId, categoryIds: pro.categoryLinks.map((link) => link.categoryId), latitude: pro.latitude, longitude: pro.longitude, providerType: pro.providerType === "profesional" ? "profesional" : "oficio", phone: pro.phone, yearsExperience: pro.yearsExperience }} /><TrabajosParticulares fotos={workSamples} /><Matriculas items={credenciales.map(({ createdAt: _creada, mimeType: _tipo, ...item }) => item)} rubros={rubros} /><OfertasDependencia inicial={cuenta?.ofertasDependencia ?? false} /><AvisosCorreo inicial={await preferenciasAvisos(user.id)} /><BajaCuentaAviso /></div>;
}
