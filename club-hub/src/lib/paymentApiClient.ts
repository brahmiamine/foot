/**
 * Client HTTP serveur-à-serveur vers payments (voir ../../payments/README.md).
 * Même client que ticketing/src/lib/paymentApiClient.ts (voir ce fichier
 * pour le détail des DTO providers) — première intégration payments de
 * club-hub (voir ShopOrderService.createOrder).
 */

const PROVIDER_INIT_PATHS: Record<string, string> = {
  konnect: "/payments/konnect/init",
  flouci: "/payments/providers/flouci/init",
  paymee: "/payments/providers/paymee/init",
};

function getConfig(): { baseUrl: string; apiKey: string } {
  const baseUrl = process.env.PAYMENT_API_URL;
  const apiKey = process.env.PAYMENT_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error("PAYMENT_API_URL et PAYMENT_API_KEY doivent être configurés pour accepter des paiements réels.");
  }
  return { baseUrl, apiKey };
}

export function getPaymentProvider(): string {
  return process.env.PAYMENT_PROVIDER || "konnect";
}

function getProviderInitPath(provider: string): string {
  const path = PROVIDER_INIT_PATHS[provider];
  if (!path) {
    throw new Error(
      `PAYMENT_PROVIDER="${provider}" non supporté par club-hub (konnect, flouci ou paymee) — voir src/lib/paymentApiClient.ts.`
    );
  }
  return path;
}

export interface InitPaymentInput {
  orderId: string;
  amount: number;
  email?: string;
  userId: string;
  /** Requis par le DTO Paymee ; optionnels (ignorés si absents) pour Konnect/Flouci. */
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

export interface InitPaymentResult {
  paymentId: string;
  payUrl: string;
}

function buildRequestBody(provider: string, input: InitPaymentInput): Record<string, unknown> {
  if (provider === "paymee") {
    return {
      orderId: input.orderId,
      amount: input.amount,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phoneNumber: input.phoneNumber,
      userId: input.userId,
      mode: "redirect",
    };
  }
  return {
    orderId: input.orderId,
    amount: input.amount,
    currency: "TND",
    email: input.email,
    userId: input.userId,
    firstName: input.firstName,
    lastName: input.lastName,
    phoneNumber: input.phoneNumber,
  };
}

export async function initPayment(input: InitPaymentInput): Promise<InitPaymentResult> {
  const { baseUrl, apiKey } = getConfig();
  const provider = getPaymentProvider();

  const response = await fetch(`${baseUrl}${getProviderInitPath(provider)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify(buildRequestBody(provider, input)),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Échec de l'initialisation du paiement (payments ${response.status}): ${body}`);
  }

  const data = (await response.json()) as { paymentId?: string; payUrl?: string };
  if (!data.paymentId || !data.payUrl) {
    throw new Error("Réponse inattendue de payments : paymentId ou payUrl manquant.");
  }

  return { paymentId: data.paymentId, payUrl: data.payUrl };
}

export type PaymentApiStatus = "PENDING" | "PAID" | "FAILED" | "EXPIRED" | "UNKNOWN";

export async function getPaymentStatus(paymentId: string): Promise<PaymentApiStatus> {
  const { baseUrl, apiKey } = getConfig();

  const response = await fetch(`${baseUrl}/payments/${paymentId}`, {
    headers: { "x-api-key": apiKey },
    cache: "no-store",
  });

  if (response.status === 404) return "UNKNOWN";
  if (!response.ok) {
    throw new Error(`Échec de la lecture du statut de paiement (payments ${response.status}).`);
  }

  const data = (await response.json()) as { status?: string };
  const status = data.status;
  if (status === "PENDING" || status === "PAID" || status === "FAILED" || status === "EXPIRED") {
    return status;
  }
  return "UNKNOWN";
}

export type RefundStatus = "REQUESTED" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "MANUAL_REVIEW";

/**
 * PAY-002 : Payments conserve `AWAITING_APPROVAL` comme statut détaillé.
 * Club Hub ne persiste qu'un état de réconciliation non terminal ; cet état
 * est normalisé en REQUESTED pour rester compatible avec l'ENUM existant.
 */
export function normalizeRefundStatus(status: string | undefined): RefundStatus | null {
  if (status === "AWAITING_APPROVAL") return "REQUESTED";
  if (
    status === "REQUESTED" ||
    status === "PROCESSING" ||
    status === "SUCCEEDED" ||
    status === "FAILED" ||
    status === "MANUAL_REVIEW"
  ) {
    return status;
  }
  return null;
}

export interface RequestRefundInput {
  paymentId: string;
  reason: string;
  /** Scopée par paiement côté payments (Refund.paymentId + idempotencyKey) — un même appel rejoué ne crée jamais un second remboursement. */
  idempotencyKey: string;
}

export interface RefundResult {
  id: string;
  status: RefundStatus;
}

/**
 * TASK-P0-002 (todo.md) : demande un remboursement auprès de payments
 * (TASK-P0-001) pour un paiement confirmé après restockage — voir
 * src/lib/stockUnavailableRefunds.ts, seul appelant. Un état central
 * AWAITING_APPROVAL reste localement REQUESTED jusqu'à la réconciliation.
 */
export async function requestRefund(input: RequestRefundInput): Promise<RefundResult> {
  const { baseUrl, apiKey } = getConfig();

  const response = await fetch(`${baseUrl}/payments/${input.paymentId}/refunds`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "idempotency-key": input.idempotencyKey },
    body: JSON.stringify({ reason: input.reason }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Échec de la demande de remboursement (payments ${response.status}): ${body}`);
  }

  const data = (await response.json()) as { id?: string; status?: string };
  const status = normalizeRefundStatus(data.status);
  if (!data.id || !status) {
    throw new Error("Réponse inattendue de payments : id ou status de remboursement manquant.");
  }

  return { id: data.id, status };
}

/** Relit le statut courant d'un remboursement déjà demandé (voir requestRefund). */
export async function getRefundStatus(refundId: string): Promise<RefundStatus | "UNKNOWN"> {
  const { baseUrl, apiKey } = getConfig();

  const response = await fetch(`${baseUrl}/refunds/${refundId}`, {
    headers: { "x-api-key": apiKey },
    cache: "no-store",
  });

  if (response.status === 404) return "UNKNOWN";
  if (!response.ok) {
    throw new Error(`Échec de la lecture du statut de remboursement (payments ${response.status}).`);
  }

  const data = (await response.json()) as { refund?: { status?: string } };
  return normalizeRefundStatus(data.refund?.status) ?? "UNKNOWN";
}
