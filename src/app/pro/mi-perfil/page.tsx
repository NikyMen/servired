import { redirect } from "next/navigation";
import { PerfilForm } from "@/components/PerfilForm";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TrabajosParticulares } from "@/components/pro/TrabajosParticulares";
import { ACTIVE_JOB_STATUSES } from "@/lib/workflow";

export default async function MiPerfilProfesionalPage() {
  const user = await getSessionUser();
  if (!user) redirect("/entrar?next=/pro/mi-perfil");
  if (!user.canInteract) redirect("/onboarding");
  if (!user.professionalId) redirect("/pro");
  if (user.professionalStatus !== "approved") redirect("/pro");
  const pro = await prisma.professional.findUniqueOrThrow({ where: { id: user.professionalId }, include: { categoryLinks: true } });
  const [categories, workSamples, activeJobs] = await Promise.all([
    prisma.category.findMany({ where: { approvalStatus: "approved", kind: pro.providerType }, orderBy: [{ parentId: "asc" }, { name: "asc" }], select: { id: true, name: true, icon: true, parentId: true, parent: { select: { name: true } } } }),
    prisma.workSample.findMany({ where: { professionalId: user.professionalId }, orderBy: { createdAt: "desc" }, include: { images: { orderBy: { position: "asc" } } } }),
    prisma.booking.count({ where: { professionalId: user.professionalId, status: { in: ACTIVE_JOB_STATUSES } } }),
  ]);
  return <div className="mx-auto max-w-3xl space-y-6"><div><h1 className="text-2xl font-bold text-slate-900">Mi perfil</h1><p className="text-sm text-slate-500">Perfil de tipo {pro.providerType}. Cambiar el tipo o la identidad requiere una nueva verificación.</p>{activeJobs === 0 ? <a href="/pro?editarKyc=1" className="mt-2 inline-block text-sm font-semibold text-pro-dark hover:underline">Solicitar cambio de tipo o datos de identidad</a> : <p className="mt-2 text-xs text-amber-700">Terminá tus trabajos activos antes de solicitar ese cambio.</p>}</div><PerfilForm categories={categories} perfil={{ name: pro.name, avatarUrl: pro.avatarUrl, businessName: pro.businessName, headline: pro.headline, bio: pro.bio, address: pro.address, zone: pro.zone, categoryId: pro.categoryId, categoryIds: pro.categoryLinks.map((link) => link.categoryId), latitude: pro.latitude, longitude: pro.longitude, providerType: pro.providerType === "profesional" ? "profesional" : "oficio", paymentAlias: pro.paymentAlias, paymentCvu: pro.paymentCvu }} /><TrabajosParticulares fotos={workSamples} /></div>;
}
