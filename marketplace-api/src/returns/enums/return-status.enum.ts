/**
 * TASK-P0-006 (todo.md) : COMPLETED (article physiquement reçu) déclenche
 * désormais automatiquement une demande de remboursement — il ne signifie
 * plus à lui seul "remboursé". REFUND_FAILED couvre un échec visible et
 * rejouable (voir ReturnsService.retryRefund) ; REFUNDED n'est atteint
 * qu'après confirmation financière par payment-api (statut SUCCEEDED),
 * jamais optimiste.
 */
export enum ReturnStatus {
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED',
  REFUND_FAILED = 'REFUND_FAILED',
  REFUNDED = 'REFUNDED',
}
