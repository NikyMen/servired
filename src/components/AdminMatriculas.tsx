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
  if (!rows.length) return <p className="adm-card p-6 text-center text-sm text-slate-500">No hay matrículas para revisar.</p>;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {rows.map((row) => (
        <form key={row.id} className="adm-card space-y-2 p-4">
          <input type="hidden" name="id" value={row.id} />
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold text-slate-900">{row.professional.name}</p>
              <p className="text-sm text-slate-600">{TIPO[row.kind] ?? row.kind}{row.category ? ` · ${row.category.name}` : ""}</p>
              <p className="text-xs text-slate-500">{[row.number && `N.º ${row.number}`, row.issuer].filter(Boolean).join(" · ") || "Sin número ni emisor"}</p>
            </div>
            <span className={`adm-badge ${row.status === "approved" ? "adm-badge-ok" : row.status === "rejected" ? "adm-badge-bad" : "adm-badge-warn"}`}>{ESTADO[row.status] ?? row.status}</span>
          </div>
          <a href={`/api/admin/matriculas/${row.id}`} target="_blank" rel="noopener noreferrer" className="inline-block text-sm font-semibold text-indigo-600 hover:underline">Ver {row.mimeType === "application/pdf" ? "PDF" : "imagen"}</a>
          {row.status === "rejected" && row.reviewReason && <p className="text-xs text-red-700">Motivo: {row.reviewReason}</p>}
          {row.status === "pending" && (
            <>
              <textarea name="reason" rows={2} placeholder="Motivo (obligatorio para rechazar)" className="adm-field resize-none" />
              <div className="flex gap-2">
                <button formAction={reviewCredentialAction.bind(null, "approve")} className="adm-btn adm-btn-ok">Aprobar</button>
                <button formAction={reviewCredentialAction.bind(null, "reject")} className="adm-btn bg-red-600 hover:bg-red-700">Rechazar</button>
              </div>
            </>
          )}
          {row.status === "approved" && (
            <div className="flex items-center gap-2">
              <input name="reason" placeholder="Motivo para quitarla" className="adm-field min-w-0 flex-1 py-1.5 text-xs" />
              <button formAction={reviewCredentialAction.bind(null, "reject")} className="shrink-0 text-xs font-semibold text-red-600 hover:underline">Quitar la aprobación</button>
            </div>
          )}
        </form>
      ))}
    </div>
  );
}
