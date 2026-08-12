import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { UnauthorizedError } from "@/lib/errors";
import { handleApiError } from "@/lib/api";
import { reconcileOrderPayment } from "@/services/ShopOrderService";

/**
 * Reçoit le webhook applicatif signé émis par payment-api une fois un
 * paiement PAID (voir payment-api/src/webhooks, et
 * billetterie/src/app/api/payments/webhook/route.ts pour la même route côté
 * billetterie). Le corps n'est jamais source de vérité : on vérifie
 * seulement la signature pour authentifier l'appelant, puis on déclenche
 * reconcileOrderPayment qui relit GET /payments/:id auprès de payment-api
 * avant de marquer la commande PAID.
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

    const result = await reconcileOrderPayment(payload.paymentId);
    return NextResponse.json({ status: result });
  } catch (error) {
    return handleApiError(error);
  }
}
