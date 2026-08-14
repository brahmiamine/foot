/** Compte vendeur authentifié (voir SellerJwtGuard) ayant appelé un endpoint self-service. */
export interface AuthenticatedSeller {
  sellerUserId: string;
  sellerId: string;
  role: string;
}
