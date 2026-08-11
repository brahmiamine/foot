import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSsoSession, buildMemberProfileUrl } from "@/lib/ssoSession";
import { purchaseTickets } from "@/lib/tickets";
import { getActiveProvider } from "@/lib/paymentApiClient";
import { fetchBuyerPaymentProfile } from "@/lib/memberProfile";
import { UnauthorizedError, ForbiddenError, ProfileIncompleteError } from "@/lib/errors";
import { handleApiError } from "@/lib/api";

const purchaseSchema = z.object({
  matchTicketCategoryId: z.string().min(1),
  quantity: z.number().int().min(1).max(20),
  audienceConfirmed: z.boolean().optional().default(false),
});

// Le vendeur/organisateur n'est jamais lu depuis le body client, il est
// dérivé côté serveur du match résolu à partir de matchTicketCategoryId.
// Réserve les billets (PENDING) et initie le paiement auprès de
// payment-api — voir src/lib/tickets.ts. Le caller doit rediriger le
// navigateur vers payUrl ; la confirmation (PENDING -> PAID) arrive plus
// tard, via /paiement/retour ou opportunément sur /mes-billets.
export async function POST(req: NextRequest) {
  try {
    const session = await getSsoSession();
    if (!session) {
      throw new UnauthorizedError("Connexion requise pour acheter un billet.");
    }
    if (session.role !== "MEMBER") {
      throw new ForbiddenError("Seul un compte membre peut acheter un billet.");
    }

    const body = purchaseSchema.parse(await req.json());

    // Vérifié AVANT de réserver quoi que ce soit (pas après, au moment de
    // payer) : Paymee exige firstName/lastName/phoneNumber, que le profil
    // MEMBER de `sso` ne collecte pas toujours (voir lib/memberProfile.ts).
    // Réserver puis échouer à l'initiation forcerait une compensation
    // (libération immédiate) pour un cas qu'on peut détecter sans toucher
    // à la capacité disponible.
    let buyerFirstName: string | null = null;
    let buyerLastName: string | null = null;
    let buyerPhoneNumber: string | null = null;
    if (getActiveProvider() === "paymee") {
      const profile = await fetchBuyerPaymentProfile();
      if (!profile?.firstName || !profile?.lastName || !profile?.phoneNumber) {
        const currentUrl = req.headers.get("referer") || req.nextUrl.origin;
        throw new ProfileIncompleteError(
          "Merci de compléter votre profil (prénom, nom, téléphone) avant de payer par Paymee.",
          buildMemberProfileUrl(currentUrl),
        );
      }
      buyerFirstName = profile.firstName;
      buyerLastName = profile.lastName;
      buyerPhoneNumber = profile.phoneNumber;
    }

    const { tickets, payUrl } = await purchaseTickets({
      purchaserId: session.id,
      purchaserEmail: session.email,
      matchTicketCategoryId: body.matchTicketCategoryId,
      quantity: body.quantity,
      audienceConfirmed: body.audienceConfirmed,
      purchaserFirstName: buyerFirstName,
      purchaserLastName: buyerLastName,
      purchaserPhoneNumber: buyerPhoneNumber,
    });

    return NextResponse.json({ tickets, payUrl }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
