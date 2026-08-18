"use client";

import { useEffect, useState } from "react";
import { SolicitudCard } from "@/components/pro/SolicitudCard";

type RequestCard = {
  id: string; title: string; description: string; zone: string; contactName: string;
  latitude: number; longitude: number; createdAt: string;
  category: { name: string; icon: string } | null;
};

export function ClientResultSwitch({ requests }: { requests: RequestCard[] }) {
  const [view, setView] = useState<"requests" | "professionals">("professionals");
  useEffect(() => {
    document.getElementById("professional-results")?.classList.toggle("hidden", view === "requests");
  }, [view]);
  return (
    <section className="space-y-4" aria-label="Explorar oportunidades">
      <div className="glass glass-thin mx-auto flex w-full max-w-xl rounded-full p-1">
        <button type="button" aria-pressed={view === "requests"} onClick={() => setView("requests")} className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold transition sm:text-sm ${view === "requests" ? "bg-cliente text-white shadow-md" : "text-slate-600 hover:bg-white/60"}`}>Solicitudes de trabajo</button>
        <button type="button" aria-pressed={view === "professionals"} onClick={() => setView("professionals")} className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold transition sm:text-sm ${view === "professionals" ? "bg-cliente text-white shadow-md" : "text-slate-600 hover:bg-white/60"}`}>Perfiles profesionales / trabajadores</button>
      </div>
      {view === "requests" ? (
        requests.length ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">{requests.map((request) => <SolicitudCard key={request.id} request={request} />)}</div> : <div className="glass glass-solid rounded-[1.5rem] p-8 text-center text-sm text-slate-500">Todavía no hay solicitudes de trabajo abiertas.</div>
      ) : null}
    </section>
  );
}
