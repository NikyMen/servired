import { WhatsAppIcon } from "@/components/icons";

/**
 * "Necesito ayuda": abre el WhatsApp de soporte. Va a la izquierda porque la
 * derecha ya la ocupan ServiRed IA y Mensajes, y a la misma altura que la IA
 * para quedar encima de la barra inferior y de la de "Contratar" en el celu.
 * Blanco y no azul ni verde: esos dos colores dicen de qué lado estás, y la
 * ayuda es para los dos. z-30, debajo de los fondos de los paneles (z-40),
 * para que al abrir uno no quede flotando arriba.
 */
export function AyudaFlotante({ href, abajo = "bottom-24" }: { href: string; abajo?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Necesito ayuda por WhatsApp"
      title="Necesito ayuda"
      className={`fixed left-4 ${abajo} z-30 flex size-13 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white text-slate-700 shadow-lg transition-all hover:shadow-xl active:scale-95 md:bottom-6 md:left-6 md:size-auto md:px-4 md:py-3`}
    >
      <WhatsAppIcon width={22} height={22} className="shrink-0 text-[#25D366]" />
      <span className="hidden text-sm font-semibold md:inline">¿Necesitás ayuda?</span>
    </a>
  );
}
