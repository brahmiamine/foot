import { getDataSource } from "@/lib/database";
import { Seller } from "@/entities/Seller";
import { getCurrentSellerSession, type SellerSessionUser } from "@/lib/session";

export class UnauthorizedError extends Error {
  status = 401;
}
export class ForbiddenError extends Error {
  status = 403;
}
export class NotFoundError extends Error {
  status = 404;
}

/**
 * Point d'entrée UNIQUE pour connaître le vendeur authentifié côté API.
 * Le sellerId provient exclusivement du cookie de session signé — jamais
 * d'un paramètre d'URL, d'un champ de body ou d'un header envoyé par le
 * client. Toute route qui a besoin du vendeur courant doit passer par ici.
 */
export async function requireSellerSession(): Promise<SellerSessionUser> {
  const session = await getCurrentSellerSession();
  if (!session) {
    throw new UnauthorizedError("Session vendeur requise.");
  }
  return session;
}

/**
 * Comme requireSellerSession, mais recharge aussi l'entité Seller pour
 * vérifier son statut courant (un vendeur SUSPENDED/CLOSED garde un cookie
 * valide mais ne doit plus pouvoir agir).
 */
export async function requireActiveSeller(): Promise<{ session: SellerSessionUser; seller: Seller }> {
  const session = await requireSellerSession();
  const ds = await getDataSource();
  const seller = await ds.getRepository(Seller).findOne({ where: { id: session.sellerId } });
  if (!seller) {
    throw new UnauthorizedError("Vendeur introuvable.");
  }
  if (seller.status === "SUSPENDED" || seller.status === "CLOSED" || seller.status === "REJECTED") {
    throw new ForbiddenError(`Compte vendeur ${seller.status.toLowerCase()}.`);
  }
  return { session, seller };
}

/**
 * Vérifie qu'une ressource déjà chargée appartient bien au vendeur
 * connecté. Toujours appeler après avoir chargé la ressource par son id
 * seul (jamais WHERE id = ? AND sellerId = ? construit à partir d'une
 * valeur envoyée par le client) pour ne pas transformer un accès interdit
 * en 404 silencieux qui fuiterait l'existence de la ressource — ici on
 * renvoie sciemment 404 pour ne rien révéler à un vendeur non autorisé.
 */
export function assertOwnedBySeller(resourceSellerId: string, sellerId: string): void {
  if (resourceSellerId !== sellerId) {
    throw new NotFoundError("Ressource introuvable.");
  }
}
