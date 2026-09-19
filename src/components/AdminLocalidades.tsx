"use client";

import { useActionState, useState } from "react";
import { createLocalityAction, moveLocalityAction, toggleLocalityAction, type LocalidadState, type PuntoState } from "@/app/admin/actions";
import { MapPicker } from "@/components/MapPicker";

type Fila = { id: string; name: string; province: string; latitude: number; longitude: number; active: boolean; users: number };

/** El mapa arranca en Capital: es donde están casi todas. */
const CENTRO = { latitude: -27.4692, longitude: -58.8306 };

export function AdminLocalidades({ rows }: { rows: Fila[] }) {
  return (
    <div className="space-y-4">
      <NuevaLocalidad />
      <div className="adm-card overflow-hidden">
        <ul className="divide-y divide-slate-100">
          {rows.map((row) => <FilaLocalidad key={row.id} row={row} />)}
        </ul>
      </div>
    </div>
  );
}

function NuevaLocalidad() {
  const [state, formAction, pending] = useActionState<LocalidadState, FormData>(createLocalityAction, undefined);
  const values = state?.values ?? { name: "", province: "Corrientes", latitude: "", longitude: "" };
  // El punto no viene marcado: hay que tocar el mapa, si no el alta se rechaza.
  const [punto, setPunto] = useState<{ latitude: number; longitude: number } | null>(values.latitude ? { latitude: Number(values.latitude), longitude: Number(values.longitude) } : null);

  return (
    <form key={JSON.stringify(state ?? "inicial")} action={formAction} className="adm-card grid gap-4 p-4 md:grid-cols-[1fr_1.4fr]">
      <div className="space-y-3">
        <h3 className="font-bold text-slate-900">Agregar localidad</h3>
        <label className="adm-label">Nombre
          <input name="name" defaultValue={values.name} required minLength={2} maxLength={60} placeholder="Goya" className="adm-field mt-1" />
        </label>
        <label className="adm-label">Provincia
          <input name="province" defaultValue={values.province} required minLength={2} maxLength={60} className="adm-field mt-1" />
        </label>
        <input type="hidden" name="latitude" value={punto?.latitude ?? ""} />
        <input type="hidden" name="longitude" value={punto?.longitude ?? ""} />
        <p className="text-xs text-slate-500">{punto ? `Punto: ${punto.latitude.toFixed(4)}, ${punto.longitude.toFixed(4)}` : "Tocá el mapa en el centro de la localidad."}</p>
        {state?.error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
        {state?.ok && <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Localidad agregada.</p>}
        <button disabled={pending} className="adm-btn">{pending ? "Guardando…" : "Agregar"}</button>
      </div>
      <MapPicker latitude={punto?.latitude ?? CENTRO.latitude} longitude={punto?.longitude ?? CENTRO.longitude} onChange={(latitude, longitude) => setPunto({ latitude, longitude })} />
    </form>
  );
}

function FilaLocalidad({ row }: { row: Fila }) {
  const [editando, setEditando] = useState(false);
  const [punto, setPunto] = useState({ latitude: row.latitude, longitude: row.longitude });
  const [state, formAction, pending] = useActionState<PuntoState, FormData>(moveLocalityAction, undefined);

  return (
    <li className="p-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className={`font-semibold ${row.active ? "text-slate-900" : "text-slate-400 line-through"}`}>{row.name}</p>
          <p className="text-xs text-slate-500">{row.province} · {row.users} {row.users === 1 ? "usuario" : "usuarios"} · {row.latitude.toFixed(4)}, {row.longitude.toFixed(4)}</p>
        </div>
        <button type="button" onClick={() => setEditando((v) => !v)} className="adm-btn adm-btn-ghost adm-btn-sm">{editando ? "Cerrar" : "Corregir punto"}</button>
        <form action={toggleLocalityAction}>
          <input type="hidden" name="id" value={row.id} />
          <input type="hidden" name="active" value={row.active ? "0" : "1"} />
          <button className={`adm-btn adm-btn-sm ${row.active ? "adm-btn-ghost" : "adm-btn-ok"}`}>{row.active ? "Desactivar" : "Activar"}</button>
        </form>
      </div>
      {editando && (
        <form action={formAction} className="mt-3 space-y-2">
          <input type="hidden" name="id" value={row.id} />
          <input type="hidden" name="latitude" value={punto.latitude} />
          <input type="hidden" name="longitude" value={punto.longitude} />
          <MapPicker latitude={punto.latitude} longitude={punto.longitude} onChange={(latitude, longitude) => setPunto({ latitude, longitude })} />
          <div className="flex items-center gap-3">
            <button disabled={pending} className="adm-btn">{pending ? "Guardando…" : "Guardar punto"}</button>
            {state?.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
            {state?.ok && <p role="status" className="text-sm text-emerald-700">Punto guardado.</p>}
          </div>
        </form>
      )}
    </li>
  );
}
