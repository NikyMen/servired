import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { validWebhookSignature } from "../src/lib/mercadopago";

test("el webhook exige firma, request ID y marca de tiempo vigente", () => {
  const previous = process.env.MP_WEBHOOK_SECRET;
  process.env.MP_WEBHOOK_SECRET = "test-secret";
  try {
    const requestId = "request-123";
    const dataId = "456";
    const sign = (ts: number) => {
      const digest = createHmac("sha256", "test-secret").update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest("hex");
      return `ts=${ts},v1=${digest}`;
    };
    const now = Math.floor(Date.now() / 1000);
    assert.equal(validWebhookSignature(sign(now), requestId, dataId), true);
    assert.equal(validWebhookSignature(sign(now), requestId, "457"), false);
    assert.equal(validWebhookSignature(sign(now), "otro-request", dataId), false);
    assert.equal(validWebhookSignature(sign(now - 3600), requestId, dataId), false);
    assert.equal(validWebhookSignature(null, requestId, dataId), false);
  } finally {
    if (previous === undefined) delete process.env.MP_WEBHOOK_SECRET;
    else process.env.MP_WEBHOOK_SECRET = previous;
  }
});
