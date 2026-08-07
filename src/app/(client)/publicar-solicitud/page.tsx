import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { PublicarSolicitudForm } from "@/components/PublicarSolicitudForm";
import { InvitadoAviso } from "@/components/InvitadoAviso";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Publicar solicitud" };

export default async function PublicarSolicitudPage() {
  const [categorias, user] = await Promise.all([
    prisma.category.findMany({
      orderBy: { createdAt: "asc" },
      select: { slug: true, name: true, icon: true },
    }),
    getSessionUser(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* El aviso va ARRIBA del formulario a propósito: publicar sí necesita
          cuenta, y enterarse recién al apretar "Publicar" — después de llenar
          todo — sería la peor forma de descubrirlo. */}
      {!user && <InvitadoAviso accion="publicar tu solicitud" next="/publicar-solicitud" />}

      <div>
        <Link href="/" className="text-sm font-medium text-cliente hover:underline">
          ← Volver al inicio
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Solicitá un servicio</h1>
        <p className="mt-1 text-slate-500">
          Contanos qué necesitás y los profesionales te contactan por mensaje.
        </p>
      </div>

      <PublicarSolicitudForm categorias={categorias} />
    </div>
  );
}
