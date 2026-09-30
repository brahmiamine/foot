-- TICK-001/TICK-002 — lifecycle de vente + approbation/reapproval prix.
-- Backfill legacy : chaque offre match/catégorie reçoit une règle afin que
-- l'absence de règle puisse ensuite signifier fail-closed côté checkout.

ALTER TABLE tk_ticket_sale_rules
  ADD COLUMN IF NOT EXISTS status ENUM('DRAFT','READY_FOR_REVIEW','APPROVED','SCHEDULED','OPEN','PAUSED','CLOSED','REJECTED') NOT NULL DEFAULT 'DRAFT' AFTER ends_at,
  ADD COLUMN IF NOT EXISTS approved_fingerprint CHAR(64) NULL AFTER status,
  ADD COLUMN IF NOT EXISTS submitted_by VARCHAR(191) NULL AFTER approved_fingerprint,
  ADD COLUMN IF NOT EXISTS submitted_at DATETIME NULL AFTER submitted_by,
  ADD COLUMN IF NOT EXISTS approved_by VARCHAR(191) NULL AFTER submitted_at,
  ADD COLUMN IF NOT EXISTS approved_at DATETIME NULL AFTER approved_by,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT NULL AFTER approved_at,
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1 AFTER rejection_reason;

-- Les index ne supportent pas `IF NOT EXISTS` en MariaDB : on les crée
-- uniquement s'ils sont absents, pour que la migration reste rejouable.
SET @idx_start_exists = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tk_ticket_sale_rules'
    AND INDEX_NAME = 'idx_tk_sale_rule_status_start'
);
SET @sql = IF(@idx_start_exists = 0,
  'ALTER TABLE tk_ticket_sale_rules ADD KEY idx_tk_sale_rule_status_start (status, starts_at)',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_end_exists = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tk_ticket_sale_rules'
    AND INDEX_NAME = 'idx_tk_sale_rule_status_end'
);
SET @sql = IF(@idx_end_exists = 0,
  'ALTER TABLE tk_ticket_sale_rules ADD KEY idx_tk_sale_rule_status_end (status, ends_at)',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Les règles historiques sont considérées comme déjà approuvées. Le
-- fingerprint reste NULL pour signaler la compatibilité legacy ; le premier
-- passage par le writer gouverné les fera entrer dans le nouveau cycle.
-- NB: `tk_match_ticket_categories` n'a pas de colonne `is_active` : le statut
-- legacy est dérivé uniquement de la fenêtre temporelle de la règle.
UPDATE tk_ticket_sale_rules r
SET r.status = CASE
  WHEN r.ends_at IS NOT NULL AND r.ends_at <= UTC_TIMESTAMP() THEN 'CLOSED'
  WHEN r.starts_at IS NOT NULL AND r.starts_at > UTC_TIMESTAMP() THEN 'SCHEDULED'
  ELSE 'OPEN'
END,
r.approved_fingerprint = NULL,
r.version = 1;

-- Avant ce chantier, une catégorie sans règle était implicitement achetable.
-- Crée une règle équivalente pour préserver ce comportement uniquement pour
-- les offres historiques actives ; les nouveaux writers créent DRAFT.
-- NB: `tk_match_ticket_categories` n'a pas de colonne `is_active` (voir
-- ticketing/sql/schema.sql) : toutes les offres existantes sont donc traitées
-- comme ouvertes, ce qui reproduit le comportement d'avant ce chantier.
INSERT INTO tk_ticket_sale_rules (
  id,
  match_ticket_category_id,
  allowed_audience,
  audience_validation_mode,
  max_tickets_per_user,
  starts_at,
  ends_at,
  status,
  approved_fingerprint,
  submitted_by,
  submitted_at,
  approved_by,
  approved_at,
  rejection_reason,
  version,
  created_at
)
SELECT
  UUID(),
  c.id,
  'PUBLIC',
  'DECLARATIVE',
  4,
  NULL,
  NULL,
  'OPEN',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  1,
  UTC_TIMESTAMP()
FROM tk_match_ticket_categories c
LEFT JOIN tk_ticket_sale_rules r ON r.match_ticket_category_id = c.id
WHERE r.id IS NULL;

CREATE TABLE IF NOT EXISTS tk_governance_settings (
  club_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci NOT NULL,
  sale_approval_required TINYINT(1) NOT NULL DEFAULT 1,
  maker_checker_enabled TINYINT(1) NOT NULL DEFAULT 1,
  price_reapproval_required TINYINT(1) NOT NULL DEFAULT 1,
  version INT NOT NULL DEFAULT 1,
  updated_by VARCHAR(191) NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (club_id),
  CONSTRAINT fk_tk_governance_settings_club
    FOREIGN KEY (club_id) REFERENCES teams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
