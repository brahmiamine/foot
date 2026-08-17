-- TICK-001/TICK-002 — lifecycle de vente + approbation/reapproval prix.
-- Backfill legacy : chaque offre match/catégorie reçoit une règle afin que
-- l'absence de règle puisse ensuite signifier fail-closed côté checkout.

ALTER TABLE tk_ticket_sale_rules
  ADD COLUMN status ENUM('DRAFT','READY_FOR_REVIEW','APPROVED','SCHEDULED','OPEN','PAUSED','CLOSED','REJECTED') NOT NULL DEFAULT 'DRAFT' AFTER ends_at,
  ADD COLUMN approved_fingerprint CHAR(64) NULL AFTER status,
  ADD COLUMN submitted_by VARCHAR(191) NULL AFTER approved_fingerprint,
  ADD COLUMN submitted_at DATETIME NULL AFTER submitted_by,
  ADD COLUMN approved_by VARCHAR(191) NULL AFTER submitted_at,
  ADD COLUMN approved_at DATETIME NULL AFTER approved_by,
  ADD COLUMN rejection_reason TEXT NULL AFTER approved_at,
  ADD COLUMN version INT NOT NULL DEFAULT 1 AFTER rejection_reason,
  ADD KEY idx_tk_sale_rule_status_start (status, starts_at),
  ADD KEY idx_tk_sale_rule_status_end (status, ends_at);

-- Les règles historiques sont considérées comme déjà approuvées. Le
-- fingerprint reste NULL pour signaler la compatibilité legacy ; le premier
-- passage par le writer gouverné les fera entrer dans le nouveau cycle.
UPDATE tk_ticket_sale_rules r
JOIN tk_match_ticket_categories c ON c.id = r.match_ticket_category_id
SET r.status = CASE
  WHEN c.is_active = 0 THEN 'CLOSED'
  WHEN r.ends_at IS NOT NULL AND r.ends_at <= UTC_TIMESTAMP() THEN 'CLOSED'
  WHEN r.starts_at IS NOT NULL AND r.starts_at > UTC_TIMESTAMP() THEN 'SCHEDULED'
  ELSE 'OPEN'
END,
r.approved_fingerprint = NULL,
r.version = 1;

-- Avant ce chantier, une catégorie sans règle était implicitement achetable.
-- Crée une règle équivalente pour préserver ce comportement uniquement pour
-- les offres historiques actives ; les nouveaux writers créent DRAFT.
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
  created_at,
  updated_at
)
SELECT
  UUID(),
  c.id,
  'PUBLIC',
  'DECLARATIVE',
  4,
  NULL,
  NULL,
  CASE WHEN c.is_active = 1 THEN 'OPEN' ELSE 'CLOSED' END,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  1,
  UTC_TIMESTAMP(),
  UTC_TIMESTAMP()
FROM tk_match_ticket_categories c
LEFT JOIN tk_ticket_sale_rules r ON r.match_ticket_category_id = c.id
WHERE r.id IS NULL;

CREATE TABLE IF NOT EXISTS tk_governance_settings (
  club_id CHAR(36) NOT NULL,
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
