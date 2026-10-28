"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Guardado = { handle: string; kind: "cvu" | "alias"; holder: string } | null;

/**
 * La otra forma de cobrar, además de Mercado Pago: el cliente le transfiere
 * directo al CVU/CBU o alias y carga el comprobante. ServiRed no toca la plata;
 * el oferente confirma que le llegó y recién ahí lo califican.
 */
export function TransferenciaCard({ guardado, handleViejo, nombreLegal }: { guardado: Guardado; handleViejo: string | null; nombreLegal: string }) {
  const router = useRouter();
  const [editando, setEditando] = useState(!guardado);
  const [handle, setHandle] = useState(guardado?.handle ?? handleViejo ?? "");
  const [holder, setHolder] = useState(guardado?.holder ?? nombreLegal);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function enviar(body: Record<string, unknown>) {
    setBusy(true); setError(null); setOk(false);
    try {
      const res = await fetch("/api/perfil/cobro", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || "No pudimos guardar el dato de cobro.");
      else {
        const borrado = body.borrar === true;
        setOk(true);
        setEditando(borrado);
        if (borrado) setHandle("");
        router.refresh();
      }
    } catch { setError("No hay conexión. Probá de nuevo."); }
    setBusy(false);
  }

  return (
    <section id="transferencia" aria-labelledby="transferencia-titulo" className="glass glass-solid scroll-mt-24 space-y-3 rounded-2xl p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-2xl">🏦</span>
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-wide text-pro-dark uppercase">Transferencia</p>
          <h2 id="transferencia-titulo" className="text-lg font-extrabold text-slate-900">{guardado ? "Cobrás también por transferencia" : "Cobrá por transferencia"}</h2>
        </div>
      </div>
      <p className="text-sm text-slate-600">
        Además de Mercado Pago (o en vez de), tu cliente te puede transferir directo a tu CVU, CBU o alias y cargar el comprobante. Vos confirmás cuando te llega y ahí te puede calificar. Sin comisión de ServiRed.
      </p>

      {!editando && guardado && (
        <div className="space-y-3">
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="rounded-xl bg-white/70 px-3 py-2"><dt className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">{guardado.kind === "cvu" ? "CVU / CBU" : "Alias"}</dt><dd className={`break-all font-bold text-slate-900 ${guardado.kind === "cvu" ? "font-mono" : ""}`}>{guardado.handle}</dd></div>
            <div className="rounded-xl bg-white/70 px-3 py-2"><dt className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">Titular</dt><dd className="font-bold text-slate-900">{guardado.holder}</dd></div>
          </dl>
          <p className="text-xs text-slate-500">El cliente lo ve recién cuando marcás el trabajo como terminado.</p>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => { setOk(false); setEditando(true); }} className="glass-btn px-4 py-2 text-sm">Cambiar</button>
            <button type="button" disabled={busy} onClick={() => enviar({ borrar: true })} className="text-sm font-semibold text-red-600 hover:underline disabled:opacity-60">{busy ? "Quitando…" : "Dejar de cobrar por transferencia"}</button>
          </div>
        </div>
      )}

      {editando && (
        <form onSubmit={(e) => { e.preventDefault(); void enviar({ handle, holder }); }} className="space-y-3">
          <label className="block text-sm font-medium text-slate-900">
            CVU, CBU o alias
            <input required value={handle} onChange={(e) => setHandle(e.target.value)} maxLength={80} autoComplete="off" placeholder="0000003100… o mi.alias.mp" className="glass-field mt-1 w-full px-3 py-2.5 text-base sm:text-sm" />
            <span className="mt-1 block text-xs font-normal text-slate-500">Si son 22 dígitos lo tomamos como CVU o CBU (revisamos que esté bien); si no, como alias.</span>
          </label>
          <label className="block text-sm font-medium text-slate-900">
            Titular de la cuenta
            <input required value={holder} onChange={(e) => setHolder(e.target.value)} maxLength={80} autoComplete="name" className="glass-field mt-1 w-full px-3 py-2.5 text-base sm:text-sm" />
            <span className="mt-1 block text-xs font-normal text-slate-500">Como figura en el banco: el cliente lo compara antes de transferir.</span>
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button disabled={busy} className="rounded-xl bg-pro px-4 py-2.5 text-sm font-semibold text-white hover:bg-pro-dark disabled:opacity-60">{busy ? "Guardando…" : "Guardar dato de cobro"}</button>
            {guardado && <button type="button" disabled={busy} onClick={() => { setHandle(guardado.handle); setHolder(guardado.holder); setError(null); setEditando(false); }} className="text-sm font-semibold text-slate-600 hover:underline">Cancelar</button>}
          </div>
        </form>
      )}
      {ok && <p role="status" className="text-sm text-emerald-700">Guardado.</p>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </section>
  );
}
