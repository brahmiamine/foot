/**
 * TASK-P0-005 (todo.md) : cycle de vie d'une réservation de stock
 * individuelle (StockReservation), distincte des compteurs agrégés sur
 * InventoryItem (available/reserved/sold) qu'elle fait évoluer.
 */
export enum ReservationStatus {
  /** Stock décrémenté de `available`, ajouté à `reserved` ; en attente de paiement. */
  RESERVED = 'RESERVED',
  /** Paiement confirmé : `reserved` -> `sold`, exactement une fois. Terminal. */
  CONFIRMED = 'CONFIRMED',
  /** Relâchée avant paiement (annulation, échec) : `reserved` -> `available`. Terminal. */
  RELEASED = 'RELEASED',
  /** Relâchée automatiquement après expiration (TTL dépassé sans confirmation). Terminal. */
  EXPIRED = 'EXPIRED',
}

/** Réservations qui ont encore une réclamation sur `reserved` — jamais RELEASED/EXPIRED (déjà rendu à `available`) ni CONFIRMED (déjà converti en `sold`). */
export const OPEN_RESERVATION_STATUSES: readonly ReservationStatus[] = [
  ReservationStatus.RESERVED,
];
