import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { PublicarSolicitudForm } from "@/components/PublicarSolicitudForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Publicar solicitud" };

export default async function PublicarSolicitudPage() {
  const categorias = await prisma.category.findMany({
    orderBy: { createdAt: "asc" },
    select: { slug: true, name: true, icon: true },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
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
