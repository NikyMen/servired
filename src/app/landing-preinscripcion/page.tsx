import type { Metadata } from "next";
import { FacebookIcon, InstagramIcon, TikTokIcon } from "@/components/icons";
import { Logo } from "@/components/Logo";
import { PreinscripcionForm } from "@/components/PreinscripcionForm";
import { FACEBOOK_URL, INSTAGRAM_URL, TIKTOK_URL } from "@/lib/links";

export const metadata: Metadata = {
  title: "Preinscripción",
  description: "Dejá tus datos para recibir novedades del lanzamiento de ServiRed.",
};

export default function LandingPreinscripcionPage() {
  return (
    // El fondo lo pone body::before (globals.css); acá sólo se agregan dos
    // manchas propias que respiran, para que el vidrio tenga qué refractar.
    <main className="relative min-h-screen overflow-hidden px-4 py-5 sm:px-6 sm:py-8">
      <div
        aria-hidden
        className="animate-blob absolute -top-32 -left-24 -z-10 size-[26rem] rounded-full bg-cliente/25 blur-3xl"
      />
      <div
        aria-hidden
        className="animate-blob absolute -right-24 top-1/3 -z-10 size-[30rem] rounded-full bg-pro/20 blur-3xl [animation-delay:-5s]"
      />
      <div className="relative mx-auto max-w-5xl">
        <header className="glass flex items-center justify-between rounded-2xl px-4 py-3 sm:px-5">
          <Logo href="/" accent="cliente" height={40} />
          <span className="glass-chip hidden px-3 py-1.5 text-xs font-semibold text-cliente-dark sm:inline-flex">
            Muy pronto en tu zona
          </span>
        </header>

        <section className="mt-10 grid items-center gap-10 lg:mt-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div className="text-center lg:text-left">
            <p className="glass-chip inline-flex px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-cliente-dark">
              Preinscripción abierta
            </p>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-950 sm:text-6xl">
              Servicios reales. <span className="text-cliente">Cerca tuyo.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg lg:mx-0">
              Preinscribite gratis y te avisamos cuando ServiRed abra en tu zona. Podés buscar servicios o sumar tu oficio a la red.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3 text-sm text-slate-600 lg:justify-start">
              <span className="glass-chip">✓ Profesionales verificados</span>
              <span className="glass-chip">✓ Contacto directo</span>
            </div>
          </div>

          <div className="mx-auto w-full max-w-xl">
            <PreinscripcionForm />
          </div>
        </section>

        <section className="glass glass-solid mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl px-5 py-4 sm:flex-row">
          <p className="text-sm text-slate-600">Seguinos y enterate de las novedades.</p>
          <div className="flex gap-2">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="ServiRed en Instagram (se abre en una pestaña nueva)"
              className="glass-chip px-3.5 py-2.5 text-sm font-medium text-[#E1306C]"
            >
              <InstagramIcon width={19} height={19} />
              Instagram
            </a>
            <a
              href={FACEBOOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="ServiRed en Facebook (se abre en una pestaña nueva)"
              className="glass-chip px-3.5 py-2.5 text-sm font-medium text-[#1877F2]"
            >
              <FacebookIcon width={19} height={19} />
              Facebook
            </a>
            <a
              href={TIKTOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="ServiRed en TikTok (se abre en una pestaña nueva)"
              className="glass-chip px-3.5 py-2.5 text-sm font-medium text-[#010101]"
            >
              <TikTokIcon width={19} height={19} />
              TikTok
            </a>
          </div>
        </section>

        <p className="py-6 text-center text-xs text-slate-500/80">© {new Date().getFullYear()} ServiRed · Hecho en Argentina</p>
      </div>
    </main>
  );
}
