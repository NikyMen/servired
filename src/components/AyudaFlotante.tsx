import { WhatsAppIcon } from "@/components/icons";

/**
 * "Necesito ayuda": abre el WhatsApp de soporte (el número sale de
 * SOPORTE_WHATSAPP en el .env; ver src/lib/soporte.ts). Va a la derecha,
 * apilado arriba del botón de ServiRed IA (que está en right-4 bottom-24 y
 * md:bottom-6): de ahí salen las alturas de `abajo`, que también lo dejan
 * encima de la barra inferior y de la de "Contratar" en el celu.
 * Blanco y no azul ni verde: esos dos colores dicen de qué lado estás, y la
 * ayuda es para los dos. z-30, debajo de los fondos de los paneles (z-40),
 * para que al abrir uno no quede flotando arriba.
 *
 * `abajo` lleva la altura de las dos pantallas (incluido el md:) porque la
 * variante de media query le gana siempre a la clase suelta, no importa el
 * orden en el string.
 */
export function AyudaFlotante({
  href,
  abajo = "bottom-40 md:bottom-22",
}: {
  href: string;
  abajo?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Necesito ayuda por WhatsApp"
      title="Necesito ayuda"
      className={`fixed right-4 ${abajo} z-30 flex size-13 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white text-slate-700 shadow-lg transition-all hover:shadow-xl active:scale-95 md:size-auto md:px-4 md:py-3`}
    >
      <WhatsAppIcon width={22} height={22} className="shrink-0 text-[#25D366]" />
      <span className="hidden text-sm font-semibold md:inline">¿Necesitás ayuda?</span>
    </a>
  );
}
