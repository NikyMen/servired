import assert from "node:assert/strict";
import test from "node:test";
import { createVideoChallenge, cuilMatchesDni, validCuil, validCvu, validDni, validPhone, verifyVideoChallenge } from "../src/lib/kyc";
import { ACTIVE_JOB_STATUSES, PROPOSAL_TTL_MS, hasJobCapacity, proposalIsActive } from "../src/lib/workflow";
import { canRevealPaymentDetails } from "../src/lib/payments";

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

test("el desafío de video está firmado y vinculado al usuario", () => {
  const issued = createVideoChallenge("user-1");
  assert.equal(verifyVideoChallenge("user-1", issued.challenge, issued.token), true);
  assert.equal(verifyVideoChallenge("user-2", issued.challenge, issued.token), false);
  assert.equal(verifyVideoChallenge("user-1", `${issued.challenge}0`, issued.token), false);
  assert.equal(verifyVideoChallenge("user-1", issued.challenge, `${issued.token}x`), false);
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
