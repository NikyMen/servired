export type PaymentProviderKey = "manual_alias" | "mercadopago";

export interface PaymentProvider {
  key: PaymentProviderKey;
  enabled: boolean;
}

/** Transferencia directa al CVU/CBU o alias del oferente, sin intermediarios. */
export const manualAliasProvider: PaymentProvider = { key: "manual_alias", enabled: true };
export const mercadoPagoProvider: PaymentProvider = { key: "mercadopago", enabled: true };

const PAYMENT_DETAILS_STATUSES = new Set(["finished", "payment_reported", "paid_awaiting_review", "completed"]);

/** Los datos de cobro nunca salen antes de que el oferente cierre el trabajo. */
export function canRevealPaymentDetails(status: string) {
  return PAYMENT_DETAILS_STATUSES.has(status);
}

export type DatosTransferencia = { handle: string; kind: "cvu" | "alias"; holder: string };

/** Lo que el cliente necesita para transferir, o null si el oferente no lo cargó. */
export function datosTransferencia(pro: { paymentHandle: string | null; paymentHandleKind: string | null; paymentHolder: string | null }): DatosTransferencia | null {
  if (!pro.paymentHandle || !pro.paymentHolder) return null;
  return { handle: pro.paymentHandle, kind: pro.paymentHandleKind === "cvu" ? "cvu" : "alias", holder: pro.paymentHolder };
}

/** Número de operación o comentario de la transferencia: corto y sin saltos. */
export function referenciaTransferencia(raw: unknown) {
  return typeof raw === "string" ? raw.replace(/\s+/g, " ").trim().slice(0, 80) : "";
}

/** "Pago por Mercado Pago" / "Pago por transferencia". */
export function etiquetaMedioDePago(provider: string) {
  return provider === "mercadopago" ? "Mercado Pago" : "transferencia";
}

const ESTADOS_PAGO: Record<string, string> = { pendiente: "pendiente", reported: "informado, falta confirmar", pagado: "pagado", cancelado: "anulado" };

export function estadoDelPago(status: string) {
  return ESTADOS_PAGO[status] ?? status;
}
