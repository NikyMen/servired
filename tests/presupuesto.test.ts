import assert from "node:assert/strict";
import test from "node:test";
import { type AcuerdoVista, esAvisoDelAcuerdo, esMensajeDePresupuesto, estadoAcuerdo, estadoPropuesta, montoConMiles, montoDesdeTexto, motivoSinPresupuesto, presupuestoValido } from "../src/lib/presupuesto";

const AHORA = new Date("2026-10-21T13:00:00Z");
const enDias = (n: number) => new Date(AHORA.getTime() + n * 86_400_000).toISOString();
const propuesta = (status: string, expiresAt = enDias(5)) => ({ id: "p1", amount: 150000, status, expiresAt, estimatedDays: 2, message: null });
const acuerdo = (status: string, proposals = [propuesta("pending")], extra: Partial<AcuerdoVista> = {}): AcuerdoVista => ({ id: "b1", status, finalPrice: null, startedAt: null, dueAt: null, mercadoPagoAvailable: true, proposals, ...extra });

test("estado de la tarjeta: pendiente, aceptado, rechazado y vencido (también por fecha)", () => {
  assert.equal(estadoPropuesta(propuesta("pending"), AHORA), "pendiente");
  assert.equal(estadoPropuesta(propuesta("pending", enDias(-1)), AHORA), "vencido");
  assert.equal(estadoPropuesta(propuesta("expired"), AHORA), "vencido");
  assert.equal(estadoPropuesta(propuesta("accepted"), AHORA), "aceptado");
  assert.equal(estadoPropuesta(propuesta("rejected"), AHORA), "rechazado");
});

test("sin presupuesto: el oferente ve la franja para mandarlo y el cliente no ve franja", () => {
  assert.equal(estadoAcuerdo(null, "profesional", AHORA).franja?.accion, "nuevo");
  assert.equal(estadoAcuerdo(null, "cliente", AHORA).franja, null);
});

test("pendiente: el cliente tiene Ver con el monto; el oferente espera, sin botón", () => {
  const cliente = estadoAcuerdo(acuerdo("requested"), "cliente", AHORA);
  assert.equal(cliente.franja?.accion, "ver");
  assert.match(cliente.franja!.titulo, /\$150\.000/);
  assert.match(cliente.franja!.detalle!, /2 días de trabajo · vence el/);
  const pro = estadoAcuerdo(acuerdo("requested"), "profesional", AHORA);
  assert.equal(pro.franja?.accion, undefined);
  assert.equal(pro.franja?.titulo, "Esperando que responda");
});

test("rechazado y vencido se distinguen y ya no dicen 'Acuerdo abierto'", () => {
  const rechazado = estadoAcuerdo(acuerdo("requested", [propuesta("rejected")]), "profesional", AHORA);
  assert.equal(rechazado.label, "Presupuesto rechazado");
  assert.equal(rechazado.franja?.accion, "nuevo");
  const vencido = estadoAcuerdo(acuerdo("requested", [propuesta("pending", enDias(-1))]), "cliente", AHORA);
  assert.equal(vencido.label, "El presupuesto venció");
  assert.equal(vencido.franja?.accion, undefined);
  for (const viewer of ["cliente", "profesional"] as const) {
    for (const p of [propuesta("rejected"), propuesta("expired")]) {
      assert.notEqual(estadoAcuerdo(acuerdo("requested", [p]), viewer, AHORA).label, "Acuerdo abierto");
    }
  }
});

test("en curso: barra del plazo para los dos; el oferente cierra, o vincula MP si le falta", () => {
  const extra = { startedAt: AHORA.toISOString(), dueAt: enDias(2) };
  const pro = estadoAcuerdo(acuerdo("in_progress", [propuesta("accepted")], extra), "profesional", AHORA);
  assert.equal(pro.franja?.accion, "terminar");
  assert.equal(typeof pro.franja?.progreso, "number");
  const sinMp = estadoAcuerdo(acuerdo("in_progress", [propuesta("accepted")], { ...extra, mercadoPagoAvailable: false }), "profesional", AHORA);
  assert.equal(sinMp.franja?.accion, "vincular");
  assert.equal(estadoAcuerdo(acuerdo("in_progress", [propuesta("accepted")], extra), "cliente", AHORA).franja?.accion, undefined);
});

