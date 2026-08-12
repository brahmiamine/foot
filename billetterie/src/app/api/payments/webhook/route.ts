import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { UnauthorizedError } from "@/lib/errors";
import { handleApiError } from "@/lib/api";
import { reconcileTicketPayment } from "@/lib/tickets";

/**
 * Reçoit le webhook applicatif signé émis par payment-api une fois un
 * paiement PAID (voir payment-api/src/webhooks). Le corps n'est jamais
 * traité comme source de vérité : on vérifie seulement la signature pour
 * authentifier l'appelant, puis on déclenche reconcileTicketPayment qui
 * relit GET /payments/:id auprès de payment-api avant de marquer les
 * billets PAID (même pattern que le retour payeur / "mes billets"). Sans
 * PAYMENT_WEBHOOK_SECRET configuré, la route répond 401 : billetterie
 * continue alors de se fier uniquement à sa reconciliation par polling
 * existante.
 */
function isValidSignature(rawBody: string, header: string | null): boolean {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret || !header) return false;

  const prefix = "sha256=";
  if (!header.startsWith(prefix)) return false;
  const provided = header.slice(prefix.length);

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");

  const providedBuf = Buffer.from(provided, "hex");
  const expectedBuf = Buffer.from(expected, "hex");
  if (providedBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(providedBuf, expectedBuf);
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-payment-signature");
    if (!isValidSignature(rawBody, signature)) {
      throw new UnauthorizedError("Signature de webhook manquante ou invalide.");
    }

    const payload = JSON.parse(rawBody) as { paymentId?: string };
    if (!payload.paymentId) {
      return NextResponse.json({ error: "paymentId manquant." }, { status: 422 });
    }

    const result = await reconcileTicketPayment(payload.paymentId);
    return NextResponse.json({ status: result });
  } catch (error) {
    return handleApiError(error);
  }
}
