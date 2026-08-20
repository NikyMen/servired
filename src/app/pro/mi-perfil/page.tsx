import { redirect } from "next/navigation";
import { PerfilForm } from "@/components/PerfilForm";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TrabajosParticulares } from "@/components/pro/TrabajosParticulares";

export default async function MiPerfilProfesionalPage() {
  const user = await getSessionUser();
  if (!user) redirect("/entrar?next=/pro/mi-perfil");
  if (!user.professionalId) redirect("/mi-perfil");
  const [pro, categories, workPhotos] = await Promise.all([
    prisma.professional.findUniqueOrThrow({ where: { id: user.professionalId } }),
    prisma.category.findMany({ orderBy: [{ parentId: "asc" }, { name: "asc" }], select: { id: true, name: true, icon: true, parentId: true, parent: { select: { name: true } } } }),
    prisma.workPhoto.findMany({ where: { professionalId: user.professionalId }, orderBy: { createdAt: "desc" }, select: { id: true, url: true, title: true, description: true, address: true, latitude: true, longitude: true } }),
  ]);
  return <div className="mx-auto max-w-3xl space-y-6"><div><h1 className="text-2xl font-bold text-slate-900">Mi perfil</h1><p className="text-sm text-slate-500">Cargá tu local y ubicación para aparecer en el mapa.</p></div><PerfilForm categories={categories} perfil={{ name: pro.name, avatarUrl: pro.avatarUrl, businessName: pro.businessName, headline: pro.headline, bio: pro.bio, address: pro.address, zone: pro.zone, categoryId: pro.categoryId, latitude: pro.latitude, longitude: pro.longitude }} /><TrabajosParticulares fotos={workPhotos} /></div>;
}
