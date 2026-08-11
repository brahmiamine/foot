/**
 * Client HTTP serveur-à-serveur vers payment-api (voir ../../payment-api/README.md).
 *
 * payment-api monte les 3 providers (Konnect/Paymee/Flouci) simultanément,
 * chacun sur sa propre route (`payments/konnect/init`,
 * `payments/providers/paymee/init`, `payments/providers/flouci/init`) — le
 * choix du provider n'est PAS un état process-wide côté payment-api, rien
 * n'empêcherait d'appeler les trois depuis le même processus. `billetterie`
 * choisit malgré tout un seul provider actif pour tout le déploiement via
 * `PAYMENT_PROVIDER` (pas un choix par commande) : c'est un choix
 * d'architecture propre à cette app, pas une limite de payment-api — voir
 * avancement.md § billetterie.
 *
 * Konnect/Flouci partagent le DTO générique (orderId/amount/currency/email/
 * userId, firstName/lastName/phoneNumber optionnels). Paymee exige en plus
 * firstName/lastName/phoneNumber (voir paymee.mapper.ts/paymee.types.ts
 * côté payment-api) : le profil MEMBER de `sso` ne les collecte pas
 * toujours (voir sso/src/lib/members.ts) — vérifiés ici et jamais envoyés
 * vides à Paymee.
 */

const PROVIDER_INIT_PATHS: Record<string, string> = {
  konnect: "/payments/konnect/init",
  flouci: "/payments/providers/flouci/init",
  paymee: "/payments/providers/paymee/init",
};

export function getActiveProvider(): string {
  return process.env.PAYMENT_PROVIDER || "konnect";
}

function getConfig(): { baseUrl: string; apiKey: string } {
  const baseUrl = process.env.PAYMENT_API_URL;
  const apiKey = process.env.PAYMENT_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error("PAYMENT_API_URL et PAYMENT_API_KEY doivent être configurés pour accepter des paiements réels.");
  }
  return { baseUrl, apiKey };
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
  /**
   * Requis uniquement si PAYMENT_PROVIDER=paymee (voir
   * fetchBuyerPaymentProfile dans lib/memberProfile.ts, appelé par
   * app/api/tickets/route.ts avant même de réserver les billets). Ignorés
   * pour konnect/flouci.
   */
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
}

export interface InitPaymentResult {
  paymentId: string;
  payUrl: string;
}

/**
 * Construit le corps de la requête d'initiation, propre à chaque provider
 * — `payment-api` rejette toute propriété non déclarée par le DTO ciblé
 * (ValidationPipe `forbidNonWhitelisted: true`, voir payment-api/src/main.ts),
 * jamais un simple objet fourre-tout partagé entre les trois.
 */
function buildInitPaymentBody(provider: string, input: InitPaymentInput): Record<string, unknown> {
  if (provider === "paymee") {
    if (!input.email || !input.firstName || !input.lastName || !input.phoneNumber) {
      // Ne devrait jamais arriver : app/api/tickets/route.ts vérifie déjà le
      // profil avant d'appeler initPayment. Filet de sécurité pour ne
      // jamais envoyer de champ vide à Paymee.
      throw new Error("firstName/lastName/phoneNumber/email requis pour initier un paiement Paymee.");
    }
    return {
      orderId: input.orderId,
      amount: input.amount,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phoneNumber: input.phoneNumber,
      userId: input.userId,
    };
  }

  return {
    orderId: input.orderId,
    amount: input.amount,
    currency: "TND",
    email: input.email,
    userId: input.userId,
  };
}

export async function initPayment(input: InitPaymentInput): Promise<InitPaymentResult> {
  const { baseUrl, apiKey } = getConfig();
  const provider = getActiveProvider();

  const response = await fetch(`${baseUrl}${getProviderInitPath(provider)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify(buildInitPaymentBody(provider, input)),
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
