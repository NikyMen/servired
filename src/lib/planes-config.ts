/**
 * Todo lo que se ve en /planes, editable desde el panel (pestaña «Planes»).
 * Sin Prisma a propósito: lo importan la página, el editor del admin (cliente)
 * y la acción que guarda, y los tres usan el mismo saneado.
 */

export const PLAN_ICONOS = {
  check: "Tilde",
  whatsapp: "WhatsApp",
  sparkles: "Destellos",
  briefcase: "Maletín",
  star: "Estrella",
  verified: "Verificado",
  map: "Mapa",
  chat: "Chat",
  camera: "Cámara",
  bell: "Campana",
} as const;
export type PlanIcono = keyof typeof PLAN_ICONOS;

export type Plan = {
  /** Clave interna: une el plan con su columna de la comparación. No se ve. */
  id: string;
  name: string;
  description: string;
  audience: string;
  /** Pesos por mes. 0 = plan gratis. */
  monthlyPrice: number;
  icon: PlanIcono;
  includes: string;
  features: string[];
  highlight: boolean;
};

/** Valor de cada celda: "si" (tilde), "no" (raya) o un texto corto. */
export type FilaComparacion = { label: string; values: Record<string, string> };
export type Faq = { question: string; answer: string };

export type PlanesConfig = {
  /** Si /planes se ve en producción sin la variable PLANES_PREVIEW_ENABLED. */
  publicado: boolean;
  /** Cartelito amarillo de arriba. Vacío = no se muestra. */
  aviso: string;
  encabezado: { etiqueta: string; titulo: string; tituloDestacado: string; bajada: string; nota: string };
  anual: { activo: boolean; mesesPagos: number; etiqueta: string };
  planes: Plan[];
  base: { etiqueta: string; titulo: string; texto: string; items: string[] };
  comparacion: { etiqueta: string; titulo: string; bajada: string; filas: FilaComparacion[]; nota: string };
  faqTitulo: string;
  faqs: Faq[];
};

export const PLANES_SLUG = "planes";

