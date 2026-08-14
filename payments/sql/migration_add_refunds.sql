-- TASK-P0-001 (todo.md) : introduit le remboursement multi-fournisseur.
-- Additive uniquement — ne touche pas à `payments`. `synchronize` (dev)
-- crée déjà ces tables depuis les entités TypeORM ; ce fichier est la
-- trace SQL pour un déploiement en production (synchronize désactivé,
-- voir README "Limites connues").

USE payment_api;

CREATE TABLE IF NOT EXISTS refunds (
  id CHAR(36) NOT NULL PRIMARY KEY,
  payment_id VARCHAR(36) NOT NULL,
  provider ENUM('konnect', 'paymee', 'flouci') NOT NULL,
  idempotency_key VARCHAR(255) NULL,
  amount DECIMAL(12, 3) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'TND',
  status ENUM('REQUESTED', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'MANUAL_REVIEW')
    NOT NULL DEFAULT 'REQUESTED',
  reason TEXT NOT NULL,
  initiated_by_application VARCHAR(100) NOT NULL,
  initiated_by_user VARCHAR(100) NULL,
  provider_refund_ref VARCHAR(191) NULL,
  last_provider_status VARCHAR(64) NULL,
  failure_reason TEXT NULL,
  manual_review_reason TEXT NULL,
  resolved_by_user VARCHAR(100) NULL,
  resolution_note TEXT NULL,
  succeeded_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_refunds_payment_idempotency (payment_id, idempotency_key),
  INDEX idx_refunds_payment_id (payment_id)
);

CREATE TABLE IF NOT EXISTS refund_status_history (
  id CHAR(36) NOT NULL PRIMARY KEY,
  refund_id VARCHAR(36) NOT NULL,
  from_status ENUM('REQUESTED', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'MANUAL_REVIEW') NULL,
  to_status ENUM('REQUESTED', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'MANUAL_REVIEW') NOT NULL,
  reason TEXT NULL,
  actor VARCHAR(150) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_refund_status_history_refund_id (refund_id)
);
