import Link from "next/link";
import { Cifra, Columnas, Ranking, Tarjeta } from "@/components/estadisticas/Graficos";
import { EnLineaAhora } from "@/components/estadisticas/EnLineaAhora";
import { MapaVisitas } from "@/components/estadisticas/MapaVisitas";
import { PERIODOS, type EnLinea, type Estadisticas, type Periodo } from "@/lib/estadisticas";

const fmt = new Intl.NumberFormat("es-AR");
const pct = (n: number | null) => (n == null ? "—" : `${Math.round(n * 100)}%`);

function duracion(segundos: number) {
  if (segundos < 60) return `${segundos} s`;
  const m = Math.floor(segundos / 60);
  return m < 60 ? `${m} min ${segundos % 60} s` : `${Math.floor(m / 60)} h ${m % 60} min`;
}

/** Pestaña «Estadísticas»: tráfico, de dónde vienen, qué buscan y qué miran. */
export function AdminEstadisticas({ datos, enLinea, geoip }: { datos: Estadisticas; enLinea: EnLinea; geoip: boolean }) {
  const { kpis, negocio } = datos;
  const sinUbicacion = kpis.visitas - datos.conUbicacion;

  return (
    <div className="space-y-4">
      <EnLineaAhora inicial={enLinea} />

      <nav aria-label="Período" className="flex flex-wrap items-center gap-2">
        {(Object.keys(PERIODOS) as Periodo[]).map((p) => (
          <Link key={p} href={`/admin?tab=estadisticas&p=${p}`} aria-current={datos.periodo === p ? "page" : undefined}
            className={`adm-btn adm-btn-sm ${datos.periodo === p ? "" : "adm-btn-ghost"}`}>
            {PERIODOS[p]}
          </Link>
        ))}
        <span className="text-xs text-slate-500">Horarios en hora argentina. No cuenta las visitas al panel de administración.</span>
      </nav>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cifra titulo="Visitas" valor={fmt.format(kpis.visitas)} ayuda={`${fmt.format(kpis.conCuenta)} con la sesión iniciada`} />
        <Cifra titulo="Personas distintas" valor={fmt.format(kpis.visitantes)} ayuda={`${fmt.format(kpis.nuevos)} nuevas · ${fmt.format(kpis.recurrentes)} que vuelven`} />
        <Cifra titulo="Páginas vistas" valor={fmt.format(kpis.paginasVistas)} ayuda={kpis.paginasPorVisita == null ? "Se empiezan a contar con esta versión" : `${kpis.paginasPorVisita.toFixed(1)} por visita · rebote ${pct(kpis.rebote)}`} />
        <Cifra titulo="Tiempo en el sitio" valor={duracion(kpis.duracionMediana)} ayuda="Mediana por visita" />
      </div>

      <Tarjeta titulo="Qué pasó en el sitio" ayuda="Lo que hizo la gente en el período.">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
          {([
            ["Cuentas nuevas", negocio.registros],
            ["Oferentes aprobados", negocio.aprobados],
            ["Solicitudes publicadas", negocio.solicitudes],
            ["Conversaciones nuevas", negocio.conversaciones],
            ["Mensajes", negocio.mensajes],
            ["Contrataciones", negocio.contrataciones],
          ] as const).map(([nombre, valor]) => (
            <div key={nombre}>
              <dt className="text-xs text-slate-500">{nombre}</dt>
              <dd className="text-xl font-bold tabular-nums text-slate-900">{fmt.format(valor)}</dd>
            </div>
          ))}
        </dl>
      </Tarjeta>

      <Tarjeta titulo={datos.periodo === "hoy" ? "Visitas de hoy, hora por hora" : "Visitas por día"}>
        <Columnas
          titulo="Visitas en el período"
          datos={datos.serie.map((d) => ({ etiqueta: d.etiqueta, valor: d.visitas, detalle: `${d.visitantes} personas` }))}
          cadaEtiqueta={datos.serie.length > 31 ? 7 : datos.serie.length > 12 ? 3 : 1}
        />
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-xs font-semibold text-slate-500">Ver como tabla</summary>
          <table className="adm-table mt-2">
            <thead><tr><th>{datos.periodo === "hoy" ? "Hora" : "Día"}</th><th>Visitas</th><th>Personas</th></tr></thead>
            <tbody>{datos.serie.map((d) => <tr key={d.etiqueta}><td>{d.etiqueta}</td><td className="tabular-nums">{d.visitas}</td><td className="tabular-nums">{d.visitantes}</td></tr>)}</tbody>
          </table>
        </details>
      </Tarjeta>

      <div className="grid gap-4 lg:grid-cols-3">
        <Tarjeta titulo="¿A qué hora entran?" ayuda="Visitas según la hora en que empezaron." className="lg:col-span-2">
          <Columnas titulo="Visitas por hora del día" datos={datos.porHora.map((valor, h) => ({ etiqueta: `${h} h`, valor }))} cadaEtiqueta={3} alto="h-32" />
        </Tarjeta>
        <Tarjeta titulo="¿Qué día?">
          <Columnas titulo="Visitas por día de la semana" datos={datos.porDiaSemana.map((d) => ({ etiqueta: d.nombre, valor: d.cantidad }))} alto="h-32" />
        </Tarjeta>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Tarjeta titulo="¿De dónde vienen?" ayuda="«Directo» incluye a quien escribe la dirección y los enlaces que se abren desde WhatsApp, que no avisa de dónde vienen.">
          <Ranking filas={datos.fuentes.map((f) => ({ nombre: f.nombre, cantidad: f.cantidad, nota: f.detalle.length > 1 || (f.detalle[0] && f.detalle[0].nombre !== f.nombre) ? f.detalle.map((d) => d.nombre).slice(0, 3).join(", ") : undefined }))} />
        </Tarjeta>
        <Tarjeta titulo="Dispositivo">
          <Ranking filas={datos.dispositivos} />
          <h4 className="mt-5 mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Página por la que entran</h4>
          <Ranking filas={datos.entradas.map((p) => ({ nombre: p.nombre, cantidad: p.cantidad, href: p.path }))} />
        </Tarjeta>
      </div>

      <Tarjeta titulo="¿Dónde están?" ayuda={geoip ? "Visitas: ciudad aproximada según la conexión (puede marcar la ciudad del proveedor de internet). Usuarios: la localidad que eligieron al registrarse." : undefined}>
        {!geoip && (
          <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            La ubicación de las visitas está apagada: falta la base de ciudades en el servidor (<code className="rounded bg-amber-100 px-1">GEOIP_DB</code>). Mientras tanto se ven los usuarios registrados por localidad.
          </p>
        )}
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <MapaVisitas
            visitas={datos.puntos.map((p) => ({ nombre: p.nombre, lat: p.lat, lng: p.lng, cantidad: p.visitas }))}
            usuarios={datos.usuariosPorLocalidad.map((u) => ({ nombre: u.nombre, lat: u.lat, lng: u.lng, cantidad: u.cantidad }))}
          />
          <div className="space-y-5">
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Ciudades de las visitas</h4>
              <Ranking filas={datos.ciudades} vacio={geoip ? "Todavía no hay visitas con ubicación." : "Sin datos de ubicación."} />
              {geoip && sinUbicacion > 0 && <p className="mt-2 text-xs text-slate-400">{fmt.format(sinUbicacion)} visitas sin ubicación (anteriores a esta versión o de conexiones que no se pueden ubicar).</p>}
            </div>
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Usuarios por localidad (todos)</h4>
              <Ranking filas={datos.usuariosPorLocalidad.slice(0, 8)} unidad="usuarios" />
            </div>
          </div>
        </div>
      </Tarjeta>

      <div className="grid gap-4 lg:grid-cols-2">
        <Tarjeta titulo="Palabras más buscadas" ayuda={`${fmt.format(datos.totalBusquedas)} búsquedas con texto. Mayúsculas y tildes se juntan.`}>
          <Ranking filas={datos.terminos} unidad="búsquedas" extra={(i) => `${datos.terminos[i].personas} pers.`} vacio="Nadie buscó con texto en este período." />
        </Tarjeta>
        <Tarjeta titulo="Perfiles más vistos" ayuda="Veces que se abrió cada perfil público y cuántas personas distintas lo vieron.">
          <Ranking filas={datos.perfiles.map((p) => ({ nombre: p.nombre, cantidad: p.cantidad, nota: p.rubro, href: `/profesionales/${p.id}` }))} unidad="vistas" extra={(i) => `${datos.perfiles[i].personas} pers.`} vacio="Todavía no hay vistas de perfiles registradas (se cuentan desde esta versión)." />
        </Tarjeta>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Tarjeta titulo="Rubros más buscados" ayuda="Al filtrar por categoría.">
          <Ranking filas={datos.rubrosBuscados} unidad="búsquedas" vacio="Sin búsquedas por rubro." />
        </Tarjeta>
        <Tarjeta titulo="Rubros más pedidos" ayuda="Solicitudes publicadas por categoría.">
          <Ranking filas={datos.rubrosPedidos} unidad="solicitudes" vacio="Sin solicitudes en este período." />
        </Tarjeta>
        <Tarjeta titulo="Páginas más vistas">
          <Ranking filas={datos.paginas.map((p) => ({ nombre: p.nombre, cantidad: p.cantidad, href: p.path }))} unidad="vistas" vacio="Se empiezan a contar con esta versión." />
        </Tarjeta>
      </div>

      {geoip && <p className="text-right text-[11px] text-slate-400">IP Geolocation by <a href="https://db-ip.com" target="_blank" rel="noopener noreferrer" className="underline">DB-IP</a></p>}
    </div>
  );
}
