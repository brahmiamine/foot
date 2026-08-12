export enum ProductStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
  REJECTED = 'REJECTED',
}

/**
 * Transitions que le vendeur a le droit de déclencher lui-même (voir
 * ProductsService). Tout le reste (UNDER_REVIEW, APPROVED, REJECTED,
 * PUBLISHED) est réservé à la modération du club, voir
 * ModerationModule/CLUB_ALLOWED_PRODUCT_TRANSITIONS.
 */
export const SELLER_ALLOWED_PRODUCT_TRANSITIONS: Record<
  string,
  ProductStatus[]
> = {
  [ProductStatus.DRAFT]: [ProductStatus.SUBMITTED],
  [ProductStatus.SUBMITTED]: [ProductStatus.DRAFT],
  [ProductStatus.REJECTED]: [ProductStatus.DRAFT],
};

/** Transitions que le club (modération) a le droit de déclencher — voir ModerationModule. */
export const CLUB_ALLOWED_PRODUCT_TRANSITIONS: Record<string, ProductStatus[]> =
  {
    [ProductStatus.SUBMITTED]: [ProductStatus.UNDER_REVIEW],
    [ProductStatus.UNDER_REVIEW]: [
      ProductStatus.APPROVED,
      ProductStatus.REJECTED,
    ],
    [ProductStatus.APPROVED]: [ProductStatus.PUBLISHED],
  };
