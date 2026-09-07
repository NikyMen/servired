"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SolicitudCard } from "@/components/pro/SolicitudCard";

type RequestCard = {
  id: string; title: string; description: string; zone: string; contactName: string;
  latitude: number; longitude: number; createdAt: string;
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

  const seg = "flex-1 rounded-full px-3 py-2 text-xs font-semibold whitespace-nowrap transition sm:text-sm";

  return (
    <div
      role="group"
      aria-label="Filtrar por tipo de prestador"
      className="glass glass-thin flex shrink-0 rounded-full p-1"
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

export function ClientResultSwitch({ requests }: { requests: RequestCard[] }) {
  const [view, setView] = useState<"requests" | "professionals">("professionals");
  useEffect(() => {
    document.getElementById("professional-results")?.classList.toggle("hidden", view === "requests");
  }, [view]);
  return (
    <section className="space-y-4" aria-label="Explorar oportunidades">
      <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center justify-center gap-2">
        <div className="glass glass-thin flex min-w-0 flex-1 rounded-full p-1">
          <button type="button" aria-pressed={view === "requests"} onClick={() => setView("requests")} className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold transition sm:text-sm ${view === "requests" ? "bg-cliente text-white shadow-md" : "text-slate-600 hover:bg-white/60"}`}>Solicitudes de trabajo</button>
          <button type="button" aria-pressed={view === "professionals"} onClick={() => setView("professionals")} className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold transition sm:text-sm ${view === "professionals" ? "bg-cliente text-white shadow-md" : "text-slate-600 hover:bg-white/60"}`}>Perfiles profesionales / trabajadores</button>
        </div>
        <TipoSwitch />
      </div>
      {view === "requests" ? (
        requests.length ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">{requests.map((request) => <SolicitudCard key={request.id} request={request} alreadyContacted={request.alreadyContacted} />)}</div> : <div className="glass glass-solid rounded-[1.5rem] p-8 text-center text-sm text-slate-500">Todavía no hay solicitudes de trabajo abiertas.</div>
      ) : null}
    </section>
  );
}
