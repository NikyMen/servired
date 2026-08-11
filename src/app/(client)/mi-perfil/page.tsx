import { redirect } from "next/navigation";
import { PerfilForm } from "@/components/PerfilForm";
import { getSessionUser } from "@/lib/auth";

export default async function MiPerfilPage() {
  const user = await getSessionUser();
  if (!user) redirect("/entrar?next=/mi-perfil");
  return <div className="mx-auto max-w-2xl space-y-4"><div><h1 className="text-2xl font-bold text-slate-900">Mi perfil</h1><p className="text-sm text-slate-500">Actualizá tus datos personales.</p></div><PerfilForm perfil={{ name: user.name, avatarUrl: user.avatarUrl }} /></div>;
}

