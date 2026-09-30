import Link from "next/link";
import { moverPerfilAction } from "@/app/admin/actions";
import { formatDate } from "@/lib/format";
import type { MovimientoPerfil } from "@/lib/orden-perfiles";

type Fila = {
  id: string;
  name: string;
  businessName: string | null;
  headline: string;
  providerType: string;
  posicionFija: number | null;
  approvedAt: Date | null;
  createdAt: Date;
  oculto: boolean;
};

/** Fijados arriba, en el orden que eligió administración; debajo, el orden automático. */
export function AdminOrdenPerfiles({ rows }: { rows: Fila[] }) {
  const fijados = rows.filter((row) => row.posicionFija !== null);
  const automaticos = rows.filter((row) => row.posicionFija === null);

  return (
    <div className="space-y-4">
      <section className="adm-card overflow-hidden">
        <header className="border-b border-slate-100 p-4">
          <h3 className="font-bold text-slate-900">Fijados arriba</h3>
          <p className="text-sm text-slate-500">{fijados.length ? "Salen primero, en este orden, antes que cualquier otro perfil." : "Ninguno: la portada sigue el orden automático. Fijá un perfil desde la lista de abajo."}</p>
        </header>
        {fijados.length > 0 && (
          <ol className="divide-y divide-slate-100">
            {fijados.map((row, index) => (
              <FilaPerfil key={row.id} row={row} posicion={index + 1}>
                <Boton row={row} movimiento="primero" disabled={index === 0} titulo="Poner primero">⤒</Boton>
                <Boton row={row} movimiento="subir" disabled={index === 0} titulo="Subir un lugar">↑</Boton>
                <Boton row={row} movimiento="bajar" disabled={index === fijados.length - 1} titulo="Bajar un lugar">↓</Boton>
                <Boton row={row} movimiento="soltar" titulo="Volver al orden automático">Soltar</Boton>
              </FilaPerfil>
            ))}
          </ol>
        )}
      </section>

      <section className="adm-card overflow-hidden">
        <header className="border-b border-slate-100 p-4">
          <h3 className="font-bold text-slate-900">Orden automático</h3>
          <p className="text-sm text-slate-500">El último perfil aceptado va primero. {automaticos.length} {automaticos.length === 1 ? "perfil" : "perfiles"}.</p>
        </header>
        <ol className="divide-y divide-slate-100">
          {automaticos.map((row, index) => (
            <FilaPerfil key={row.id} row={row} posicion={fijados.length + index + 1}>
              <Boton row={row} movimiento="fijar" titulo="Sumarlo al final de los fijados">Fijar arriba</Boton>
            </FilaPerfil>
          ))}
        </ol>
      </section>
    </div>
  );
}

function FilaPerfil({ row, posicion, children }: { row: Fila; posicion: number; children: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-center gap-3 p-3">
      <span className="w-8 text-center text-sm font-bold text-slate-400">{posicion}</span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-900">
          <Link href={`/profesionales/${row.id}`} target="_blank" className="hover:underline">{row.businessName || row.name}</Link>
          {row.oculto && <span className="adm-badge adm-badge-warn ml-2">No se ve en el sitio</span>}
        </p>
        <p className="text-xs text-slate-500">
          {row.headline} · {row.providerType === "profesional" ? "Profesional" : "Oficio"} · aceptado {formatDate(row.approvedAt ?? row.createdAt)}
        </p>
      </div>
      <div className="flex gap-1.5">{children}</div>
    </li>
  );
}

function Boton({ row, movimiento, titulo, disabled, children }: { row: Fila; movimiento: MovimientoPerfil; titulo: string; disabled?: boolean; children: React.ReactNode }) {
  return (
    <form action={moverPerfilAction}>
      <input type="hidden" name="id" value={row.id} />
      <input type="hidden" name="movimiento" value={movimiento} />
      <button disabled={disabled} title={titulo} aria-label={titulo} className={`adm-btn adm-btn-sm ${movimiento === "fijar" ? "" : "adm-btn-ghost"} disabled:opacity-40`}>{children}</button>
    </form>
  );
}
