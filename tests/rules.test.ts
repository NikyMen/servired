import assert from "node:assert/strict";
import test from "node:test";
import { createVideoChallenge, cuilMatchesDni, parsePaymentHandle, validCuil, validCvu, validDni, validPhone, verifyVideoChallenge } from "../src/lib/kyc";
import { ACTIVE_JOB_STATUSES, PROPOSAL_TTL_MS, hasJobCapacity, proposalIsActive } from "../src/lib/workflow";
import { canRevealPaymentDetails } from "../src/lib/payments";
import { MAX_REPUBLISH, REQUEST_TTL_MS, requestDaysLeft, requestIsLastDay } from "../src/lib/solicitudes";
import { jobProgress, validEstimatedDays } from "../src/lib/trabajo";

test("valida CUIL por formato y dígito verificador", () => {
  assert.equal(validCuil("20-12345678-6"), true);
  assert.equal(validCuil("20-12345678-5"), false);
  assert.equal(validDni("12345678"), true);
  assert.equal(validDni("123"), false);
  assert.equal(cuilMatchesDni("20-12345678-6", "12345678"), true);
  assert.equal(cuilMatchesDni("20-12345678-6", "87654321"), false);
});

test("valida teléfono y CVU con sus dígitos verificadores", () => {
  assert.equal(validPhone("+54 9 379 412-3456"), true);
  assert.equal(validPhone("123"), false);
  assert.equal(validCvu("2850590940090418135201"), true);
  assert.equal(validCvu("2850590940090418135202"), false);
});

test("un solo campo de cobro distingue CVU de alias", () => {
  assert.deepEqual(parsePaymentHandle("2850590940090418135201"), { handle: "2850590940090418135201", kind: "cvu" });
  assert.deepEqual(parsePaymentHandle(" 2850-5909-4009-0418-1352-01 "), { handle: "2850590940090418135201", kind: "cvu" });
  assert.deepEqual(parsePaymentHandle("juan.perez.mp"), { handle: "juan.perez.mp", kind: "alias" });
  // Un CVU con el verificador cambiado no se degrada a alias: es un error de tipeo.
  assert.equal(parsePaymentHandle("2850590940090418135202"), null);
  assert.equal(parsePaymentHandle("12345678"), null);
  assert.equal(parsePaymentHandle("corto"), null);
  assert.equal(parsePaymentHandle(""), null);
});

test("el desafío de video está firmado y vinculado al usuario", () => {
  const issued = createVideoChallenge("user-1");
  assert.equal(verifyVideoChallenge("user-1", issued.challenge, issued.token), true);
  assert.equal(verifyVideoChallenge("user-2", issued.challenge, issued.token), false);
  assert.equal(verifyVideoChallenge("user-1", `${issued.challenge}0`, issued.token), false);
  assert.equal(verifyVideoChallenge("user-1", issued.challenge, `${issued.token}x`), false);
});

test("el desafío es una frase legible, sin dígitos", () => {
  for (let intento = 0; intento < 50; intento += 1) {
    const { challenge } = createVideoChallenge("user-1");
    assert.match(challenge, /^Hola ServiRed, /);
    assert.equal(/\d/.test(challenge), false);
    assert.ok(challenge.split(" ").length >= 8);
  }
});

test("una propuesta solo está activa si está pendiente y no venció", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  assert.equal(PROPOSAL_TTL_MS, 72 * 60 * 60 * 1000);
  assert.equal(proposalIsActive({ status: "pending", expiresAt: new Date("2026-01-01T00:00:01Z") }, now), true);
  assert.equal(proposalIsActive({ status: "pending", expiresAt: now }, now), false);
  assert.equal(proposalIsActive({ status: "rejected", expiresAt: new Date("2026-01-02T00:00:00Z") }, now), false);
});

test("el cupo cuenta todos los estados activos y bloquea el cuarto trabajo", () => {
  assert.deepEqual(ACTIVE_JOB_STATUSES, ["in_progress", "finished", "payment_reported", "paid_awaiting_review"]);
  assert.equal(hasJobCapacity(2), true);
  assert.equal(hasJobCapacity(3), false);
});

test("los datos de cobro se revelan recién al terminar", () => {
  assert.equal(canRevealPaymentDetails("requested"), false);
  assert.equal(canRevealPaymentDetails("in_progress"), false);
  for (const status of ["finished", "payment_reported", "paid_awaiting_review", "completed"]) {
    assert.equal(canRevealPaymentDetails(status), true);
  }
});

test("una solicitud vive 7 días y avisa el último", () => {
  const ahora = new Date("2026-01-08T12:00:00Z");
  assert.equal(REQUEST_TTL_MS, 7 * 24 * 60 * 60 * 1000);
  assert.equal(MAX_REPUBLISH, 5);
  assert.equal(requestDaysLeft(new Date("2026-01-15T12:00:00Z"), ahora), 7);
  assert.equal(requestDaysLeft(new Date("2026-01-09T11:00:00Z"), ahora), 1);
  // Vencida no devuelve negativos: cero es cero.
  assert.equal(requestDaysLeft(new Date("2026-01-01T12:00:00Z"), ahora), 0);
  assert.equal(requestIsLastDay(new Date("2026-01-09T11:00:00Z"), ahora), true);
  assert.equal(requestIsLastDay(new Date("2026-01-10T12:00:00Z"), ahora), false);
});

test("el plazo del trabajo se cuenta en días enteros y se pasa a rojo al vencer", () => {
  const inicio = new Date("2026-03-01T09:00:00Z");
  const fin = new Date("2026-03-08T09:00:00Z");

  // Recién aceptado ya es el día 1 de 7, no el cero.
  const arranque = jobProgress(inicio, fin, new Date("2026-03-01T10:00:00Z"));
  assert.equal(arranque.totalDays, 7);
  assert.equal(arranque.elapsedDays, 1);
  assert.equal(arranque.remainingDays, 7);
  assert.equal(arranque.overdue, false);

  const mitad = jobProgress(inicio, fin, new Date("2026-03-04T09:00:00Z"));
  assert.equal(mitad.elapsedDays, 3);
  assert.equal(mitad.percent, 43);

  const tarde = jobProgress(inicio, fin, new Date("2026-03-11T09:00:00Z"));
  assert.equal(tarde.overdue, true);
  assert.equal(tarde.percent, 100);
  assert.equal(tarde.remainingDays, 0);

  // Un plazo de un día no divide por cero.
  const cortito = jobProgress(inicio, new Date("2026-03-02T09:00:00Z"), new Date("2026-03-01T21:00:00Z"));
  assert.equal(cortito.totalDays, 1);
  assert.equal(cortito.elapsedDays, 1);

  assert.equal(validEstimatedDays("5"), 5);
  assert.equal(validEstimatedDays(0), null);
  assert.equal(validEstimatedDays(400), null);
  assert.equal(validEstimatedDays("varios"), null);
});
