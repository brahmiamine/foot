/**
 * Client HTTP serveur-à-serveur vers payment-api (voir ../../payment-api/README.md).
 * Konnect/Flouci utilisent le DTO générique (orderId/amount/currency/email/
 * userId + firstName/lastName/phoneNumber optionnels) ; Paymee a son propre
 * DTO qui exige en plus firstName/lastName/phoneNumber (jamais `currency`,
 * absent de son DTO) — voir buildRequestBody. src/lib/tickets.ts est
 * responsable de vérifier que ces champs sont renseignés (profil membre,
 * voir src/lib/ssoProfileClient.ts) avant d'appeler initPayment avec
 * PAYMENT_PROVIDER=paymee.
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
      `PAYMENT_PROVIDER="${provider}" non supporté par billetterie (konnect, flouci ou paymee) — voir src/lib/paymentApiClient.ts.`
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

/**
 * payment-api valide chaque DTO avec `forbidNonWhitelisted: true` : un champ
 * que le DTO ne déclare pas fait échouer la requête en 400. Le DTO Paymee
 * n'a pas de `currency` ; le DTO générique (Konnect/Flouci) n'a pas de
 * `mode` — jamais spreader un objet commun entre les deux.
 */
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
    throw new Error(`Échec de l'initialisation du paiement (payment-api ${response.status}): ${body}`);
  }

  const data = (await response.json()) as { paymentId?: string; payUrl?: string };
  if (!data.paymentId || !data.payUrl) {
    throw new Error("Réponse inattendue de payment-api : paymentId ou payUrl manquant.");
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
    throw new Error(`Échec de la lecture du statut de paiement (payment-api ${response.status}).`);
  }

  const data = (await response.json()) as { status?: string };
  const status = data.status;
  if (status === "PENDING" || status === "PAID" || status === "FAILED" || status === "EXPIRED") {
    return status;
  }
  return "UNKNOWN";
}

export type RefundStatus = "REQUESTED" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "MANUAL_REVIEW";

export interface RequestRefundInput {
  paymentId: string;
  reason: string;
  /** Scopée par paiement côté payment-api (Refund.paymentId + idempotencyKey) — un même appel rejoué ne crée jamais un second remboursement. */
  idempotencyKey: string;
}

export interface RefundResult {
  id: string;
  status: RefundStatus;
}

/**
 * TASK-P0-002 (todo.md) : demande un remboursement auprès de payment-api
 * (TASK-P0-001) pour un paiement confirmé après libération de la capacité —
 * voir src/lib/stockUnavailableRefunds.ts, seul appelant. `status` reflète
 * toujours l'issue réelle : SUCCEEDED/FAILED (Flouci automatisé) ou
 * MANUAL_REVIEW (Konnect/Paymee, ou remboursement partiel Flouci) — jamais
 * un succès simulé.
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
    throw new Error(`Échec de la demande de remboursement (payment-api ${response.status}): ${body}`);
  }

  const data = (await response.json()) as { id?: string; status?: string };
  if (!data.id || !data.status) {
    throw new Error("Réponse inattendue de payment-api : id ou status de remboursement manquant.");
  }

  return { id: data.id, status: data.status as RefundStatus };
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
    throw new Error(`Échec de la lecture du statut de remboursement (payment-api ${response.status}).`);
  }

  const data = (await response.json()) as { refund?: { status?: string } };
  const status = data.refund?.status;
  if (
    status === "REQUESTED" ||
    status === "PROCESSING" ||
    status === "SUCCEEDED" ||
    status === "FAILED" ||
    status === "MANUAL_REVIEW"
  ) {
    return status;
  }
  return "UNKNOWN";
}
