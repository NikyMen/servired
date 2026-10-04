import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/Logo";
import { PlanesPreview } from "@/components/PlanesPreview";
import { isAdminAuthenticated } from "@/lib/admin";
import { getPlanesConfig } from "@/lib/planes";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { publicado } = await getPlanesConfig();
  return {
    title: publicado ? "Planes para profesionales" : "Planes para profesionales · Vista previa",
    description: "Planes de ServiRed para profesionales y negocios. Una base gratuita y herramientas para crecer.",
    // Sin publicar no se indexa: la ve solo administración.
    robots: publicado ? undefined : { index: false, follow: false },
  };
}

export default async function PlanesPage() {
  const config = await getPlanesConfig();
  // En producción se ve si administración la publicó (pestaña «Planes») o si el
  // servidor tiene PLANES_PREVIEW_ENABLED. Sin publicar, solo la ve el admin
  // logueado, para revisar lo que edita; no alcanza con conocer la URL.
  const abierta = process.env.NODE_ENV !== "production" || process.env.PLANES_PREVIEW_ENABLED === "true" || config.publicado;
  if (!abierta && !(await isAdminAuthenticated())) {
    notFound();
  }

  return (
    <div data-modo="pro" className="mode-page flex min-h-screen flex-col">
      <header className="glass-bar border-b border-white/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Logo accent="pro" height={32} />
          <Link href="/" className="inline-flex min-h-11 items-center text-sm font-medium text-slate-600 hover:text-pro-dark">
            Volver a ServiRed <span aria-hidden="true" className="ml-2">↗</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {!abierta && (
          <div className="mb-4 rounded-2xl border border-slate-300 bg-slate-100 px-4 py-3 text-sm text-slate-700">
            <span className="font-semibold">Solo la ves vos (administración).</span> La página no está publicada: para el resto da 404.
          </div>
        )}
        {config.aviso && (
          <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-900">{config.aviso}</div>
        )}
        <PlanesPreview config={config} />
      </main>

      <footer className="mt-12 border-t border-white/60 px-4 py-6 text-center text-xs text-slate-600">
        ServiRed · Conectamos tu trabajo con quienes lo necesitan.
      </footer>
    </div>
  );
}
