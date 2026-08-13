-- TASK-P0-003 (todo.md) : dossier de réconciliation pour un paiement de
-- billets encore PAID au moment où un match est annulé (superadmin,
-- cancelMatchAdmin) — même modèle que tk_stock_unavailable_refunds
-- (TASK-P0-002). Nouvelle table, n'affecte aucune donnée existante.

USE foot;

CREATE TABLE IF NOT EXISTS tk_match_cancellation_refunds (
  id CHAR(36) NOT NULL PRIMARY KEY,
  match_id CHAR(36) NOT NULL,
  payment_id VARCHAR(36) NOT NULL,
  refund_id VARCHAR(36) NULL,
  refund_status ENUM('PENDING_REFUND_REQUEST', 'REQUESTED', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'MANUAL_REVIEW')
    NOT NULL DEFAULT 'PENDING_REFUND_REQUEST',
  detected_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  last_checked_at DATETIME(6) NULL,
  resolved_at DATETIME(6) NULL,
  ops_alerted_at DATETIME(6) NULL,
  UNIQUE KEY uq_tk_match_cancellation_refunds_payment_id (payment_id),
  KEY idx_tk_match_cancellation_refunds_match_id (match_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
