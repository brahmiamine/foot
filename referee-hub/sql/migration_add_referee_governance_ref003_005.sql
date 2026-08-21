-- REF-003/004/005 : policy d'indisponibilité (préavis/durée max/récurrence/
-- justificatif), policy des rapports d'officiels (obligatoire par rôle,
-- délai, rappel, escalade, amendement) et déclaration de conflit d'intérêts
-- avant acceptation. Migration additive, compatible avec la base partagée.

USE foot;

ALTER TABLE referee_unavailabilities
  ADD COLUMN IF NOT EXISTS reason_category ENUM('MEDICAL','PROFESSIONAL','PERSONAL','OTHER') NOT NULL DEFAULT 'OTHER' AFTER reason,
  ADD COLUMN IF NOT EXISTS proof_document_url VARCHAR(500) NULL AFTER reason_category,
  ADD COLUMN IF NOT EXISTS recurrence_group_id CHAR(36) NULL AFTER proof_document_url,
  ADD INDEX IF NOT EXISTS idx_referee_unavailability_recurrence (recurrence_group_id);

ALTER TABLE referee_match_reports
  MODIFY COLUMN status ENUM('DRAFT','SUBMITTED','AMENDMENT_REQUESTED','AMENDED') NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS amendment_reason VARCHAR(500) NULL AFTER submitted_at,
  ADD COLUMN IF NOT EXISTS amendment_requested_at DATETIME NULL AFTER amendment_reason,
  ADD COLUMN IF NOT EXISTS amended_at DATETIME NULL AFTER amendment_requested_at,
  ADD COLUMN IF NOT EXISTS amendment_count INT NOT NULL DEFAULT 0 AFTER amended_at;

-- REF-003 — policy versionnée PLATFORM (GOV-001/GOV-004).
CREATE TABLE IF NOT EXISTS referee_unavailability_policies (
  id CHAR(36) NOT NULL,
  scope_type ENUM('PLATFORM') NOT NULL,
  scope_id CHAR(36) NULL,
  version INT NOT NULL,
  effective_from DATETIME NULL,
  effective_until DATETIME NULL,
  values_json JSON NOT NULL,
  updated_by VARCHAR(191) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_referee_unavailability_policy_scope_version (scope_type, scope_id, version),
  KEY idx_referee_unavailability_policy_scope (scope_type, scope_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- REF-004 — policy versionnée PLATFORM (GOV-001/GOV-004).
CREATE TABLE IF NOT EXISTS referee_report_policies (
  id CHAR(36) NOT NULL,
  scope_type ENUM('PLATFORM') NOT NULL,
  scope_id CHAR(36) NULL,
  version INT NOT NULL,
  effective_from DATETIME NULL,
  effective_until DATETIME NULL,
  values_json JSON NOT NULL,
  updated_by VARCHAR(191) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_referee_report_policy_scope_version (scope_type, scope_id, version),
  KEY idx_referee_report_policy_scope (scope_type, scope_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- REF-005 — une déclaration active par (désignation, officiel) ; l'historique
-- des changements reste dans referee_configuration_audit (append-only).
CREATE TABLE IF NOT EXISTS referee_conflict_declarations (
  id BIGINT NOT NULL AUTO_INCREMENT,
  assignment_id BIGINT NOT NULL,
  user_id VARCHAR(191) NOT NULL,
  has_conflict TINYINT(1) NOT NULL,
  details VARCHAR(500) NULL,
  declared_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_referee_conflict_declaration (assignment_id, user_id),
  CONSTRAINT fk_referee_conflict_declaration_assignment FOREIGN KEY (assignment_id) REFERENCES match_official_assignments(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- GOV-005 — journal append-only des changements de configuration referee-hub
-- (policies REF-003/REF-004, déclarations de conflit, amendements de rapport).
CREATE TABLE IF NOT EXISTS referee_configuration_audit (
  id CHAR(36) NOT NULL,
  domain VARCHAR(80) NOT NULL,
  configuration_key VARCHAR(120) NOT NULL,
  scope_type VARCHAR(50) NOT NULL,
  scope_id VARCHAR(191) NULL,
  previous_version INT NULL,
  new_version INT NULL,
  before_value JSON NULL,
  after_value JSON NOT NULL,
  actor_user_id VARCHAR(191) NOT NULL,
  actor_role VARCHAR(80) NOT NULL,
  reason TEXT NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(512) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_referee_configuration_audit_domain (domain),
  KEY idx_referee_configuration_audit_key (configuration_key),
  KEY idx_referee_configuration_audit_scope (scope_type, scope_id),
  KEY idx_referee_configuration_audit_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- REF-004 / GOV-008 — déduplication idempotente des rappels/escalades.
CREATE TABLE IF NOT EXISTS referee_report_sla_alerts (
  id BIGINT NOT NULL AUTO_INCREMENT,
  event_id VARCHAR(191) NOT NULL,
  assignment_id BIGINT NOT NULL,
  stage VARCHAR(20) NOT NULL,
  status ENUM('PENDING','SENT') NOT NULL DEFAULT 'PENDING',
  attempts INT NOT NULL DEFAULT 0,
  last_error VARCHAR(500) NULL,
  locked_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_referee_report_sla_alert_event (event_id),
  CONSTRAINT fk_referee_report_sla_alert_assignment FOREIGN KEY (assignment_id) REFERENCES match_official_assignments(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
