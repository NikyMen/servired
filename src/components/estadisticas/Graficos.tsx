/**
 * Gráficos del panel de estadísticas, en HTML y CSS: barras de una sola
 * serie, así que alcanza con un color (el del panel) y el número va en el
 * tooltip y en la tabla. Sin dependencias y se renderizan en el server.
 */

const fmt = new Intl.NumberFormat("es-AR");

/** Barras verticales: una por día, por hora o por día de la semana. */
export function Columnas({ datos, unidad = "visitas", alto = "h-40", cadaEtiqueta = 1, titulo }: {
  datos: { etiqueta: string; valor: number; detalle?: string }[];
  unidad?: string;
  alto?: string;
  /** Mostrar una etiqueta del eje cada N barras, para que no se encimen. */
  cadaEtiqueta?: number;
  titulo: string;
}) {
  const max = Math.max(1, ...datos.map((d) => d.valor));
  const pico = datos.reduce((mejor, d) => (d.valor > mejor.valor ? d : mejor), datos[0] ?? { etiqueta: "", valor: 0 });
  return (
    <figure>
      <div className={`relative flex items-end gap-[2px] border-b border-slate-300 ${alto}`} role="list" aria-label={titulo}>
        {/* Líneas guía al 50 % y al 100 %, bien suaves. */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-slate-200" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-slate-200" />
        <span aria-hidden className="pointer-events-none absolute -top-2 right-0 bg-white pl-1 text-[10px] text-slate-400">{fmt.format(max)}</span>
        {datos.map((d, i) => (
          <div key={i} role="listitem" aria-label={`${d.etiqueta}: ${fmt.format(d.valor)} ${unidad}`} className="group relative flex h-full flex-1 items-end">
            <div
              className="w-full rounded-t-[4px] bg-[var(--adm-accent)] opacity-85 transition-opacity group-hover:opacity-100"
              style={{ height: d.valor ? `max(${(d.valor / max) * 100}%, 3px)` : 0 }}
            />
            {/* Zona de hover más grande que la barra. */}
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[11px] text-white shadow group-hover:block">
              <strong>{d.etiqueta}</strong> · {fmt.format(d.valor)} {unidad}{d.detalle ? ` · ${d.detalle}` : ""}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-[2px]" aria-hidden>
        {datos.map((d, i) => (
          <span key={i} className="flex-1 truncate text-center text-[10px] text-slate-500">{i % cadaEtiqueta === 0 ? d.etiqueta : ""}</span>
        ))}
      </div>
      {pico && pico.valor > 0 && <figcaption className="mt-2 text-xs text-slate-500">Pico: <strong className="text-slate-700">{pico.etiqueta}</strong> con {fmt.format(pico.valor)} {unidad}.</figcaption>}
    </figure>
  );
}

/** Ranking con barra horizontal: fuentes, ciudades, búsquedas, perfiles… */
export function Ranking({ filas, unidad = "visitas", vacio = "Todavía no hay datos.", extra }: {
  filas: { nombre: string; cantidad: number; href?: string; nota?: string }[];
  unidad?: string;
  vacio?: string;
  /** Texto chico a la derecha del número (p. ej. "8 personas"). */
  extra?: (i: number) => string | null;
}) {
  if (!filas.length) return <p className="text-sm text-slate-500">{vacio}</p>;
  const max = Math.max(1, ...filas.map((f) => f.cantidad));
  const total = filas.reduce((n, f) => n + f.cantidad, 0);
  return (
    <ol className="space-y-2">
      {filas.map((f, i) => (
        <li key={`${f.nombre}-${i}`} className="group" title={`${f.nombre}: ${fmt.format(f.cantidad)} ${unidad}`}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-slate-700">
              <span className="mr-1.5 text-xs tabular-nums text-slate-400">{i + 1}.</span>
              {f.href ? <a href={f.href} target="_blank" rel="noopener noreferrer" className="hover:underline">{f.nombre}</a> : f.nombre}
              {f.nota && <span className="ml-1.5 text-xs text-slate-400">{f.nota}</span>}
            </span>
            <span className="shrink-0 tabular-nums font-semibold text-slate-900">
              {fmt.format(f.cantidad)}
              {extra?.(i) && <span className="ml-1 text-xs font-normal text-slate-500">{extra(i)}</span>}
              <span className="ml-1 text-xs font-normal text-slate-400">{Math.round((f.cantidad / total) * 100)}%</span>
            </span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-[var(--adm-accent)] opacity-80 group-hover:opacity-100" style={{ width: `${Math.max((f.cantidad / max) * 100, 2)}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Número grande con su explicación. */
export function Cifra({ titulo, valor, ayuda }: { titulo: string; valor: string; ayuda?: string }) {
  return (
    <div className="adm-card adm-card-pad">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{titulo}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{valor}</p>
      {ayuda && <p className="mt-0.5 text-xs text-slate-500">{ayuda}</p>}
    </div>
  );
}

export function Tarjeta({ titulo, ayuda, children, className = "" }: { titulo: string; ayuda?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`adm-card ${className}`}>
      <div className="adm-card-head">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{titulo}</h3>
          {ayuda && <p className="text-xs text-slate-500">{ayuda}</p>}
        </div>
      </div>
      <div className="adm-card-pad">{children}</div>
    </section>
  );
}
