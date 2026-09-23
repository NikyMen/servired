import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { decryptKyc, encryptKyc } from "@/lib/kyc";

const API = "https://api.mercadopago.com";

export function mercadoPagoConfigured() {
  return Boolean(process.env.MP_CLIENT_ID && process.env.MP_CLIENT_SECRET && process.env.MP_WEBHOOK_SECRET && process.env.APP_URL);
}

export function mercadoPagoRedirectUri() {
  return `${process.env.APP_URL!.replace(/\/$/, "")}/api/mercadopago/callback`;
}

/** Comisión de ServiRed en pesos enteros según MP_COMISION_PORCENTAJE (0 si no está); nunca se lleva el total. */
export function mercadoPagoCommission(amount: number) {
  const percent = Number(process.env.MP_COMISION_PORCENTAJE ?? 0);
  if (!Number.isFinite(percent) || percent <= 0 || amount <= 1) return 0;
  return Math.min(Math.round(amount * percent / 100), amount - 1);
}

type TokenResponse = { access_token: string; refresh_token: string; user_id: number; expires_in: number; live_mode: boolean };

async function tokenRequest(fields: Record<string, string>): Promise<TokenResponse> {
  const response = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ client_id: process.env.MP_CLIENT_ID!, client_secret: process.env.MP_CLIENT_SECRET!, ...fields }),
    cache: "no-store",
  });
  if (!response.ok) {
    console.error(`[mercadopago] oauth/token ${fields.grant_type} falló (${response.status}):`, await response.text().catch(() => ""));
    throw new Error("Mercado Pago no pudo autorizar la cuenta.");
  }
  const result = await response.json() as TokenResponse;
  if (!result.access_token || !result.refresh_token || !result.user_id || !result.expires_in) throw new Error("Respuesta OAuth incompleta.");
  return result;
}

export async function connectMercadoPago(professionalId: string, code: string, state: string) {
  const token = await tokenRequest({ grant_type: "authorization_code", code, redirect_uri: mercadoPagoRedirectUri(), state });
  await prisma.mercadoPagoAccount.upsert({
    where: { professionalId },
    create: { professionalId, collectorId: String(token.user_id), accessToken: encryptKyc(token.access_token), refreshToken: encryptKyc(token.refresh_token), expiresAt: new Date(Date.now() + token.expires_in * 1000) },
    update: { collectorId: String(token.user_id), accessToken: encryptKyc(token.access_token), refreshToken: encryptKyc(token.refresh_token), expiresAt: new Date(Date.now() + token.expires_in * 1000) },
  });
}

export async function sellerToken(professionalId: string) {
  const account = await prisma.mercadoPagoAccount.findUnique({ where: { professionalId } });
  if (!account) return null;
  if (account.expiresAt.getTime() > Date.now() + 24 * 60 * 60 * 1000) return { token: decryptKyc(account.accessToken), collectorId: account.collectorId };
  const refreshed = await tokenRequest({ grant_type: "refresh_token", refresh_token: decryptKyc(account.refreshToken) });
  const updated = await prisma.mercadoPagoAccount.update({
    where: { professionalId },
    data: { collectorId: String(refreshed.user_id), accessToken: encryptKyc(refreshed.access_token), refreshToken: encryptKyc(refreshed.refresh_token), expiresAt: new Date(Date.now() + refreshed.expires_in * 1000) },
  });
  return { token: refreshed.access_token, collectorId: updated.collectorId };
}

export async function createPreference(token: string, payment: { id: string; amount: number; commission: number; bookingId: string; clientEmail: string }) {
  const response = await fetch(`${API}/checkout/preferences`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Idempotency-Key": payment.id },
    body: JSON.stringify({
      items: [{ id: payment.bookingId, title: "Servicio contratado en ServiRed", currency_id: "ARS", quantity: 1, unit_price: payment.amount }],
      payer: { email: payment.clientEmail },
      external_reference: payment.id,
      // Con el token del profesional, MP acredita esta parte en la cuenta dueña de la integración.
      ...(payment.commission > 0 ? { marketplace_fee: payment.commission } : {}),
      back_urls: {
        success: `${process.env.APP_URL!.replace(/\/$/, "")}/contrataciones`,
        pending: `${process.env.APP_URL!.replace(/\/$/, "")}/contrataciones`,
        failure: `${process.env.APP_URL!.replace(/\/$/, "")}/contrataciones`,
      },
      auto_return: "approved",
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Mercado Pago no pudo crear el checkout.");
  const data = await response.json() as { id?: string; init_point?: string; sandbox_init_point?: string };
  const url = process.env.MP_SANDBOX === "true" ? data.sandbox_init_point : data.init_point;
  if (!data.id || !url || !/^https:\/\/(www\.|sandbox\.)?mercadopago\.com(\.ar)?\//.test(url)) throw new Error("Checkout inválido de Mercado Pago.");
  return { id: data.id, url };
}

export function validWebhookSignature(signature: string | null, requestId: string | null, dataId: string | null) {
  if (!signature || !requestId || !dataId || !process.env.MP_WEBHOOK_SECRET) return false;
  const ts = signature.match(/(?:^|,)ts=([^,]+)/)?.[1];
  const v1 = signature.match(/(?:^|,)v1=([a-f0-9]{64})(?:,|$)/i)?.[1];
  if (!ts || !v1 || !/^\d+$/.test(ts) || Math.abs(Date.now() - Number(ts) * 1000) > 10 * 60 * 1000) return false;
  const expected = createHmac("sha256", process.env.MP_WEBHOOK_SECRET).update(`id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`).digest();
  return timingSafeEqual(expected, Buffer.from(v1, "hex"));
}

export async function fetchMercadoPagoPayment(token: string, id: string) {
  const response = await fetch(`${API}/v1/payments/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!response.ok) throw new Error("No se pudo consultar el pago en Mercado Pago.");
  return response.json() as Promise<{ id: number; status: string; external_reference: string; transaction_amount: number; currency_id: string; collector_id: number }>;
}
