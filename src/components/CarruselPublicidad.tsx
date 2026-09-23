import { AdPlate } from "@/components/AdPlate";

type Ad = Parameters<typeof AdPlate>[0]["ad"];
export type ItemCarrusel = { key: string; ad: Ad; label: string };

/** Segundos que tarda cada placa en pasar: la velocidad es la misma con 6 o con 12. */
const SEGUNDOS_POR_PLACA = 4;

/**
 * Una fila de publicidad del celular que corre sola y no termina nunca. La
 * lista va dos veces seguida y la animación corre la mitad del ancho; la
 * copia es solo para el ojo (ni el lector ni el teclado la ven). Se frena
 * mientras la tocás, y quien pidió menos movimiento la ve quieta y la
 * desliza con el dedo.
 */
export function CarruselPublicidad({ titulo, tono, sentido, items, invitarHref }: { titulo: string; tono: string; sentido: "izquierda" | "derecha"; items: ItemCarrusel[]; invitarHref: string | null }) {
  const lista = (copia: boolean) =>
    items.map((item) => (
      // pr en vez de gap: así cada copia mide exacto la mitad de la pista.
      <div key={`${copia ? "b" : "a"}-${item.key}`} className="w-[30vw] max-w-40 shrink-0 pr-2">
        <AdPlate ad={item.ad} label={item.label} className="rounded-2xl" lazy invitarHref={invitarHref} />
      </div>
    ));

  return (
    <section aria-label={`Publicidad de ${titulo.toLowerCase()}`} className="space-y-1.5">
      <p className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-white uppercase ${tono}`}>{titulo}</p>
      <div className="-mx-4 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)] motion-reduce:overflow-x-auto">
        <div
          className={`flex w-max active:[animation-play-state:paused] motion-reduce:animate-none ${sentido === "izquierda" ? "animate-carrusel-izq" : "animate-carrusel-der"}`}
          style={{ animationDuration: `${items.length * SEGUNDOS_POR_PLACA}s` }}
        >
          {lista(false)}
          <div aria-hidden inert className="flex motion-reduce:hidden">{lista(true)}</div>
        </div>
      </div>
    </section>
  );
}
