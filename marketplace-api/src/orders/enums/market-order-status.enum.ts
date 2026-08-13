/**
 * TASK-P0-004 (todo.md). Statut agrégé de la commande globale, dérivé des
 * SellerOrder qu'elle contient mais suivi séparément pour ne pas avoir à
 * recalculer un agrégat à chaque lecture — PENDING tant que le paiement
 * n'est pas confirmé, PAID une fois confirmé (chaque SellerOrder passe
 * alors PENDING -> CONFIRMED), CANCELLED si le paiement échoue/expire
 * avant confirmation (chaque SellerOrder passe alors PENDING -> CANCELLED
 * et son stock réservé est relâché).
 */
export enum MarketOrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}
