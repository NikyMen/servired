"use client";

import { useEffect, useState } from "react";
import { MapView } from "@/components/MapView";
import { ResponderSolicitud } from "@/components/ResponderSolicitud";
import { MapPinIcon, XIcon } from "@/components/icons";

type Solicitud = {
  id: string; title: string; description: string; zone: string; contactName: string;
  latitude: number; longitude: number; createdAt: string;
  category: { name: string; icon: string } | null;
};

export function SolicitudCard({ request, alreadyContacted = false }: { request: Solicitud; alreadyContacted?: boolean }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [open]);

  return <>
    <article role="button" tabIndex={0} onClick={() => setOpen(true)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setOpen(true)} className={`glass glass-card flex cursor-pointer flex-col rounded-2xl p-4 transition hover:-translate-y-0.5 hover:shadow-lg ${alreadyContacted ? "bg-slate-200/80 grayscale" : "bg-blue-50/80 ring-1 ring-blue-200/80"}`}>
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/12 px-2.5 py-1 text-xs font-medium text-cliente-dark ring-1 ring-blue-400/25 ring-inset">{request.category ? `${request.category.icon} ${request.category.name}` : "Otro"}</span>
        <span className={`text-xs font-semibold ${alreadyContacted ? "text-slate-500" : "text-cliente"}`}>{alreadyContacted ? "Ya contactaste" : "Ver detalle"}</span>
      </div>
      <h3 className="mt-2 font-semibold text-slate-900">{request.title}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-slate-500">{request.description}</p>
      <span className="mt-3 flex items-center gap-1 border-t border-white/60 pt-3 text-xs text-slate-400"><MapPinIcon width={14} height={14} />{request.zone} · {request.contactName}</span>
    </article>

    {open && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 p-3 backdrop-blur-sm sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
      <section role="dialog" aria-modal="true" aria-label={request.title} className="glass glass-solid max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3"><div><span className="text-xs font-semibold text-pro">{request.category?.name ?? "Otro"}</span><h2 className="mt-1 text-xl font-bold text-slate-900">{request.title}</h2></div><button onClick={() => setOpen(false)} aria-label="Cerrar" className="rounded-full p-2 hover:bg-slate-100"><XIcon width={20} height={20} /></button></div>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">{request.description}</p>
        <dl className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-white/60 p-4 text-sm"><div><dt className="text-xs text-slate-400">Cliente</dt><dd className="font-semibold text-slate-800">{request.contactName}</dd></div><div><dt className="text-xs text-slate-400">Publicado</dt><dd className="font-semibold text-slate-800">{new Date(request.createdAt).toLocaleDateString("es-AR")}</dd></div><div className="col-span-2"><dt className="text-xs text-slate-400">Ubicación</dt><dd className="font-semibold text-slate-800">{request.zone}</dd></div></dl>
        <div className="mt-4"><MapView className="h-64" points={[{ id: request.id, type: "solicitud", title: request.title, subtitle: request.zone, latitude: request.latitude, longitude: request.longitude }]} /></div>
        <div className="mt-5 flex justify-end"><ResponderSolicitud requestId={request.id} clientName={request.contactName} requestTitle={request.title} /></div>
      </section>
    </div>}
  </>;
}
