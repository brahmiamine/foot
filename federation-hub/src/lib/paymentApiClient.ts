export type RegulatoryPaymentStatus = "PENDING" | "PAID" | "FAILED" | "EXPIRED" | "UNKNOWN";

export interface RegulatoryPayment {
  id: string;
  orderId: string;
  amount: string;
  currency: string;
  status: RegulatoryPaymentStatus;
  callerApplication?: string | null;
  paidAt?: string | null;
}

function getConfig(): { baseUrl: string; apiKey: string } {
  const baseUrl = process.env.PAYMENT_API_URL;
  const apiKey = process.env.PAYMENT_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error("PAYMENT_API_URL et PAYMENT_API_KEY doivent être configurés pour vérifier les droits réglementaires.");
  }
  return { baseUrl: baseUrl.replace(/\/$/, ""), apiKey };
}

/**
 * Lecture serveur-à-serveur de la source de vérité payments.
 * Aucun statut ou montant provenant du navigateur n'est accepté.
 */
export async function getRegulatoryPayment(paymentId: string): Promise<RegulatoryPayment | null> {
  const { baseUrl, apiKey } = getConfig();
  const response = await fetch(`${baseUrl}/payments/${encodeURIComponent(paymentId)}`, {
    headers: { "x-api-key": apiKey },
    cache: "no-store",
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Impossible de vérifier le paiement réglementaire (payments ${response.status}): ${body}`);
  }

  const data = (await response.json()) as Partial<RegulatoryPayment>;
  if (!data.id || !data.orderId || data.amount == null || !data.currency || !data.status) {
    throw new Error("Réponse payments incomplète lors de la vérification d'un droit réglementaire.");
  }

  return data as RegulatoryPayment;
}
