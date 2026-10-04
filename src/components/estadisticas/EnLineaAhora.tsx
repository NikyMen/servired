"use client";

import { useEffect, useState } from "react";
import { enLineaAction } from "@/app/admin/actions";
import type { EnLinea } from "@/lib/estadisticas";

/** Se refresca solo cada 20 segundos mientras la pestaña está a la vista. */
export function EnLineaAhora({ inicial }: { inicial: EnLinea }) {
  const [datos, setDatos] = useState(inicial);

  useEffect(() => {
    const refrescar = () => { if (document.visibilityState === "visible") enLineaAction().then(setDatos).catch(() => {}); };
    const timer = window.setInterval(refrescar, 20_000);
    document.addEventListener("visibilitychange", refrescar);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", refrescar); };
  }, []);

  const hora = new Date(datos.hora).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "America/Argentina/Buenos_Aires" });

  return (
    <section className="adm-card adm-card-pad" aria-live="polite">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-3">
          <span className="relative flex size-3">
            {datos.total > 0 && <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:hidden" />}
            <span className={`relative inline-flex size-3 rounded-full ${datos.total > 0 ? "bg-emerald-500" : "bg-slate-300"}`} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">En línea ahora</p>
            <p className="text-3xl font-bold tabular-nums text-slate-900">{datos.total} <span className="text-base font-semibold text-slate-500">{datos.total === 1 ? "persona" : "personas"}</span></p>
          </div>
        </div>
        {datos.total > 0 && (
          <p className="text-sm text-slate-600">
            {datos.conCuenta} con cuenta · {datos.total - datos.conCuenta} sin entrar · {datos.celular} desde el celular
            {datos.ciudades.length > 0 && <> · {datos.ciudades.map((c) => `${c.nombre} (${c.cantidad})`).join(", ")}</>}
          </p>
        )}
        <p className="ml-auto text-xs text-slate-400">Actualizado {hora}</p>
      </div>
      {datos.paginas.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {datos.paginas.map((p) => (
            <li key={p.nombre} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">{p.nombre} <strong>{p.cantidad}</strong></li>
          ))}
        </ul>
      )}
    </section>
  );
}
