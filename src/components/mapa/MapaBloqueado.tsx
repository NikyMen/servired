import Link from "next/link";
import { MapPinIcon } from "@/components/icons";
import { RADIO_KM } from "@/lib/geo";

/**
 * Lo que ve un invitado en lugar del mapa: un fondo de mapa liviano y difuminado,
 * para que se note qué hay detrás, y la invitación a entrar. Los pines son de
 * adorno: no lleva ninguna ubicación real.
 */
export function MapaBloqueado({ className = "h-[430px]", next = "/mapa" }: { className?: string; next?: string }) {
  return (
    <div className={`relative isolate overflow-hidden rounded-2xl border border-white/70 bg-[#e8eef5] ${className}`}>
      <div aria-hidden className="absolute inset-0 -z-10 scale-105 blur-[3px] saturate-[.85]">
        <svg viewBox="0 0 800 430" preserveAspectRatio="xMidYMid slice" className="size-full" focusable="false">
          <defs><pattern id="calles-invitado" width="70" height="60" patternTransform="rotate(-18)" patternUnits="userSpaceOnUse"><rect width="70" height="60" fill="#d9e4dd" /><path d="M0 0H70V60" fill="none" stroke="#fff" strokeWidth="9" /></pattern></defs>
          <rect width="800" height="430" fill="url(#calles-invitado)" />
          <path d="M-30 0Q220 130 100 240T140 460" fill="none" stroke="#9fcbdc" strokeWidth="100" />
          <path d="M0 340L800 80M300 0L600 430" stroke="#f5d899" strokeWidth="12" />
          {[[300, 120], [430, 280], [620, 160], [220, 330], [570, 70]].map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="17" fill="#059669" fillOpacity=".25" stroke="#059669" strokeWidth="3" />)}
        </svg>
      </div>
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-white/35 p-6 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-cliente text-white shadow-lg"><MapPinIcon width={22} height={22} /></span>
        <p className="text-lg font-bold text-slate-900">Iniciá sesión para ver el mapa</p>
        <p className="max-w-sm text-sm text-slate-700">Con tu cuenta ves en el mapa a los profesionales que tenés a {RADIO_KM} km y la distancia a cada uno.</p>
        <Link href={`/entrar?next=${encodeURIComponent(next)}`} className="rounded-xl bg-cliente px-4 py-2.5 text-sm font-semibold text-white hover:bg-cliente-dark">Iniciar sesión</Link>
      </div>
    </div>
  );
}
