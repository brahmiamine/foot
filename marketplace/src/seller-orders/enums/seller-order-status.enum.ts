export enum SellerOrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  READY_TO_SHIP = 'READY_TO_SHIP',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  RETURN_REQUESTED = 'RETURN_REQUESTED',
  RETURNED = 'RETURNED',
  REFUNDED = 'REFUNDED',
}

/**
 * Transitions de fulfillment (E06/TS-20) que le vendeur a le droit de
 * déclencher lui-même sur sa sous-commande, dans l'ordre :
 * CONFIRMED (payée) -> PROCESSING (préparation, US-21) ->
 * READY_TO_SHIP (US-22) -> SHIPPED (expédition, US-23) ->
 * DELIVERED (livraison, US-24). CANCELLED/RETURN_REQUESTED/RETURNED/
 * REFUNDED restent hors périmètre de ce ticket (annulation : cascade match
 * hors scope ; retours : Epic E16 ; remboursement : Epic E15).
 */
export const SELLER_ALLOWED_ORDER_TRANSITIONS: Record<
  string,
  SellerOrderStatus[]
> = {
  [SellerOrderStatus.CONFIRMED]: [SellerOrderStatus.PROCESSING],
  [SellerOrderStatus.PROCESSING]: [SellerOrderStatus.READY_TO_SHIP],
  [SellerOrderStatus.READY_TO_SHIP]: [SellerOrderStatus.SHIPPED],
  [SellerOrderStatus.SHIPPED]: [SellerOrderStatus.DELIVERED],
};
