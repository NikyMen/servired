"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SolicitudCard } from "@/components/pro/SolicitudCard";

type RequestCard = {
  id: string; title: string; description: string; zone: string; contactName: string;
  latitude?: number | null; longitude?: number | null; createdAt: string;
  category: { name: string; icon: string } | null;
  alreadyContacted?: boolean;
};

/**
 * Interruptor "Profesionales / Oficios": filtra los resultados por `?tipo=`.
 * Es booleano de a lado: tocar el lado activo lo apaga y vuelve a "todos".
 * Usa el MISMO markup que el toggle de al lado (glass + p-1 + botones flex-1)
 * para que tenga el mismo alto y ancho; antes usaba .mode-switch con una
 * píldora absoluta cuya geometría se rompía y dejaba letras afuera del borde.
 */
function TipoSwitch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tipo = searchParams.get("tipo");

  const irA = (next: "profesional" | "oficio") => {
    const sp = new URLSearchParams(searchParams.toString());
    if (tipo === next) sp.delete("tipo");
    else sp.set("tipo", next);
    const qs = sp.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}#resultados`);
  };

  return (
    <div
      role="group"
      aria-label="Filtrar por tipo de prestador"
      className="glass glass-thin flex w-full min-w-0 rounded-full p-1"
    >
      <button
        type="button"
        aria-pressed={tipo === "profesional"}
        onClick={() => irA("profesional")}
        className={`${seg} ${
          tipo === "profesional" ? "bg-cliente text-white shadow-md" : "text-slate-600 hover:bg-white/60"
        }`}
      >
        Profesionales
      </button>
      <button
        type="button"
        aria-pressed={tipo === "oficio"}
        onClick={() => irA("oficio")}
        className={`${seg} ${
          tipo === "oficio" ? "bg-pro text-white shadow-md" : "text-slate-600 hover:bg-white/60"
        }`}
      >
        Oficios
      </button>
    </div>
  );
}

/**
 * Segmento de los dos interruptores de la portada. Los dos usan el mismo para
 * medir igual de alto. En móvil `basis-0` deja las mitades parejas; desde sm
 * cada mitad parte del ancho de su texto (los textos largos no se cortan).
 * `truncate` es la red: un texto nunca se parte en renglones (antes
 * "Perfiles profesionales / trabajadores" quedaba en 3 y la píldora activa se
 * deformaba).
 */
const seg = "min-w-0 flex-1 basis-0 truncate rounded-full px-3 py-2 text-center text-xs font-semibold whitespace-nowrap transition sm:basis-auto sm:text-sm";

export function ClientResultSwitch({ requests }: { requests: RequestCard[] }) {
  const [view, setView] = useState<"requests" | "professionals">("professionals");
  useEffect(() => {
    document.getElementById("professional-results")?.classList.toggle("hidden", view === "requests");
  }, [view]);
  const on = "bg-cliente text-white shadow-md";
  const off = "text-slate-600 hover:bg-white/60";
  return (
    <section className="space-y-4" aria-label="Explorar oportunidades">
      {/* En móvil uno arriba del otro, a ancho completo: lado a lado no
          entraban y el de tipo se montaba encima del otro. Desde lg, en fila:
          el primero con el ancho de sus textos y el de tipo con lo que sobra. */}
      <div className="mx-auto grid w-full max-w-3xl gap-2 lg:grid-cols-[auto_minmax(0,1fr)]">
        <div role="group" aria-label="Qué ver" className="glass glass-thin flex w-full min-w-0 rounded-full p-1">
          <button type="button" aria-pressed={view === "requests"} aria-label="Solicitudes de trabajo" onClick={() => setView("requests")} className={`${seg} ${view === "requests" ? on : off}`}>
            <span className="sm:hidden">Solicitudes</span>
            <span className="hidden sm:inline">Solicitudes de trabajo</span>
          </button>
          <button type="button" aria-pressed={view === "professionals"} aria-label="Perfiles profesionales y trabajadores" onClick={() => setView("professionals")} className={`${seg} ${view === "professionals" ? on : off}`}>
            <span className="sm:hidden">Perfiles</span>
            <span className="hidden sm:inline">Perfiles profesionales / trabajadores</span>
          </button>
        </div>
        <TipoSwitch />
      </div>
      {view === "requests" ? (
        requests.length ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">{requests.map((request) => <SolicitudCard key={request.id} request={request} alreadyContacted={request.alreadyContacted} />)}</div> : <div className="glass glass-solid rounded-[1.5rem] p-8 text-center text-sm text-slate-500">Todavía no hay solicitudes de trabajo abiertas.</div>
      ) : null}
    </section>
  );
}
