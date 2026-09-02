export type PaymentProviderKey = "manual_alias" | "mercadopago";

export interface PaymentProvider {
  key: PaymentProviderKey;
  enabled: boolean;
}

export const manualAliasProvider: PaymentProvider = { key: "manual_alias", enabled: true };
export const mercadoPagoProvider: PaymentProvider = { key: "mercadopago", enabled: false };

const PAYMENT_DETAILS_STATUSES = new Set(["finished", "payment_reported", "paid_awaiting_review", "completed"]);

/** Los datos de cobro nunca salen antes de que el oferente cierre el trabajo. */
export function canRevealPaymentDetails(status: string) {
  return PAYMENT_DETAILS_STATUSES.has(status);
}