test("terminado: el cliente paga con MP; pagado: el cliente califica", () => {
  const terminado = estadoAcuerdo(acuerdo("finished", [], { finalPrice: 150000 }), "cliente", AHORA);
  assert.equal(terminado.franja?.accion, "pagar");
  assert.equal(terminado.franja?.titulo, "Total $150.000");
  assert.equal(estadoAcuerdo(acuerdo("finished", [], { finalPrice: 1, mercadoPagoAvailable: false }), "cliente", AHORA).franja?.accion, undefined);
  assert.equal(estadoAcuerdo(acuerdo("paid_awaiting_review", []), "cliente", AHORA).franja?.accion, "calificar");
  assert.equal(estadoAcuerdo(acuerdo("paid_awaiting_review", []), "profesional", AHORA).franja?.accion, undefined);
});

test("el + dice por qué no se puede mandar otro presupuesto", () => {
  assert.equal(motivoSinPresupuesto(null, AHORA), null);
  assert.equal(motivoSinPresupuesto(acuerdo("requested"), AHORA), "Ya hay uno esperando respuesta");
  assert.equal(motivoSinPresupuesto(acuerdo("requested", [propuesta("rejected")]), AHORA), null);
  assert.equal(motivoSinPresupuesto(acuerdo("in_progress", [propuesta("accepted")]), AHORA), "Hay un trabajo en curso");
});

test("monto con miles mientras se escribe y validación", () => {
  assert.equal(montoConMiles("150000"), "150.000");
  assert.equal(montoConMiles("$ 1.500.000"), "1.500.000");
  assert.equal(montoConMiles("abc"), "");
  assert.equal(montoDesdeTexto("0150.000"), 150000);
  assert.equal(presupuestoValido(150000, 2), true);
  assert.equal(presupuestoValido(99, 2), false);
  assert.equal(presupuestoValido(150000, null), false);
  assert.equal(presupuestoValido(150000, 366), false);
});

test("qué mensajes son tarjeta y cuáles aviso del acuerdo", () => {
  assert.equal(esMensajeDePresupuesto("💰 PROPUESTA · $1"), true);
  assert.equal(esMensajeDePresupuesto("hola 💰"), false);
  assert.equal(esAvisoDelAcuerdo("✅ PROPUESTA ACEPTADA · $1"), true);
  assert.equal(esAvisoDelAcuerdo("🏁 TRABAJO TERMINADO · $1"), true);
  assert.equal(esAvisoDelAcuerdo("todo ✅"), false);
});

test("en prueba los correos van a la casilla del equipo y, sin ella, no salen", async () => {
  const { destinoReal } = await import("../src/lib/mailer");
  assert.deepEqual(destinoReal("ana@x.com", "Hola", {}), { to: "ana@x.com", subject: "Hola" });
  assert.deepEqual(destinoReal("ana@x.com", "Hola", { ENTORNO_PRUEBA: "1", MAIL_REDIRIGIR_A: "equipo@x.com" }), { to: "equipo@x.com", subject: "[Prueba → ana@x.com] Hola" });
  assert.equal(destinoReal("ana@x.com", "Hola", { ENTORNO_PRUEBA: "1" }), null);
});

test("años de experiencia: 'de profesión' para profesionales, 'en el oficio' para oficios", async () => {
  const { aniosDeExperiencia, rotuloAnios } = await import("../src/lib/format");
  assert.equal(aniosDeExperiencia(27, "profesional"), "27 años de profesión");
  assert.equal(aniosDeExperiencia(27, "oficio"), "27 años en el oficio");
  assert.equal(aniosDeExperiencia(1, "profesional"), "1 año de profesión");
  assert.equal(aniosDeExperiencia(5, null), "5 años en el oficio");
  assert.equal(rotuloAnios("profesional"), "Años de profesión");
  assert.equal(rotuloAnios("oficio"), "Años en el oficio");
});
