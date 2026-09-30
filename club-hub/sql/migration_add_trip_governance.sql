-- CLUB-009 — déplacements gouvernés : budget, approbations maker/checker,
-- consentements, justificatifs, départ et clôture.
--
-- Compatibilité legacy : tous les déplacements existants deviennent DRAFT.
-- Les consentements sont initialisés à NOT_REQUIRED puis recalculés au moment
-- de la première soumission du budget selon l'âge du joueur à la date de départ.

USE foot;

ALTER TABLE cms_trips
  ADD COLUMN IF NOT EXISTS workflow_status ENUM(
    'DRAFT','APPROVAL_PENDING','APPROVED','READY','DEPARTED','COMPLETED','CANCELLED'
  ) NOT NULL DEFAULT 'DRAFT' AFTER notes,
  ADD COLUMN IF NOT EXISTS estimated_budget DECIMAL(12,3) NULL AFTER workflow_status,
  ADD COLUMN IF NOT EXISTS approved_budget DECIMAL(12,3) NULL AFTER estimated_budget,
  ADD COLUMN IF NOT EXISTS actual_budget DECIMAL(12,3) NULL AFTER approved_budget,
  ADD COLUMN IF NOT EXISTS budget_submitted_by VARCHAR(191) NULL AFTER actual_budget,
  ADD COLUMN IF NOT EXISTS budget_submitted_at DATETIME NULL AFTER budget_submitted_by,
  ADD COLUMN IF NOT EXISTS budget_approved_at DATETIME NULL AFTER budget_submitted_at,
  ADD COLUMN IF NOT EXISTS ready_by VARCHAR(191) NULL AFTER budget_approved_at,
  ADD COLUMN IF NOT EXISTS ready_at DATETIME NULL AFTER ready_by,
  ADD COLUMN IF NOT EXISTS departed_by VARCHAR(191) NULL AFTER ready_at,
  ADD COLUMN IF NOT EXISTS departed_at DATETIME NULL AFTER departed_by,
  ADD COLUMN IF NOT EXISTS completed_by VARCHAR(191) NULL AFTER departed_at,
  ADD COLUMN IF NOT EXISTS completed_at DATETIME NULL AFTER completed_by,
  ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(191) NULL AFTER completed_at,
  ADD COLUMN IF NOT EXISTS cancelled_at DATETIME NULL AFTER cancelled_by,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT NULL AFTER cancelled_at;

-- Index créés conditionnellement (`ADD INDEX` n'accepte pas `IF NOT EXISTS`
-- en MariaDB, et ils existent déjà sur une base où les colonnes ont été
-- ajoutées lors d'un passage antérieur).
SET @ix_trips = (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cms_trips' AND INDEX_NAME = 'idx_cms_trips_workflow');
SET @sql = IF(@ix_trips = 0,
  'ALTER TABLE cms_trips ADD INDEX idx_cms_trips_workflow (team_id, workflow_status, departure_time)',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

ALTER TABLE cms_trip_participants
  ADD COLUMN IF NOT EXISTS consent_status ENUM('NOT_REQUIRED','PENDING','GRANTED','REFUSED')
    NOT NULL DEFAULT 'NOT_REQUIRED' AFTER confirmed,
  ADD COLUMN IF NOT EXISTS consent_recorded_by VARCHAR(191) NULL AFTER consent_status,
  ADD COLUMN IF NOT EXISTS consent_recorded_at DATETIME NULL AFTER consent_recorded_by,
  ADD COLUMN IF NOT EXISTS consent_note TEXT NULL AFTER consent_recorded_at;

SET @ix_part = (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cms_trip_participants' AND INDEX_NAME = 'idx_cms_trip_participants_consent');
SET @sql = IF(@ix_part = 0,
  'ALTER TABLE cms_trip_participants ADD INDEX idx_cms_trip_participants_consent (trip_id, consent_status)',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS cms_trip_governance_settings (
  team_id CHAR(36) PRIMARY KEY,
  dual_approval_threshold DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  receipt_required_threshold DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  version INT NOT NULL DEFAULT 1,
  updated_by VARCHAR(191) NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_trip_governance_settings_team
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS cms_trip_budget_approvals (
  id CHAR(36) PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  trip_id BIGINT NOT NULL,
  maker_user_id VARCHAR(191) NOT NULL,
  approval_mode ENUM('SINGLE_APPROVAL','DUAL_APPROVAL') NOT NULL,
  required_approvals INT NOT NULL,
  estimated_budget_snapshot DECIMAL(12,3) NOT NULL,
  threshold_snapshot DECIMAL(12,3) NOT NULL,
  trip_fingerprint VARCHAR(64) NOT NULL,
  status ENUM('PENDING','APPROVED','REJECTED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  rejection_reason TEXT NULL,
  resolved_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_trip_budget_approvals_team
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_trip_budget_approvals_trip
    FOREIGN KEY (trip_id) REFERENCES cms_trips(id) ON DELETE CASCADE,
  INDEX idx_cms_trip_budget_approvals_queue (team_id, status, created_at),
  INDEX idx_cms_trip_budget_approvals_trip (team_id, trip_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS cms_trip_budget_decisions (
  id CHAR(36) PRIMARY KEY,
  approval_id CHAR(36) NOT NULL,
  actor_user_id VARCHAR(191) NOT NULL,
  decision ENUM('APPROVE','REJECT') NOT NULL,
  reason TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_trip_budget_decisions_approval
    FOREIGN KEY (approval_id) REFERENCES cms_trip_budget_approvals(id) ON DELETE CASCADE,
  CONSTRAINT uq_cms_trip_budget_decision_actor UNIQUE (approval_id, actor_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS cms_trip_expense_receipts (
  id CHAR(36) PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  trip_id BIGINT NOT NULL,
  label VARCHAR(150) NOT NULL,
  amount DECIMAL(12,3) NOT NULL,
  receipt_threshold_snapshot DECIMAL(12,3) NOT NULL,
  receipt_required TINYINT(1) NOT NULL DEFAULT 0,
  document_url VARCHAR(255) NULL,
  status ENUM('ACTIVE','VOIDED') NOT NULL DEFAULT 'ACTIVE',
  voided_by VARCHAR(191) NULL,
  voided_at DATETIME NULL,
  created_by VARCHAR(191) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_trip_expense_receipts_team
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_trip_expense_receipts_trip
    FOREIGN KEY (trip_id) REFERENCES cms_trips(id) ON DELETE CASCADE,
  INDEX idx_cms_trip_expense_receipts_trip (team_id, trip_id, created_at),
  INDEX idx_cms_trip_expense_receipts_status (team_id, trip_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS cms_trip_workflow_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  trip_id BIGINT NOT NULL,
  participant_id BIGINT NULL,
  actor_user_id VARCHAR(191) NOT NULL,
  transition VARCHAR(64) NOT NULL,
  from_status VARCHAR(64) NULL,
  to_status VARCHAR(64) NOT NULL,
  details LONGTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_trip_workflow_events_team
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_trip_workflow_events_trip
    FOREIGN KEY (trip_id) REFERENCES cms_trips(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_trip_workflow_events_participant
    FOREIGN KEY (participant_id) REFERENCES cms_trip_participants(id) ON DELETE SET NULL,
  INDEX idx_cms_trip_workflow_events_trip (team_id, trip_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
