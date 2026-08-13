import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { UnauthorizedError } from "@/lib/errors";
import { handleApiError } from "@/lib/api";
import { reconcileOrderPayment } from "@/services/ShopOrderService";
import { claimWebhookEvent } from "@/lib/webhookIdempotency";

/**
 * Reçoit le webhook applicatif signé émis par payment-api une fois un
 * paiement PAID (voir payment-api/src/webhooks, et
 * billetterie/src/app/api/payments/webhook/route.ts pour la même route côté
 * billetterie). Le corps n'est jamais source de vérité : on vérifie
 * seulement la signature pour authentifier l'appelant, puis on déclenche
 * reconcileOrderPayment qui relit GET /payments/:id auprès de payment-api
 * avant de marquer la commande PAID.
 *
 * TASK-P0-005 : payment-api retente la livraison en cas d'échec réseau/
 * timeout (voir payment-api/src/webhooks/webhook-dispatch.service.ts), le
 * même eventId peut donc arriver plusieurs fois. claimWebhookEvent()
 * garantit qu'un seul de ces appels déclenche réellement
 * reconcileOrderPayment ; les retries reçoivent le même statut sans
 * ré-exécuter le traitement métier (même pattern que billetterie).
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

    const payload = JSON.parse(rawBody) as { paymentId?: string; eventId?: string };
    if (!payload.paymentId) {
      return NextResponse.json({ error: "paymentId manquant." }, { status: 422 });
    }
    if (!payload.eventId) {
      return NextResponse.json({ error: "eventId manquant." }, { status: 422 });
    }

    const isFirstDelivery = await claimWebhookEvent(payload.eventId, payload.paymentId);
    if (!isFirstDelivery) {
      // Retry d'un événement déjà traité : accusé de réception sans
      // ré-exécuter reconcileOrderPayment (ni le nouvel appel réseau à
      // payment-api qu'il implique).
      return NextResponse.json({ status: "ALREADY_PROCESSED" });
    }

    const result = await reconcileOrderPayment(payload.paymentId);
    return NextResponse.json({ status: result });
  } catch (error) {
    return handleApiError(error);
  }
}
