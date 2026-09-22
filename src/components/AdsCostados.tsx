import { prisma } from "@/lib/prisma";
import { AdPlate } from "@/components/AdPlate";
import { SLOTS, nombreDeSlot } from "@/lib/publicidad";
import { getPublicitarHref } from "@/lib/soporte";

const LADOS = ["izquierda", "derecha"] as const;

/**
 * Ancho de una placa de la franja, en tres topes:
 *
 * - Lo que sobra a un costado del contenido (`max-w-5xl` = 64rem) menos 2.5rem
 *   de aire. Ese aire no es decorativo: `100vw` incluye la barra de scroll
 *   (~15 px), así que sin margen la franja se le montaría encima al contenido.
 * - 170 px como máximo: a esa medida ya se parece a las 6 de debajo de la
 *   portada, que en 1024 px de contenido dan cuadrados de ~155 px.
 * - Lo que dejan 3 cuadrados en el alto de la pantalla, así los botones
 *   flotantes de las esquinas de abajo (ayuda y ServiRed IA) nunca se tapan.
 */
const ANCHO_PLACA = "min(clamp(88px, calc((100vw - 64rem) / 2 - 2.5rem), 170px), calc((100vh - 15rem) / 3))";

/**
 * Las dos franjas de publicidad de los costados: 3 placas a la izquierda y 3 a
 * la derecha, fijas y alineadas con el inicio de la portada, que acompañan el scroll en todas las pantallas del sitio
 * (va en el layout del cliente, no en la portada).
 *
 * Solo desde `xl` (1280 px), que es el primer ancho donde sobra lugar a los
 * lados del contenido: más angosto que eso las franjas se le montarían encima.
 * Por debajo no se pierden, se ven las 12 juntas debajo de la portada.
 *
 * z-20: por debajo del encabezado (z-30) y de los paneles flotantes (z-40+).
 */
export async function AdsCostados() {
  const slots = [...SLOTS.izquierda, ...SLOTS.derecha];
  const [ads, publicitarHref] = await Promise.all([
    prisma.ad.findMany({ where: { slot: { in: slots } } }),
    getPublicitarHref(),
  ]);
  const porSlot = new Map(ads.map((ad) => [ad.slot, ad]));

  return (
    <>
      {LADOS.map((lado) => (
        <aside
          key={lado}
          aria-label={`Publicidad, costado ${lado}`}
          className={`fixed top-28 z-20 hidden flex-col gap-3 px-3 xl:flex ${lado === "izquierda" ? "left-0" : "right-0"}`}
          style={{ width: `calc(${ANCHO_PLACA} + 1.5rem)` }}
        >
          {SLOTS[lado].map((slot) => (
            <AdPlate
              key={slot}
              ad={porSlot.get(slot) ?? null}
              label={`Publicidad ${nombreDeSlot(slot)}`}
              className="rounded-2xl"
              invitarHref={publicitarHref}
            />
          ))}
        </aside>
      ))}
    </>
  );
}
