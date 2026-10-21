import { jobProgress } from "@/lib/trabajo";

/**
 * Cómo se ve el presupuesto del chat, dicho desde el lado de quien mira.
 *
 * Todo lo de acá es puro (sin React ni Prisma): lo usan el chat, la tarjeta y
 * la franja, y se prueba en `tests/presupuesto.test.ts`. Los estados del
 * servidor no cambian; esto solo los traduce a pantalla.
 */

export type Viewer = "cliente" | "profesional";

export type PropuestaVista = {
  id: string;
  amount: number;
  status: string; // pending | accepted | rejected | expired
  expiresAt: string;
  message?: string | null;
  estimatedDays?: number | null;
  bookingId?: string;
};

export type AcuerdoVista = {
  id: string;
  status: string;
  finalPrice: number | null;
  startedAt: string | null;
  dueAt: string | null;
  mercadoPagoAvailable: boolean;
  /** Las del acuerdo, la más nueva primero. */
  proposals: PropuestaVista[];
};

/** Lo que hace el botón de la franja. El chat decide cómo. */
export type AccionFranja = "nuevo" | "ver" | "terminar" | "vincular" | "pagar" | "calificar" | "panel";

export type Franja = {
  tono: "slate" | "amber" | "green" | "blue" | "mp";
  titulo: string;
  detalle?: string;
  accion?: AccionFranja;
  boton?: string;
  /** 0–100: la barra del plazo, solo con el trabajo en curso. */
  progreso?: number;
};

export type EstadoAcuerdo = {
  /** Frase bajo el nombre de la otra persona. */
  label: string;
  /** Color de esa frase. */
  tono: string;
  /** null: no hay nada que decir arriba del chat. */
  franja: Franja | null;
};

export type EstadoPropuesta = "pendiente" | "aceptado" | "rechazado" | "vencido";

export const ars = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;
export const dias = (n: number) => `${n} ${n === 1 ? "día" : "días"}`;

/** "lun 26/10", en hora de Buenos Aires. */
export function fechaCorta(fecha: Date | string) {
  const partes = new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Buenos_Aires", weekday: "short", day: "numeric", month: "numeric" }).formatToParts(new Date(fecha));
  const v = (t: string) => partes.find((p) => p.type === t)?.value ?? "";
  return `${v("weekday").replace(".", "")} ${v("day")}/${v("month")}`;
}

export function estadoPropuesta(p: Pick<PropuestaVista, "status" | "expiresAt">, ahora = new Date()): EstadoPropuesta {
  if (p.status === "accepted") return "aceptado";
  if (p.status === "rejected") return "rechazado";
  if (p.status === "pending" && new Date(p.expiresAt) > ahora) return "pendiente";
  return "vencido";
}

export function propuestaPendiente(acuerdo: AcuerdoVista | null, ahora = new Date()) {
  return acuerdo?.proposals.find((p) => estadoPropuesta(p, ahora) === "pendiente") ?? null;
}

const GRIS = "text-slate-500";
const AMBAR = "text-amber-700";
const VERDE = "text-emerald-700";
const ROJO = "text-red-600";

