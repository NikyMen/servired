import { reviewCredentialAction } from "@/app/admin/actions";

type Fila = { id: string; kind: string; number: string | null; issuer: string | null; status: string; reviewReason: string | null; mimeType: string; createdAt: string; professional: { name: string }; category: { name: string } | null };

const TIPO: Record<string, string> = { matricula: "Matrícula", certificado: "Certificado" };
const ESTADO: Record<string, string> = { pending: "Pendiente", approved: "Aprobada", rejected: "Rechazada" };

/**
 * Revisión de matrículas y certificados. Cada decisión va atada con `.bind`
 * al botón: un `<button name value>` no llega en el build de producción con
 * React 19 (mismo caso que el KYC y las denuncias).
 */
export function AdminMatriculas({ rows }: { rows: Fila[] }) {
  if (!rows.length) return <p className="glass glass-solid rounded-2xl p-4 text-sm text-slate-500">No hay matrículas para revisar.</p>;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {rows.map((row) => (
        <form key={row.id} className="glass glass-solid space-y-2 rounded-2xl p-4">
          <input type="hidden" name="id" value={row.id} />
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold text-slate-900">{row.professional.name}</p>
              <p className="text-sm text-slate-600">{TIPO[row.kind] ?? row.kind}{row.category ? ` · ${row.category.name}` : ""}</p>
              <p className="text-xs text-slate-500">{[row.number && `N.º ${row.number}`, row.issuer].filter(Boolean).join(" · ") || "Sin número ni emisor"}</p>
            </div>
            <span className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-semibold text-slate-600">{ESTADO[row.status] ?? row.status}</span>
          </div>
          <a href={`/api/admin/matriculas/${row.id}`} target="_blank" rel="noopener noreferrer" className="inline-block text-sm font-semibold text-cliente hover:underline">Ver {row.mimeType === "application/pdf" ? "PDF" : "imagen"}</a>
          {row.status === "rejected" && row.reviewReason && <p className="text-xs text-red-700">Motivo: {row.reviewReason}</p>}
          {row.status === "pending" && (
            <>
              <textarea name="reason" rows={2} placeholder="Motivo (obligatorio para rechazar)" className="glass-field w-full resize-none px-3 py-2 text-sm" />
              <div className="flex gap-2">
                <button formAction={reviewCredentialAction.bind(null, "approve")} className="rounded-xl bg-pro px-3 py-2 text-sm font-semibold text-white">Aprobar</button>
                <button formAction={reviewCredentialAction.bind(null, "reject")} className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white">Rechazar</button>
              </div>
            </>
          )}
          {row.status === "approved" && (
            <div className="flex items-center gap-2">
              <input name="reason" placeholder="Motivo para quitarla" className="glass-field min-w-0 flex-1 px-3 py-1.5 text-xs" />
              <button formAction={reviewCredentialAction.bind(null, "reject")} className="shrink-0 text-xs font-semibold text-red-600 hover:underline">Quitar la aprobación</button>
            </div>
          )}
        </form>
      ))}
    </div>
  );
}
