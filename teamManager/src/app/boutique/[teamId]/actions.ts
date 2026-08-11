"use server";

import { getSsoSession } from "@/lib/ssoSession";
import { purchaseProduct } from "@/services/OrderService";

/**
 * Achat public d'un produit de la boutique du club — réservé aux comptes
 * `MEMBER` (espace supporter `sso`), jamais aux comptes staff. Le
 * vendeur/club n'est jamais lu depuis le client : il est dérivé côté
 * serveur du produit résolu à partir de `productId` (voir OrderService).
 *
 * Réserve la commande (PENDING) et initie le paiement auprès de
 * payment-api — le caller (PurchaseForm) doit rediriger le navigateur vers
 * `payUrl` reçu ; la confirmation (PENDING -> PAID) arrive plus tard, via
 * /paiement/retour ou opportunément sur /mes-commandes. Renvoie payUrl au
 * lieu d'appeler `redirect()` ici (URL externe, hors du domaine de cette
 * app) pour rester sur le même modèle éprouvé que
 * billetterie/src/components/PurchaseForm.tsx.
 */
export async function purchaseAction(
  productId: number,
  quantity: number,
): Promise<{ success: true; payUrl: string } | { success: false; error: string }> {
  const session = await getSsoSession();
  if (!session) {
    return { success: false, error: "Connexion requise pour acheter." };
  }
  if (session.role !== "MEMBER") {
    return { success: false, error: "Seul un compte membre peut acheter sur la boutique." };
  }

  try {
    const { payUrl } = await purchaseProduct({
      buyerId: session.id,
      buyerEmail: session.email,
      productId,
      quantity,
    });
    return { success: true, payUrl };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Achat impossible." };
  }
}