/** Lo que había escrito a mano en la maqueta: arranca así hasta que se edite. */
export const PLANES_DEFAULT: PlanesConfig = {
  publicado: false,
  aviso: "Vista previa. Precios y beneficios tentativos. Las suscripciones todavía no están disponibles.",
  encabezado: {
    etiqueta: "Planes para profesionales y oferentes",
    titulo: "Tu oficio.",
    tituloDestacado: "Más oportunidades.",
    bajada: "Empezá gratis. Sumá contacto directo, visibilidad y herramientas para tu negocio cuando las necesites.",
    nota: "Para quienes buscan profesionales, ServiRed sigue siendo gratis.",
  },
  anual: { activo: true, mesesPagos: 10, etiqueta: "2 meses de regalo" },
  planes: [
    {
      id: "gratis",
      name: "Gratis",
      description: "Tu lugar en ServiRed, desde el primer día.",
      audience: "Para empezar y trabajar a tu ritmo.",
      monthlyPrice: 0,
      icon: "check",
      includes: "Todo lo esencial, sin suscripción",
      features: ["Perfil en búsquedas y mapa", "Recibí y respondé solicitudes", "Chat, presupuestos y contrataciones", "Fotos de tus trabajos y reseñas"],
      highlight: false,
    },
    {
      id: "contacto",
      name: "Contacto",
      description: "Una puerta más para que te contacten.",
      audience: "Para profesionales que coordinan por WhatsApp.",
      monthlyPrice: 4900,
      icon: "whatsapp",
      includes: "Todo lo de Gratis, más",
      features: ["Número de WhatsApp en tu perfil", "Botón de contacto directo", "QR para compartir tu perfil", "Tarjeta digital personalizada"],
      highlight: false,
    },
    {
      id: "impulso",
      name: "Impulso",
      description: "Dale más visibilidad a lo que hacés.",
      audience: "Para quienes quieren hacer crecer su clientela.",
      monthlyPrice: 9900,
      icon: "sparkles",
      includes: "Todo lo de Contacto, más",
      features: ["Espacio destacado por rubro y zona", "Rotación en módulos patrocinados", "Video de presentación en tu perfil", "Métricas de visitas y contactos"],
      highlight: true,
    },
    {
      id: "negocio",
      name: "Negocio",
      description: "Más herramientas para vos y tu equipo.",
      audience: "Para negocios y equipos de servicios.",
      monthlyPrice: 19900,
      icon: "briefcase",
      includes: "Todo lo de Impulso, más",
      features: ["Página con la marca de tu negocio", "Hasta 3 integrantes del equipo", "2 campañas locales por mes", "Reportes y soporte prioritario"],
      highlight: false,
    },
  ],
  base: {
    etiqueta: "Una base gratuita para todos",
    titulo: "Tu trabajo tiene lugar acá.",
    texto: "Queremos que puedas conseguir clientes desde el primer día. Pagás solamente si elegís sumar herramientas para tu actividad.",
    items: ["Solicitudes sin cupos", "Mensajes y presupuestos", "Perfil, fotos y reseñas", "Verificación en todos los planes"],
  },
  comparacion: {
    etiqueta: "Cada herramienta, en su lugar",
    titulo: "Compará los planes",
    bajada: "La misma base. Distintas formas de hacer crecer tu actividad.",
    filas: [
      { label: "Perfil, búsquedas y mapa", values: { gratis: "si", contacto: "si", impulso: "si", negocio: "si" } },
      { label: "Solicitudes y mensajes sin cupos", values: { gratis: "si", contacto: "si", impulso: "si", negocio: "si" } },
      { label: "Presupuestos, contrataciones y reseñas", values: { gratis: "si", contacto: "si", impulso: "si", negocio: "si" } },
      { label: "WhatsApp público y contacto directo", values: { gratis: "no", contacto: "si", impulso: "si", negocio: "si" } },
      { label: "QR y tarjeta digital personalizada", values: { gratis: "no", contacto: "si", impulso: "si", negocio: "si" } },
      { label: "Visibilidad en espacios patrocinados", values: { gratis: "no", contacto: "no", impulso: "Rotación local", negocio: "Rotación + campañas" } },
      { label: "Video y métricas del perfil", values: { gratis: "no", contacto: "no", impulso: "si", negocio: "si" } },
      { label: "Página de negocio y equipo", values: { gratis: "no", contacto: "no", impulso: "no", negocio: "Hasta 3 integrantes" } },
      { label: "Campañas locales", values: { gratis: "no", contacto: "no", impulso: "no", negocio: "2 por mes" } },
      { label: "Verificación de identidad", values: { gratis: "Mismo proceso", contacto: "Mismo proceso", impulso: "Mismo proceso", negocio: "Mismo proceso" } },
    ],
    nota: "Los destacados serían espacios patrocinados con rotación local. Ningún plan garantiza contrataciones ni modifica las reseñas o la verificación.",
  },
  faqTitulo: "Antes de elegir",
  faqs: [
    { question: "¿Tengo que pagar si busco un profesional?", answer: "No. Buscar profesionales, publicar solicitudes, conversar y contratar sigue siendo gratis para clientes. Los planes pagos están pensados únicamente para quienes ofrecen servicios." },
    { question: "¿Puedo conseguir clientes con el plan Gratis?", answer: "Sí. La propuesta mantiene el perfil, la aparición en búsquedas y mapa, las solicitudes, el chat y las contrataciones sin cupos de contactos. Los planes pagos agregan herramientas opcionales para presentarte, promocionarte y gestionar tu negocio." },
    { question: "¿Pagar me garantiza trabajos o una mejor calificación?", answer: "No. Los espacios de promoción se identificarían como patrocinados y rotarían según rubro y zona. La contratación depende del cliente; las reseñas y la verificación de identidad siguen el mismo proceso en todos los planes." },
    { question: "¿Qué pasaría si cancelo un plan pago?", answer: "La propuesta es volver a Gratis al terminar el período abonado, conservando el perfil, las reseñas, los mensajes y el historial. Se desactivarían los beneficios pagos. En el plan anual, el importe se abonaría por adelantado." },
    { question: "¿La suscripción incluye el costo de los trabajos?", answer: "No. Los importes de esta maqueta corresponden solamente al plan del profesional. El precio de cada trabajo se acuerda con el cliente; las condiciones y los cargos del medio de pago se informan por separado." },
    { question: "¿Ya puedo suscribirme?", answer: "Todavía no. Esta sección es una vista previa para evaluar los planes. Los precios en pesos argentinos y los beneficios son tentativos; elegir una tarjeta no activa una suscripción ni genera un cobro." },
  ],
};

