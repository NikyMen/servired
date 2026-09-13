import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { HistorialAvisos } from "@/components/HistorialAvisos";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Notificaciones" };

export default async function NotificacionesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/entrar?next=/notificaciones");

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 px-4 py-6 sm:py-10">
      <header>
        <h1 className="text-2xl font-black text-slate-950 sm:text-3xl">Notificaciones</h1>
        <p className="mt-1 text-sm text-slate-500">Todo lo que te avisamos: mensajes, propuestas, solicitudes y denuncias.</p>
      </header>
      <HistorialAvisos />
    </div>
  );
}
