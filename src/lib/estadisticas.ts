import { prisma } from "@/lib/prisma";

/**
 * Estadísticas del sitio para la pestaña «Estadísticas» del admin. Salen de
 * `AnalyticsSession` (una fila por visita), `PageView`, `SearchMetric` y de
 * las tablas del negocio. Se calcula todo en memoria: con el tráfico de hoy
 * son unos miles de filas por período, y SQLite no agrupa por hora local.
 */

export const PERIODOS = { hoy: "Hoy", "7": "7 días", "30": "30 días", "90": "90 días" } as const;
export type Periodo = keyof typeof PERIODOS;

/** Argentina no tiene horario de verano: siempre UTC−3. */
const DESFASE_MS = -3 * 60 * 60 * 1000;
const local = (d: Date) => new Date(d.getTime() + DESFASE_MS);
const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
/** Cuánto sin noticias para dejar de contar a alguien como en línea. */
export const EN_LINEA_MS = 2 * 60 * 1000;

export function desdeDe(periodo: Periodo, ahora = new Date()) {
  if (periodo === "hoy") {
    const l = local(ahora);
    return new Date(Date.UTC(l.getUTCFullYear(), l.getUTCMonth(), l.getUTCDate()) - DESFASE_MS);
  }
  return new Date(ahora.getTime() - Number(periodo) * 24 * 60 * 60 * 1000);
}

/** Agrupa el `source` crudo (hostname o utm_source) en algo que se entienda. */
export function fuenteLegible(source: string) {
  const s = source.toLowerCase();
  if (s === "directo" || !s) return "Directo";
  if (s === "ig" || s.includes("instagram")) return "Instagram";
  if (s === "fb" || s.includes("facebook")) return "Facebook";
  if (s === "wa" || s.includes("whatsapp")) return "WhatsApp";
  if (s.includes("tiktok")) return "TikTok";
  if (s === "com.google.android.gm" || s.includes("mail") || s.includes("outlook")) return "Correo";
  if (s.includes("google")) return "Google";
  if (s.includes("bing") || s.includes("duckduckgo") || s.includes("yahoo")) return "Otros buscadores";
  if (s.includes("servired")) return "El mismo sitio";
  if (s.includes("mercadopago")) return "Mercado Pago";
  return source;
}

const RUTAS: Record<string, string> = {
  "/": "Portada",
  "/mapa": "Mapa",
  "/buscar": "Buscar",
  "/entrar": "Entrar",
  "/crear-cuenta": "Crear cuenta",
  "/recuperar-clave": "Recuperar clave",
  "/publicar-solicitud": "Publicar solicitud",
  "/solicitudes": "Solicitudes",
  "/mensajes": "Mensajes",
  "/contrataciones": "Contrataciones",
  "/notificaciones": "Notificaciones",
  "/mi-perfil": "Mi perfil (cliente)",
  "/onboarding": "Completar alta",
  "/terminos": "Términos",
  "/planes": "Planes",
  "/pro": "Panel Ofrezco",
  "/pro/mi-perfil": "Mi perfil (Ofrezco)",
  "/pro/solicitudes": "Solicitudes (Ofrezco)",
  "/pro/mensajes": "Mensajes (Ofrezco)",
  "/verificar-email": "Verificar correo",
};

/** Nombre de una página para mostrar. Los perfiles van con el nombre del profesional. */
export function nombreDePagina(path: string, perfiles: Map<string, string>) {
  const limpio = path.replace(/\/$/, "") || "/";
  const perfil = /^\/profesionales\/([^/]+)$/.exec(limpio)?.[1];
  if (perfil) return `Perfil: ${perfiles.get(perfil) ?? "(dado de baja)"}`;
  return RUTAS[limpio] ?? limpio;
}

/** "Plomero", "plomero " y "plómero" son la misma búsqueda. */
function claveDeTermino(term: string) {
  return term.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ");
}

type Conteo = { nombre: string; cantidad: number };

function ranking(mapa: Map<string, number>, max = 10): Conteo[] {
  return [...mapa].map(([nombre, cantidad]) => ({ nombre, cantidad })).sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre)).slice(0, max);
}

function sumar(mapa: Map<string, number>, clave: string, n = 1) {
  mapa.set(clave, (mapa.get(clave) ?? 0) + n);
}

