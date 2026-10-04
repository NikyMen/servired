import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/Logo";
import { PlanesPreview } from "@/components/PlanesPreview";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Planes para profesionales · Vista previa",
  description: "Propuesta de planes de ServiRed para profesionales y negocios. Una base gratuita y herramientas para crecer.",
  robots: { index: false, follow: false },
};

export default function PlanesPage() {
  // La maqueta se puede revisar en desarrollo. En producción requiere una
  // habilitación explícita del servidor; no alcanza con conocer la URL.
  if (process.env.NODE_ENV === "production" && process.env.PLANES_PREVIEW_ENABLED !== "true") {
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
        <div className="mb-8 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-900">
          <span className="font-semibold">Vista previa</span>
          <span>Precios y beneficios tentativos. Las suscripciones todavía no están disponibles.</span>
        </div>
        <PlanesPreview />
      </main>

      <footer className="mt-12 border-t border-white/60 px-4 py-6 text-center text-xs text-slate-600">
        ServiRed · Conectamos tu trabajo con quienes lo necesitan.
      </footer>
    </div>
  );
}
