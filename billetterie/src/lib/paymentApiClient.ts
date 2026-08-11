/**
 * Client HTTP serveur-à-serveur vers payment-api (voir ../../payment-api/README.md).
 * N'accepte que les providers dont le DTO d'initiation ne demande que
 * orderId/amount/email/userId (Konnect, Flouci) : Paymee exige en plus
 * firstName/lastName/phoneNumber, des champs que le profil MEMBER de `sso`
 * ne collecte pas aujourd'hui — non supporté ici tant que ce formulaire de
 * checkout n'existe pas (voir avancement.md, rang 9).
 */

const PROVIDER_INIT_PATHS: Record<string, string> = {
  konnect: "/payments/konnect/init",
  flouci: "/payments/providers/flouci/init",
};

function getConfig(): { baseUrl: string; apiKey: string } {
  const baseUrl = process.env.PAYMENT_API_URL;
  const apiKey = process.env.PAYMENT_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error("PAYMENT_API_URL et PAYMENT_API_KEY doivent être configurés pour accepter des paiements réels.");
  }
  return { baseUrl, apiKey };
}

function getProviderInitPath(): string {
  const provider = process.env.PAYMENT_PROVIDER || "konnect";
  const path = PROVIDER_INIT_PATHS[provider];
  if (!path) {
    throw new Error(
      `PAYMENT_PROVIDER="${provider}" non supporté par billetterie (konnect ou flouci uniquement) — voir src/lib/paymentApiClient.ts.`
    );
  }
  return path;
}

export interface InitPaymentInput {
  orderId: string;
  amount: number;
  email?: string;
  userId: string;
}

export interface InitPaymentResult {
  paymentId: string;
  payUrl: string;
}

export async function initPayment(input: InitPaymentInput): Promise<InitPaymentResult> {
  const { baseUrl, apiKey } = getConfig();

  const response = await fetch(`${baseUrl}${getProviderInitPath()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({
      orderId: input.orderId,
      amount: input.amount,
      currency: "TND",
      email: input.email,
      userId: input.userId,
    }),
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