export function estadoAcuerdo(acuerdo: AcuerdoVista | null, viewer: Viewer, ahora = new Date()): EstadoAcuerdo {
  const pro = viewer === "profesional";
  if (!acuerdo) {
    return {
      label: "Sin presupuesto todavía",
      tono: "text-slate-400",
      franja: pro ? { tono: "slate", titulo: "¿Ya sabés cuánto sale?", detalle: "Mandale el presupuesto por acá.", accion: "nuevo", boton: "Enviar presupuesto" } : null,
    };
  }

  switch (acuerdo.status) {
    case "requested": {
      const pendiente = propuestaPendiente(acuerdo, ahora);
      if (pendiente) {
        const vence = `vence el ${fechaCorta(pendiente.expiresAt)}`;
        return pro
          ? { label: "Presupuesto enviado · esperando respuesta", tono: AMBAR, franja: { tono: "slate", titulo: "Esperando que responda", detalle: `${vence[0].toUpperCase()}${vence.slice(1)} si no contesta.` } }
          : { label: `Te mandó un presupuesto · ${ars(pendiente.amount)}`, tono: AMBAR, franja: { tono: "amber", titulo: `Presupuesto de ${ars(pendiente.amount)}`, detalle: `${pendiente.estimatedDays ? `${dias(pendiente.estimatedDays)} de trabajo · ` : ""}${vence}`, accion: "ver", boton: "Ver" } };
      }
      const ultima = acuerdo.proposals[0];
      const estado = ultima ? estadoPropuesta(ultima, ahora) : null;
      if (estado === "rechazado") {
        return pro
          ? { label: "Presupuesto rechazado", tono: GRIS, franja: { tono: "slate", titulo: "Rechazó el presupuesto", detalle: "Podés mandarle otro.", accion: "nuevo", boton: "Mandar otro" } }
          : { label: "Presupuesto rechazado", tono: GRIS, franja: { tono: "slate", titulo: "Rechazaste el presupuesto", detalle: "Te puede mandar uno nuevo." } };
      }
      if (estado === "vencido") {
        return pro
          ? { label: "El presupuesto venció", tono: GRIS, franja: { tono: "slate", titulo: "Venció sin respuesta", detalle: "Podés mandarle otro.", accion: "nuevo", boton: "Mandar otro" } }
          : { label: "El presupuesto venció", tono: GRIS, franja: { tono: "slate", titulo: "El presupuesto venció", detalle: "Pedile uno nuevo por el chat." } };
      }
      // Pedido viejo (📋) sin ningún presupuesto todavía.
      return pro
        ? { label: "Te pidieron un presupuesto", tono: AMBAR, franja: { tono: "slate", titulo: "Te pidieron un presupuesto", detalle: "Mandale cuánto sale por acá.", accion: "nuevo", boton: "Enviar presupuesto" } }
        : { label: "Esperando el presupuesto", tono: GRIS, franja: null };
    }
    case "in_progress": {
      const plazo = acuerdo.startedAt && acuerdo.dueAt ? jobProgress(acuerdo.startedAt, acuerdo.dueAt, ahora) : null;
      const titulo = plazo ? (plazo.overdue ? `Pasó el plazo · día ${plazo.elapsedDays} de ${plazo.totalDays}` : `Día ${plazo.elapsedDays} de ${plazo.totalDays}`) : "Trabajo en curso";
      const detalle = plazo ? (plazo.overdue ? "El plazo prometido ya terminó." : plazo.remainingDays === 0 ? "Vence hoy." : `Termina el ${fechaCorta(acuerdo.dueAt!)}.`) : undefined;
      const base: Franja = { tono: "green", titulo, detalle, progreso: plazo?.percent };
      return {
        label: plazo ? `Trabajo en curso · día ${plazo.elapsedDays} de ${plazo.totalDays}${plazo.overdue ? " · pasó el plazo" : ""}` : "Trabajo en curso",
        tono: plazo?.overdue ? ROJO : VERDE,
        franja: !pro ? base : acuerdo.mercadoPagoAvailable ? { ...base, accion: "terminar", boton: "Terminé" } : { ...base, accion: "vincular", boton: "Vincular MP", detalle: "Vinculá Mercado Pago para cerrar y cobrar." },
      };
    }
    case "finished": {
      const total = ars(acuerdo.finalPrice ?? 0);
      if (pro) return { label: "Trabajo terminado · falta el pago", tono: AMBAR, franja: { tono: "slate", titulo: "Esperando el pago", detalle: `Total ${total}` } };
      return acuerdo.mercadoPagoAvailable
        ? { label: "Trabajo terminado · falta el pago", tono: AMBAR, franja: { tono: "mp", titulo: `Total ${total}`, detalle: "El trabajo está terminado.", accion: "pagar", boton: "Pagar" } }
        : { label: "Trabajo terminado · falta el pago", tono: AMBAR, franja: { tono: "slate", titulo: `Total ${total}`, detalle: "El oferente tiene que vincular Mercado Pago para cobrar." } };
    }
    case "payment_reported":
      return pro
        ? { label: "Pago informado", tono: AMBAR, franja: { tono: "amber", titulo: "Te informaron el pago", detalle: "Confirmá cuando lo recibas.", accion: "panel", boton: "Confirmar" } }
        : { label: "Pago informado", tono: AMBAR, franja: { tono: "slate", titulo: "Pago informado", detalle: "Esperando que lo confirme." } };
    case "paid_awaiting_review":
      return pro
        ? { label: "Pagado · falta la calificación", tono: VERDE, franja: { tono: "blue", titulo: "Pagado", detalle: "Falta que te califique." } }
        : { label: "Pagado · falta la calificación", tono: VERDE, franja: { tono: "blue", titulo: "¿Cómo fue el trabajo?", detalle: "Calificalo para cerrar.", accion: "calificar", boton: "Calificar" } };
    default:
      return { label: "Acuerdo", tono: GRIS, franja: null };
  }
}

/** Por qué el oferente no puede mandar un presupuesto ahora, o null si puede. */
export function motivoSinPresupuesto(acuerdo: AcuerdoVista | null, ahora = new Date()): string | null {
  if (!acuerdo) return null;
  if (acuerdo.status !== "requested") return "Hay un trabajo en curso";
  return propuestaPendiente(acuerdo, ahora) ? "Ya hay uno esperando respuesta" : null;
}

/** Los mensajes 💰/📋 se pintan como tarjeta. */
export const esMensajeDePresupuesto = (texto: string) => /^(💰|📋)/u.test(texto);
/** ✅ ❌ 🏁 ⌛: avisos del acuerdo, centrados como los del sistema. */
export const esAvisoDelAcuerdo = (texto: string) => /^(✅|❌|🏁|⌛)/u.test(texto);

/** "150.000" o "$ 150000" → 150000. Vacío → 0. */
export function montoDesdeTexto(texto: string) {
  const digitos = texto.replace(/\D/g, "").replace(/^0+/, "").slice(0, 9);
  return digitos ? Number(digitos) : 0;
}

/** Lo que se ve en el campo mientras se escribe: "150000" → "150.000". */
export function montoConMiles(texto: string) {
  const n = montoDesdeTexto(texto);
  return n ? n.toLocaleString("es-AR") : "";
}

export const MONTO_MIN = 100;
export const MONTO_MAX = 100_000_000;
export const DIAS_RAPIDOS = [1, 2, 3, 5, 7] as const;

export function presupuestoValido(monto: number, diasTrabajo: number | null) {
  return monto >= MONTO_MIN && monto <= MONTO_MAX && diasTrabajo !== null && diasTrabajo >= 1 && diasTrabajo <= 365;
}
