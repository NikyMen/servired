import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BajaCuentaForm } from "@/components/BajaCuentaForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dar de baja la cuenta" };

export default async function BajaDeCuentaPage() {
  const user = await getSessionUser();
  if (!user) redirect("/entrar?next=/baja-de-cuenta");
  const account = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dar de baja la cuenta</h1>
        <p className="mt-1 text-sm text-slate-500">
          Si lo que querés es dejar de aparecer un tiempo, escribinos antes: borrar la cuenta es definitivo.
        </p>
      </div>
      <BajaCuentaForm email={user.email} tieneContrasena={Boolean(account.passwordHash)} />
      <Link href="/mi-perfil" className="glass-btn glass-btn-ghost inline-flex px-4 py-2.5 text-sm">Mejor no, volver a mi perfil</Link>
    </div>
  );
}
