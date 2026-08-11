// Enumérations partagées par les entités de la marketplace.
// Ce fichier est la source de vérité des cycles de vie métier : le frontend
// ne doit jamais inventer un statut qui n'existe pas ici.

export enum SellerStatus {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  REJECTED = "REJECTED",
  CLOSED = "CLOSED",
}

export enum SellerUserRole {
  OWNER = "OWNER",
  MANAGER = "MANAGER",
  STAFF = "STAFF",
}

export enum SellerUserStatus {
  ACTIVE = "ACTIVE",
  INVITED = "INVITED",
  DISABLED = "DISABLED",
}

export enum ProductStatus {
  DRAFT = "DRAFT",
  SUBMITTED = "SUBMITTED",
  UNDER_REVIEW = "UNDER_REVIEW",
  APPROVED = "APPROVED",
  PUBLISHED = "PUBLISHED",
  REJECTED = "REJECTED",
}

// Transitions que le vendeur a le droit de déclencher lui-même.
// Tout le reste (APPROVED, REJECTED, UNDER_REVIEW -> PUBLISHED masqué, etc.)
// est réservé à la modération OB (teamManager), jamais au Seller Portal.
export const SELLER_ALLOWED_PRODUCT_TRANSITIONS: Record<string, ProductStatus[]> = {
  [ProductStatus.DRAFT]: [ProductStatus.SUBMITTED],
  [ProductStatus.SUBMITTED]: [ProductStatus.DRAFT],
  [ProductStatus.REJECTED]: [ProductStatus.DRAFT],
};

export enum SellerOrderStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  PROCESSING = "PROCESSING",
  READY_TO_SHIP = "READY_TO_SHIP",
  SHIPPED = "SHIPPED",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
  RETURN_REQUESTED = "RETURN_REQUESTED",
  RETURNED = "RETURNED",
  REFUNDED = "REFUNDED",
}

// Cycle de progression standard qu'un vendeur peut faire avancer lui-même.
// CANCELLED / RETURN_REQUESTED / RETURNED / REFUNDED sont pilotés par le
// client, le transporteur ou la marketplace, jamais choisis librement.
export const SELLER_ORDER_FORWARD_TRANSITIONS: Record<string, SellerOrderStatus[]> = {
  [SellerOrderStatus.PENDING]: [SellerOrderStatus.CONFIRMED],
  [SellerOrderStatus.CONFIRMED]: [SellerOrderStatus.PROCESSING],
  [SellerOrderStatus.PROCESSING]: [SellerOrderStatus.READY_TO_SHIP],
  [SellerOrderStatus.READY_TO_SHIP]: [SellerOrderStatus.SHIPPED],
};

export enum ReturnStatus {
  REQUESTED = "REQUESTED",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  COMPLETED = "COMPLETED",
}

export enum PayoutStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  PAID = "PAID",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}

export enum NotificationType {
  PRODUCT_APPROVED = "PRODUCT_APPROVED",
  PRODUCT_REJECTED = "PRODUCT_REJECTED",
  NEW_ORDER = "NEW_ORDER",
  ORDER_CANCELLED = "ORDER_CANCELLED",
  RETURN_REQUESTED = "RETURN_REQUESTED",
  PAYOUT_PAID = "PAYOUT_PAID",
  ACCOUNT_SUSPENDED = "ACCOUNT_SUSPENDED",
}
