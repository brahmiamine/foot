// Enums marketplace — copie des enums de source de vérité définis dans
// sellerPortal/src/entities/enums.ts (pas de package partagé entre les deux
// apps aujourd'hui). Garder synchronisé si sellerPortal évolue ces valeurs.

export enum MarketplaceProductStatus {
  DRAFT = "DRAFT",
  SUBMITTED = "SUBMITTED",
  UNDER_REVIEW = "UNDER_REVIEW",
  APPROVED = "APPROVED",
  PUBLISHED = "PUBLISHED",
  REJECTED = "REJECTED",
}

// Transitions que le club (teamManager) a le droit de déclencher. Le
// pendant vendeur (DRAFT->SUBMITTED, SUBMITTED->DRAFT, REJECTED->DRAFT) vit
// dans sellerPortal/src/entities/enums.ts — les deux ensembles sont
// disjoints par construction : aucun statut n'est ré-atteignable par les
// deux acteurs.
export const CLUB_ALLOWED_PRODUCT_TRANSITIONS: Record<string, MarketplaceProductStatus[]> = {
  [MarketplaceProductStatus.SUBMITTED]: [MarketplaceProductStatus.UNDER_REVIEW],
  [MarketplaceProductStatus.UNDER_REVIEW]: [MarketplaceProductStatus.APPROVED, MarketplaceProductStatus.REJECTED],
  [MarketplaceProductStatus.APPROVED]: [MarketplaceProductStatus.PUBLISHED],
};

export enum MarketplaceNotificationType {
  PRODUCT_APPROVED = "PRODUCT_APPROVED",
  PRODUCT_REJECTED = "PRODUCT_REJECTED",
  NEW_ORDER = "NEW_ORDER",
  ORDER_CANCELLED = "ORDER_CANCELLED",
  RETURN_REQUESTED = "RETURN_REQUESTED",
  PAYOUT_PAID = "PAYOUT_PAID",
  ACCOUNT_SUSPENDED = "ACCOUNT_SUSPENDED",
}
