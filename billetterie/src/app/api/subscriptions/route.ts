import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSsoSession } from "@/lib/ssoSession";
import { purchaseSubscription } from "@/lib/subscriptions";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";
import { handleApiError } from "@/lib/api";

const purchaseSchema = z.object({
  subscriptionCategoryId: z.string().min(1),
  quantity: z.number().int().min(1).max(20),
});

// Réserve l'abonnement (PENDING) et initie le paiement auprès de
// payment-api — voir src/lib/subscriptions.ts, purchaseSubscription. Même
// contrat que POST /api/tickets : le caller redirige vers payUrl, la
// confirmation (PENDING -> PAID) arrive via /paiement/retour ou
// opportunément sur /mes-abonnements.
export async function POST(req: NextRequest) {
  try {
    const session = await getSsoSession();
    if (!session) {
      throw new UnauthorizedError("Connexion requise pour acheter un abonnement.");
    }
    if (session.role !== "MEMBER") {
      throw new ForbiddenError("Seul un compte membre peut acheter un abonnement.");
    }

    const body = purchaseSchema.parse(await req.json());
    const { subscriptions, payUrl } = await purchaseSubscription({
      purchaserId: session.id,
      purchaserEmail: session.email,
      subscriptionCategoryId: body.subscriptionCategoryId,
      quantity: body.quantity,
    });

    return NextResponse.json({ subscriptions, payUrl }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