export const LIMITES = { planes: 6, features: 12, filas: 30, faqs: 20, items: 8 };

function str(valor: unknown, max: number) {
  return typeof valor === "string" ? valor.trim().slice(0, max) : "";
}

function lista(valor: unknown, maxItems: number, maxLargo: number) {
  return (Array.isArray(valor) ? valor : []).map((v) => str(v, maxLargo)).filter(Boolean).slice(0, maxItems);
}

function idDePlan(valor: unknown, nombre: string, usados: Set<string>) {
  const base = (str(valor, 40) || nombre).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "plan";
  let id = base;
  for (let n = 2; usados.has(id); n++) id = `${base}-${n}`;
  usados.add(id);
  return id;
}

/**
 * Deja la configuración en forma: lo que llega del panel (o de la base) puede
 * venir con campos de más, de menos o fuera de rango. Nunca tira.
 */
export function sanearPlanes(crudo: unknown): PlanesConfig {
  const c = (crudo && typeof crudo === "object" ? crudo : {}) as Record<string, any>;
  const d = PLANES_DEFAULT;
  const enc = c.encabezado ?? {};
  const anual = c.anual ?? {};
  const base = c.base ?? {};
  const comp = c.comparacion ?? {};

  const usados = new Set<string>();
  const planes: Plan[] = (Array.isArray(c.planes) ? c.planes : []).slice(0, LIMITES.planes).flatMap((p: any) => {
    const name = str(p?.name, 40);
    if (!name) return [];
    const precio = Math.round(Number(p?.monthlyPrice));
    return [{
      id: idDePlan(p?.id, name, usados),
      name,
      description: str(p?.description, 160),
      audience: str(p?.audience, 160),
      monthlyPrice: Number.isFinite(precio) ? Math.min(Math.max(precio, 0), 100_000_000) : 0,
      icon: (p?.icon in PLAN_ICONOS ? p.icon : "check") as PlanIcono,
      includes: str(p?.includes, 120),
      features: lista(p?.features, LIMITES.features, 120),
      highlight: p?.highlight === true,
    }];
  });

  const meses = Math.round(Number(anual.mesesPagos));
  return {
    publicado: c.publicado === true,
    aviso: str(c.aviso, 300),
    encabezado: {
      etiqueta: str(enc.etiqueta, 80),
      titulo: str(enc.titulo, 80) || d.encabezado.titulo,
      tituloDestacado: str(enc.tituloDestacado, 80),
      bajada: str(enc.bajada, 300),
      nota: str(enc.nota, 200),
    },
    anual: {
      activo: anual.activo === true,
      mesesPagos: Number.isFinite(meses) ? Math.min(Math.max(meses, 1), 12) : 10,
      etiqueta: str(anual.etiqueta, 40),
    },
    planes,
    base: { etiqueta: str(base.etiqueta, 80), titulo: str(base.titulo, 120), texto: str(base.texto, 500), items: lista(base.items, LIMITES.items, 80) },
    comparacion: {
      etiqueta: str(comp.etiqueta, 80),
      titulo: str(comp.titulo, 120),
      bajada: str(comp.bajada, 300),
      filas: (Array.isArray(comp.filas) ? comp.filas : []).slice(0, LIMITES.filas).flatMap((f: any) => {
        const label = str(f?.label, 120);
        if (!label) return [];
        const values: Record<string, string> = {};
        for (const plan of planes) values[plan.id] = str(f?.values?.[plan.id], 40) || "no";
        return [{ label, values }];
      }),
      nota: str(comp.nota, 400),
    },
    faqTitulo: str(c.faqTitulo, 80),
    faqs: (Array.isArray(c.faqs) ? c.faqs : []).slice(0, LIMITES.faqs).flatMap((f: any) => {
      const question = str(f?.question, 200);
      const answer = str(f?.answer, 1200);
      return question && answer ? [{ question, answer }] : [];
    }),
  };
}

/** Pago anual: los meses que se cobran, todos juntos. */
export function precioAnual(plan: Plan, config: PlanesConfig) {
  return plan.monthlyPrice * config.anual.mesesPagos;
}