function mediana(valores: number[]) {
  if (!valores.length) return 0;
  const v = [...valores].sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : Math.round((v[m - 1] + v[m]) / 2);
}

export async function calcularEstadisticas(periodo: Periodo, ahora = new Date()) {
  const desde = desdeDe(periodo, ahora);
  const enPeriodo = { gte: desde };

  const [sesiones, vistas, busquedas, registros, aprobados, solicitudes, conversaciones, mensajes, contrataciones, pedidosPorRubro, usuariosPorLocalidad] = await Promise.all([
    prisma.analyticsSession.findMany({
      where: { startedAt: enPeriodo },
      select: { id: true, visitorKey: true, source: true, country: true, region: true, city: true, latitude: true, longitude: true, device: true, firstPath: true, durationSeconds: true, startedAt: true, conCuenta: true },
    }),
    prisma.pageView.findMany({ where: { createdAt: enPeriodo }, select: { sessionId: true, path: true, professionalId: true } }),
    prisma.searchMetric.findMany({ where: { createdAt: enPeriodo }, select: { term: true, sessionId: true, category: { select: { name: true } } } }),
    prisma.user.count({ where: { createdAt: enPeriodo } }),
    prisma.professional.count({ where: { approvedAt: enPeriodo } }),
    prisma.serviceRequest.count({ where: { createdAt: enPeriodo } }),
    prisma.conversation.count({ where: { createdAt: enPeriodo } }),
    prisma.message.count({ where: { createdAt: enPeriodo } }),
    prisma.booking.count({ where: { createdAt: enPeriodo } }),
    prisma.serviceRequest.groupBy({ by: ["categoryId"], where: { createdAt: enPeriodo, categoryId: { not: null } }, _count: true }),
    prisma.user.groupBy({ by: ["localityId"], where: { localityId: { not: null } }, _count: true }),
  ]);

  // Visitantes nuevos: su primera visita de todas cae dentro del período.
  const visitantes = [...new Set(sesiones.map((s) => s.visitorKey))];
  let recurrentes = 0;
  for (let i = 0; i < visitantes.length; i += 500) {
    const previos = await prisma.analyticsSession.groupBy({ by: ["visitorKey"], where: { visitorKey: { in: visitantes.slice(i, i + 500) }, startedAt: { lt: desde } } });
    recurrentes += previos.length;
  }

  // Serie: por hora si es "hoy", por día si no.
  const serie: { etiqueta: string; visitas: number; visitantes: number }[] = [];
  const indiceSerie = new Map<string, number>();
  const visitantesSerie: Set<string>[] = [];
  if (periodo === "hoy") {
    for (let h = 0; h < 24; h++) { indiceSerie.set(String(h), h); serie.push({ etiqueta: `${h} h`, visitas: 0, visitantes: 0 }); visitantesSerie.push(new Set()); }
  } else {
    const dias = Number(periodo);
    for (let d = dias - 1; d >= 0; d--) {
      const l = local(new Date(ahora.getTime() - d * 86_400_000));
      const clave = l.toISOString().slice(0, 10);
      indiceSerie.set(clave, serie.length);
      serie.push({ etiqueta: `${DIAS[l.getUTCDay()]} ${l.getUTCDate()}/${l.getUTCMonth() + 1}`, visitas: 0, visitantes: 0 });
      visitantesSerie.push(new Set());
    }
  }

  const porHora = Array<number>(24).fill(0);
  const porDiaSemana = Array<number>(7).fill(0); // Lun..Dom
  const fuentes = new Map<string, number>();
  const fuentesDetalle = new Map<string, Map<string, number>>();
  const dispositivos = new Map<string, number>();
  const ciudades = new Map<string, number>();
  const puntos = new Map<string, { nombre: string; lat: number; lng: number; visitas: number }>();
  const entradas = new Map<string, number>();
  let conUbicacion = 0;

  for (const s of sesiones) {
    const l = local(s.startedAt);
    porHora[l.getUTCHours()]++;
    porDiaSemana[(l.getUTCDay() + 6) % 7]++;
    const i = indiceSerie.get(periodo === "hoy" ? String(l.getUTCHours()) : l.toISOString().slice(0, 10));
    if (i !== undefined) { serie[i].visitas++; visitantesSerie[i].add(s.visitorKey); }

    const fuente = fuenteLegible(s.source);
    sumar(fuentes, fuente);
    if (!fuentesDetalle.has(fuente)) fuentesDetalle.set(fuente, new Map());
    sumar(fuentesDetalle.get(fuente)!, s.source);
    sumar(dispositivos, s.device === "celular" ? "Celular" : s.device === "tablet" ? "Tablet" : s.device === "compu" ? "Computadora" : "Sin dato (visitas viejas)");
    sumar(entradas, s.firstPath);

    if (s.city || s.region) {
      conUbicacion++;
      const nombre = [s.city, s.region].filter(Boolean).join(", ") + (s.country && s.country !== "AR" ? ` (${s.country})` : "");
      sumar(ciudades, nombre);
      if (s.latitude != null && s.longitude != null) {
        const p = puntos.get(nombre) ?? { nombre, lat: s.latitude, lng: s.longitude, visitas: 0 };
        p.visitas++;
        puntos.set(nombre, p);
      }
    }
  }
  visitantesSerie.forEach((set, i) => { serie[i].visitantes = set.size; });

  // Páginas y perfiles.
  const paginas = new Map<string, number>();
  const vistasPorSesion = new Map<string, number>();
  const vistasPerfil = new Map<string, number>();
  const visitantesPerfil = new Map<string, Set<string>>();
  const visitorDeSesion = new Map(sesiones.map((s) => [s.id, s.visitorKey]));
  for (const v of vistas) {
    sumar(paginas, v.path.replace(/\/$/, "") || "/");
    sumar(vistasPorSesion, v.sessionId);
    if (v.professionalId) {
      sumar(vistasPerfil, v.professionalId);
      if (!visitantesPerfil.has(v.professionalId)) visitantesPerfil.set(v.professionalId, new Set());
      visitantesPerfil.get(v.professionalId)!.add(visitorDeSesion.get(v.sessionId) ?? v.sessionId);
    }
  }
  const idsPerfil = [...new Set([...vistasPerfil.keys(), ...[...paginas.keys(), ...entradas.keys()].map((p) => /^\/profesionales\/([^/]+)/.exec(p)?.[1]).filter((x): x is string => Boolean(x))])];
  const pros = idsPerfil.length ? await prisma.professional.findMany({ where: { id: { in: idsPerfil } }, select: { id: true, name: true, headline: true } }) : [];
  const nombresPerfil = new Map(pros.map((p) => [p.id, p.name]));

  // Páginas por visita y rebote, solo con las visitas que ya cuentan páginas.
  const sesionesConVistas = sesiones.filter((s) => vistasPorSesion.has(s.id));
  const paginasPorVisita = sesionesConVistas.length ? sesionesConVistas.reduce((n, s) => n + vistasPorSesion.get(s.id)!, 0) / sesionesConVistas.length : null;
  const rebote = sesionesConVistas.length ? sesionesConVistas.filter((s) => vistasPorSesion.get(s.id) === 1).length / sesionesConVistas.length : null;

  // Búsquedas.
  const terminos = new Map<string, { variantes: Map<string, number>; veces: number; sesiones: Set<string> }>();
  const rubrosBuscados = new Map<string, number>();
  for (const b of busquedas) {
    if (b.term) {
      const clave = claveDeTermino(b.term);
      if (clave) {
        const t = terminos.get(clave) ?? { variantes: new Map(), veces: 0, sesiones: new Set() };
        t.veces++;
        t.sesiones.add(b.sessionId);
        sumar(t.variantes, b.term.trim().toLowerCase());
        terminos.set(clave, t);
      }
    }
    if (b.category) sumar(rubrosBuscados, b.category.name);
  }

  const [categorias, localidades] = await Promise.all([
    pedidosPorRubro.length ? prisma.category.findMany({ where: { id: { in: pedidosPorRubro.map((p) => p.categoryId!) } }, select: { id: true, name: true } }) : [],
    usuariosPorLocalidad.length ? prisma.locality.findMany({ where: { id: { in: usuariosPorLocalidad.map((u) => u.localityId!) } }, select: { id: true, name: true, province: true, latitude: true, longitude: true } }) : [],
  ]);
  const nombreCategoria = new Map(categorias.map((c) => [c.id, c.name]));
  const localidad = new Map(localidades.map((l) => [l.id, l]));

  return {
    periodo,
    desde,
    kpis: {
      visitas: sesiones.length,
      visitantes: visitantes.length,
      nuevos: visitantes.length - recurrentes,
      recurrentes,
      paginasVistas: vistas.length,
      paginasPorVisita,
      rebote,
      duracionMediana: mediana(sesiones.map((s) => s.durationSeconds)),
      conCuenta: sesiones.filter((s) => s.conCuenta).length,
    },
    negocio: { registros, aprobados, solicitudes, conversaciones, mensajes, contrataciones },
    serie,
    porHora,
    porDiaSemana: porDiaSemana.map((cantidad, i) => ({ nombre: DIAS[(i + 1) % 7], cantidad })),
    fuentes: ranking(fuentes, 12).map((f) => ({ ...f, detalle: ranking(fuentesDetalle.get(f.nombre) ?? new Map(), 6) })),
    dispositivos: ranking(dispositivos),
    ciudades: ranking(ciudades, 15),
    conUbicacion,
    puntos: [...puntos.values()],
    usuariosPorLocalidad: usuariosPorLocalidad
      .map((u) => ({ l: localidad.get(u.localityId!), cantidad: u._count }))
      .filter((u) => u.l)
      .map((u) => ({ nombre: `${u.l!.name}, ${u.l!.province}`, cantidad: u.cantidad, lat: u.l!.latitude, lng: u.l!.longitude }))
      .sort((a, b) => b.cantidad - a.cantidad),
    paginas: ranking(paginas, 15).map((p) => ({ nombre: nombreDePagina(p.nombre, nombresPerfil), path: p.nombre, cantidad: p.cantidad })),
    entradas: ranking(entradas, 10).map((p) => ({ nombre: nombreDePagina(p.nombre, nombresPerfil), path: p.nombre, cantidad: p.cantidad })),
    terminos: [...terminos.values()]
      .map((t) => ({ nombre: [...t.variantes].sort((a, b) => b[1] - a[1])[0][0], cantidad: t.veces, personas: t.sesiones.size }))
      .sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre))
      .slice(0, 20),
    totalBusquedas: busquedas.filter((b) => b.term).length,
    rubrosBuscados: ranking(rubrosBuscados, 10),
    rubrosPedidos: pedidosPorRubro.map((p) => ({ nombre: nombreCategoria.get(p.categoryId!) ?? "—", cantidad: p._count })).sort((a, b) => b.cantidad - a.cantidad).slice(0, 10),
    perfiles: [...vistasPerfil]
      .map(([id, cantidad]) => ({ id, cantidad, personas: visitantesPerfil.get(id)?.size ?? 0, nombre: nombresPerfil.get(id) ?? "(dado de baja)", rubro: pros.find((p) => p.id === id)?.headline ?? "" }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 15),
  };
}

