type Tone = "neutral" | "success" | "warning" | "danger" | "info";

export const sellerStatusMeta: Record<string, { key: import("@/i18n").TranslationKey; tone: Tone }> = {
  PENDING: { key: "status.seller.PENDING", tone: "warning" },
  ACTIVE: { key: "status.seller.ACTIVE", tone: "success" },
  SUSPENDED: { key: "status.seller.SUSPENDED", tone: "danger" },
  REJECTED: { key: "status.seller.REJECTED", tone: "danger" },
  CLOSED: { key: "status.seller.CLOSED", tone: "neutral" },
};

export const productStatusMeta: Record<string, { key: import("@/i18n").TranslationKey; tone: Tone }> = {
  DRAFT: { key: "status.product.DRAFT", tone: "neutral" },
  SUBMITTED: { key: "status.product.SUBMITTED", tone: "info" },
  UNDER_REVIEW: { key: "status.product.UNDER_REVIEW", tone: "info" },
  APPROVED: { key: "status.product.APPROVED", tone: "success" },
  PUBLISHED: { key: "status.product.PUBLISHED", tone: "success" },
  REJECTED: { key: "status.product.REJECTED", tone: "danger" },
};

export const sellerOrderStatusMeta: Record<string, { key: import("@/i18n").TranslationKey; tone: Tone }> = {
  PENDING: { key: "status.order.PENDING", tone: "warning" },
  CONFIRMED: { key: "status.order.CONFIRMED", tone: "info" },
  PROCESSING: { key: "status.order.PROCESSING", tone: "info" },
  READY_TO_SHIP: { key: "status.order.READY_TO_SHIP", tone: "warning" },
  SHIPPED: { key: "status.order.SHIPPED", tone: "success" },
  DELIVERED: { key: "status.order.DELIVERED", tone: "success" },
  CANCELLED: { key: "status.order.CANCELLED", tone: "danger" },
  RETURN_REQUESTED: { key: "status.order.RETURN_REQUESTED", tone: "warning" },
  RETURNED: { key: "status.order.RETURNED", tone: "neutral" },
  REFUNDED: { key: "status.order.REFUNDED", tone: "neutral" },
};

export const returnStatusMeta: Record<string, { key: import("@/i18n").TranslationKey; tone: Tone }> = {
  REQUESTED: { key: "status.return.REQUESTED", tone: "warning" },
  APPROVED: { key: "status.return.APPROVED", tone: "info" },
  REJECTED: { key: "status.return.REJECTED", tone: "danger" },
  COMPLETED: { key: "status.return.COMPLETED", tone: "success" },
};

export const payoutStatusMeta: Record<string, { key: import("@/i18n").TranslationKey; tone: Tone }> = {
  PENDING: { key: "status.payout.PENDING", tone: "warning" },
  PROCESSING: { key: "status.payout.PROCESSING", tone: "info" },
  PAID: { key: "status.payout.PAID", tone: "success" },
  FAILED: { key: "status.payout.FAILED", tone: "danger" },
  CANCELLED: { key: "status.payout.CANCELLED", tone: "neutral" },
};
