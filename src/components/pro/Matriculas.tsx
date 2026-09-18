"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Item = { id: string; kind: string; number: string | null; issuer: string | null; status: string; reviewReason: string | null; category: { name: string } | null };

const TIPO: Record<string, string> = { matricula: "Matrícula", certificado: "Certificado" };
const ESTADO: Record<string, { texto: string; clase: string }> = {
  pending: { texto: "Pendiente de aprobación", clase: "bg-amber-50 text-amber-800" },
  approved: { texto: "Aprobada", clase: "bg-emerald-50 text-emerald-700" },
  rejected: { texto: "Rechazada", clase: "bg-red-50 text-red-700" },
};
const CAMPO = "glass-field mt-1 w-full px-3 py-2 text-sm";

/** "Matrícula y certificados" en el perfil del profesional. Es opcional: suma la insignia "Matriculado". */
export function Matriculas({ items, rubros }: { items: Item[]; rubros: { id: string; name: string }[] }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [kind, setKind] = useState("matricula");
  const [categoryId, setCategoryId] = useState("");
  const [number, setNumber] = useState("");
  const [issuer, setIssuer] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subir(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return setError("Adjuntá la foto o el PDF.");
    setBusy(true); setError(null);
    const form = new FormData();
    form.set("kind", kind); form.set("categoryId", categoryId); form.set("number", number); form.set("issuer", issuer); form.set("file", file);
    const res = await fetch("/api/pro/matriculas", { method: "POST", body: form }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(false);
    // Si falla se queda todo lo elegido para reintentar.
    if (!res?.ok) return setError(data?.error || "No pudimos subir el archivo. Revisá tu conexión y probá de nuevo.");
    setAbierto(false); setNumber(""); setIssuer(""); setFile(null);
    router.refresh();
  }

  async function borrar(id: string) {
    if (!confirm("¿Borrar este documento?")) return;
    const res = await fetch(`/api/pro/matriculas/${id}`, { method: "DELETE" });
    if (!res.ok) { const data = await res.json().catch(() => ({})); return setError(data.error || "No pudimos borrarlo."); }
    router.refresh();
  }

  return (
    <section className="glass glass-solid space-y-3 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-slate-900">Matrícula y certificados</h2>
          <p className="text-sm text-slate-500">Opcional. Cuando administración aprueba uno, tu perfil muestra la insignia “Matriculado”.</p>
        </div>
        {!abierto && <button type="button" onClick={() => setAbierto(true)} className="glass-btn shrink-0 px-3 py-2 text-sm">Agregar</button>}
      </div>

      {items.length === 0 && !abierto && <p className="rounded-xl bg-white/60 p-3 text-sm text-slate-500">Todavía no subiste ninguno. Si tenés matrícula o un certificado de curso, sumalo: da confianza a quien te contrata.</p>}

      {items.length > 0 && (
        <ul className="divide-y divide-white/70">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-2 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">{TIPO[item.kind] ?? item.kind}{item.category ? ` · ${item.category.name}` : ""}</p>
                <p className="text-xs text-slate-500">{[item.number && `N.º ${item.number}`, item.issuer].filter(Boolean).join(" · ") || "Sin número"}</p>
                {item.status === "rejected" && item.reviewReason && <p className="mt-1 text-xs text-red-700">Motivo: {item.reviewReason}</p>}
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ESTADO[item.status]?.clase ?? ""}`}>{ESTADO[item.status]?.texto ?? item.status}</span>
              <a href={`/api/pro/matriculas/${item.id}`} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-pro-dark hover:underline">Ver</a>
              {item.status !== "approved" && <button type="button" onClick={() => borrar(item.id)} className="text-xs font-semibold text-red-600 hover:underline">Borrar</button>}
            </li>
          ))}
        </ul>
      )}

      {abierto && (
        <form onSubmit={subir} className="space-y-3 rounded-xl bg-white/60 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">Tipo
              <select value={kind} onChange={(e) => setKind(e.target.value)} className={CAMPO}><option value="matricula">Matrícula</option><option value="certificado">Certificado</option></select>
            </label>
            <label className="text-sm font-medium text-slate-700">Rubro (opcional)
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={CAMPO}><option value="">Sin rubro</option>{rubros.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
            </label>
            <label className="text-sm font-medium text-slate-700">Número (opcional)
              <input value={number} onChange={(e) => setNumber(e.target.value)} maxLength={60} className={CAMPO} />
            </label>
            <label className="text-sm font-medium text-slate-700">Quién la emitió (opcional)
              <input value={issuer} onChange={(e) => setIssuer(e.target.value)} maxLength={120} placeholder="Colegio, ente, instituto…" className={CAMPO} />
            </label>
          </div>
          <label className="block text-sm font-medium text-slate-700">Foto o PDF (hasta 8 MB)
            <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm" />
          </label>
          <p className="text-xs text-slate-500">Solo lo ven administración y vos. En tu perfil público se muestra la insignia, no el documento.</p>
          {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button disabled={busy} className="rounded-xl bg-pro px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Subiendo…" : "Enviar para aprobación"}</button>
            <button type="button" onClick={() => { setAbierto(false); setError(null); }} className="glass-btn glass-btn-ghost px-4 py-2 text-sm">Cancelar</button>
          </div>
        </form>
      )}
      {!abierto && error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </section>
  );
}
