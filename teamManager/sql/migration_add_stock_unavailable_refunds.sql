-- TASK-P0-002 (todo.md) : dossier de réconciliation pour un paiement
-- confirmé après restockage (PAID_STOCK_UNAVAILABLE) — remplace le simple
-- log d'erreur par une demande de remboursement automatique auprès de
-- payment-api (TASK-P0-001), suivie jusqu'à résolution. Même table que
-- billetterie/sql/migration_add_stock_unavailable_refunds.sql. Additive,
-- n'affecte aucune donnée existante.

USE foot;

CREATE TABLE IF NOT EXISTS shop_stock_unavailable_refunds (
  id CHAR(36) NOT NULL PRIMARY KEY,
  payment_id VARCHAR(36) NOT NULL,
  refund_id VARCHAR(36) NULL,
  refund_status ENUM('PENDING_REFUND_REQUEST', 'REQUESTED', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'MANUAL_REVIEW')
    NOT NULL DEFAULT 'PENDING_REFUND_REQUEST',
  detected_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  last_checked_at DATETIME(6) NULL,
  resolved_at DATETIME(6) NULL,
  ops_alerted_at DATETIME(6) NULL,
  UNIQUE KEY uq_shop_stock_unavailable_refunds_payment_id (payment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
