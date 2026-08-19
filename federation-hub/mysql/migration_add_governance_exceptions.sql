-- GOV-007 — centre transversal des exceptions/dérogations.
-- Une exception est toujours bornée dans le temps, cible une règle/ressource/référence précises
-- et ne peut être désactivée que par révocation auditée (aucun hard delete).
CREATE TABLE IF NOT EXISTS governance_exceptions (
  id CHAR(36) NOT NULL,
  federation_id CHAR(36) NOT NULL,
  league_id CHAR(36) NULL,
  rule_key VARCHAR(100) NOT NULL,
  target_type VARCHAR(100) NOT NULL,
  target_id VARCHAR(191) NOT NULL,
  reference_key VARCHAR(191) NOT NULL,
  reason VARCHAR(2000) NOT NULL,
  valid_from DATETIME NOT NULL,
  valid_until DATETIME NOT NULL,
  created_by VARCHAR(191) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at DATETIME NULL,
  revoked_by VARCHAR(191) NULL,
  revoke_reason VARCHAR(2000) NULL,
  PRIMARY KEY (id),
  KEY idx_governance_exceptions_lookup (federation_id, league_id, rule_key, target_type, target_id, reference_key),
  KEY idx_governance_exceptions_window (valid_from, valid_until, revoked_at),
  CONSTRAINT chk_governance_exceptions_window CHECK (valid_until > valid_from)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
