type Tone = "neutral" | "success" | "warning" | "danger" | "info";

export const sellerStatusMeta: Record<string, { label: string; tone: Tone }> = {
  PENDING: { label: "En attente de validation", tone: "warning" },
  ACTIVE: { label: "Actif", tone: "success" },
  SUSPENDED: { label: "Suspendu", tone: "danger" },
  REJECTED: { label: "Refusé", tone: "danger" },
  CLOSED: { label: "Fermé", tone: "neutral" },
};

export const productStatusMeta: Record<string, { label: string; tone: Tone }> = {
  DRAFT: { label: "Brouillon", tone: "neutral" },
  SUBMITTED: { label: "Soumis", tone: "info" },
  UNDER_REVIEW: { label: "En cours de modération", tone: "info" },
  APPROVED: { label: "Approuvé", tone: "success" },
  PUBLISHED: { label: "Publié", tone: "success" },
  REJECTED: { label: "Refusé", tone: "danger" },
};

export const sellerOrderStatusMeta: Record<string, { label: string; tone: Tone }> = {
  PENDING: { label: "En attente", tone: "warning" },
  CONFIRMED: { label: "Confirmée", tone: "info" },
  PROCESSING: { label: "En préparation", tone: "info" },
  READY_TO_SHIP: { label: "À expédier", tone: "warning" },
  SHIPPED: { label: "Expédiée", tone: "success" },
  DELIVERED: { label: "Livrée", tone: "success" },
  CANCELLED: { label: "Annulée", tone: "danger" },
  RETURN_REQUESTED: { label: "Retour demandé", tone: "warning" },
  RETURNED: { label: "Retournée", tone: "neutral" },
  REFUNDED: { label: "Remboursée", tone: "neutral" },
};

export const returnStatusMeta: Record<string, { label: string; tone: Tone }> = {
  REQUESTED: { label: "Demandé", tone: "warning" },
  APPROVED: { label: "Approuvé", tone: "info" },
  REJECTED: { label: "Refusé", tone: "danger" },
  COMPLETED: { label: "Terminé", tone: "success" },
};

export const payoutStatusMeta: Record<string, { label: string; tone: Tone }> = {
  PENDING: { label: "En attente", tone: "warning" },
  PROCESSING: { label: "En traitement", tone: "info" },
  PAID: { label: "Payé", tone: "success" },
  FAILED: { label: "Échoué", tone: "danger" },
  CANCELLED: { label: "Annulé", tone: "neutral" },
};