export type Estadisticas = Awaited<ReturnType<typeof calcularEstadisticas>>;

/** Quiénes están ahora: avisaron en los últimos 2 minutos. */
export async function enLineaAhora(ahora = new Date()) {
  const activos = await prisma.analyticsSession.findMany({
    where: { lastSeenAt: { gte: new Date(ahora.getTime() - EN_LINEA_MS) } },
    select: { visitorKey: true, conCuenta: true, lastPath: true, city: true, device: true },
  });
  // Una persona con dos pestañas es una sola.
  const porPersona = new Map(activos.map((a) => [a.visitorKey, a]));
  const personas = [...porPersona.values()];
  const paginas = new Map<string, number>();
  const ciudades = new Map<string, number>();
  for (const p of personas) {
    sumar(paginas, (p.lastPath ?? "/").replace(/\/$/, "") || "/");
    if (p.city) sumar(ciudades, p.city);
  }
  const ids = [...paginas.keys()].map((p) => /^\/profesionales\/([^/]+)$/.exec(p)?.[1]).filter((x): x is string => Boolean(x));
  const pros = ids.length ? await prisma.professional.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }) : [];
  const nombres = new Map(pros.map((p) => [p.id, p.name]));
  return {
    total: personas.length,
    conCuenta: personas.filter((p) => p.conCuenta).length,
    celular: personas.filter((p) => p.device === "celular").length,
    paginas: ranking(paginas, 8).map((p) => ({ nombre: nombreDePagina(p.nombre, nombres), cantidad: p.cantidad })),
    ciudades: ranking(ciudades, 5),
    hora: ahora.toISOString(),
  };
}

export type EnLinea = Awaited<ReturnType<typeof enLineaAhora>>;
