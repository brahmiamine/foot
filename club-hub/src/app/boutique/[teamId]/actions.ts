"use server";

import { redirect } from "next/navigation";
import { getSsoSession, buildMemberLoginUrlForPath } from "@/lib/ssoSession";
import { createOrder, type CartItemInput } from "@/services/ShopOrderService";

export type CheckoutResult = { success: false; error: string };

/**
 * Passe la commande pour le panier (client-side, voir ShopCatalog.tsx) et
 * redirige vers la page de paiement du provider — même flux que
 * ticketing/src/app/[...]/actions.ts (purchaseTickets + redirect(payUrl)).
 * Un visiteur non MEMBER est redirigé vers /membre/login plutôt que de
 * recevoir une erreur.
 */
export async function checkoutAction(teamId: string, items: CartItemInput[]): Promise<CheckoutResult> {
  const session = await getSsoSession();
  if (!session || session.role !== "MEMBER") {
    redirect(await buildMemberLoginUrlForPath(`/boutique/${teamId}`));
  }

  let payUrl: string;
  try {
    const result = await createOrder({
      purchaserId: session.id,
      purchaserEmail: session.email,
      teamId,
      items,
    });
    payUrl = result.payUrl;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Échec de la commande." };
  }

  redirect(payUrl);
}
