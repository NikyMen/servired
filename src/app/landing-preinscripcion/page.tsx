import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { PreinscripcionForm } from "@/components/PreinscripcionForm";

export const metadata: Metadata = {
  title: "Preinscripción",
  description: "Dejá tus datos para recibir novedades del lanzamiento de ServiRed.",
};

export default function LandingPreinscripcionPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white px-4 py-8 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <Logo href="/" accent="cliente" height={42} />
        <section className="mt-10 text-center sm:mt-16">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cliente">Próximamente</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            ServiRed llega a tu zona
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-slate-600">
            Preinscribite gratis y te avisamos cuando abramos. Podés buscar servicios o sumar tu oficio a la red.
          </p>
        </section>
        <div className="mx-auto mt-8 max-w-2xl sm:mt-10"><PreinscripcionForm /></div>
      </div>
    </main>
  );
}
