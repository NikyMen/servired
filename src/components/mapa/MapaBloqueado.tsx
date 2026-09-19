import Link from "next/link";
import { MapPinIcon } from "@/components/icons";
import { RADIO_KM } from "@/lib/geo";

/**
 * Lo que ve un invitado en lugar del mapa: un fondo que sugiere un mapa,
 * borroso, y la invitación a entrar. No lleva ninguna ubicación real.
 */
export function MapaBloqueado({ className = "h-[430px]" }: { className?: string }) {
  return (
    <div className={`relative isolate overflow-hidden rounded-2xl border border-white/70 ${className}`}>
      <div
        aria-hidden
        className="absolute inset-0 -z-10 scale-110 blur-[6px]"
        style={{
          backgroundColor: "#e8eef5",
          backgroundImage:
            "radial-gradient(circle at 30% 40%, #05966955 0 6px, transparent 7px), radial-gradient(circle at 62% 55%, #05966955 0 6px, transparent 7px), radial-gradient(circle at 48% 30%, #2563eb55 0 6px, transparent 7px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px), linear-gradient(0deg, #cbd5e1 1px, transparent 1px)",
          backgroundSize: "100% 100%, 100% 100%, 100% 100%, 48px 48px, 48px 48px",
        }}
      />
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-white/40 p-6 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-cliente text-white shadow-lg"><MapPinIcon width={22} height={22} /></span>
        <p className="text-lg font-bold text-slate-900">Iniciá sesión para ver el mapa</p>
        <p className="max-w-sm text-sm text-slate-600">Con tu cuenta ves en el mapa a los profesionales que tenés a {RADIO_KM} km y la distancia a cada uno.</p>
        <Link href="/entrar?next=/mapa" className="rounded-xl bg-cliente px-4 py-2.5 text-sm font-semibold text-white hover:bg-cliente-dark">Iniciar sesión</Link>
      </div>
    </div>
  );
}
