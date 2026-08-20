-- CLUB-008 — sponsoring gouverné : revue -> négociation -> contrat ->
-- approbation(s) -> activation -> expiration.
--
-- Compatibilité legacy : les demandes historiquement ACCEPTED ont déjà créé
-- un Sponsor. Le statut final est recalé après reprise du Sponsor afin qu'un
-- ancien dossier désactivé ne soit jamais présenté comme ACTIVE.

USE foot;

ALTER TABLE cms_sponsor_requests
  MODIFY COLUMN status ENUM(
    'PENDING','ACCEPTED','REFUSED',
    'UNDER_REVIEW','NEGOTIATION','CONTRACT_DRAFT','APPROVAL_PENDING','APPROVED','ACTIVE','EXPIRED'
  ) NOT NULL DEFAULT 'PENDING';

UPDATE cms_sponsor_requests SET status = 'ACTIVE' WHERE status = 'ACCEPTED';

ALTER TABLE cms_sponsor_requests
  MODIFY COLUMN status ENUM(
    'PENDING','UNDER_REVIEW','NEGOTIATION','CONTRACT_DRAFT','APPROVAL_PENDING','APPROVED','ACTIVE','EXPIRED','REFUSED'
  ) NOT NULL DEFAULT 'PENDING',
  ADD COLUMN negotiation_notes TEXT NULL AFTER reviewed_at,
  ADD COLUMN negotiation_started_by VARCHAR(191) NULL AFTER negotiation_notes,
  ADD COLUMN negotiation_started_at DATETIME NULL AFTER negotiation_started_by,
  ADD COLUMN refused_by VARCHAR(191) NULL AFTER negotiation_started_at,
  ADD COLUMN refused_at DATETIME NULL AFTER refused_by,
  ADD COLUMN refusal_reason TEXT NULL AFTER refused_at;

ALTER TABLE cms_sponsors
  MODIFY COLUMN contract_amount DECIMAL(12,3) NULL,
  ADD COLUMN workflow_status ENUM('CONTRACT_DRAFT','APPROVAL_PENDING','APPROVED','ACTIVE','EXPIRED')
    NOT NULL DEFAULT 'ACTIVE' AFTER contract_amount,
  ADD COLUMN contract_drafted_by VARCHAR(191) NULL AFTER workflow_status,
  ADD COLUMN contract_drafted_at DATETIME NULL AFTER contract_drafted_by,
  ADD COLUMN activated_by VARCHAR(191) NULL AFTER contract_drafted_at,
  ADD COLUMN activated_at DATETIME NULL AFTER activated_by,
  ADD COLUMN expired_at DATETIME NULL AFTER activated_at;

UPDATE cms_sponsors SET workflow_status = 'APPROVED' WHERE is_active = 0;
UPDATE cms_sponsor_requests request
JOIN cms_sponsors sponsor ON sponsor.sponsor_request_id = request.id
SET request.status = CASE WHEN sponsor.workflow_status = 'ACTIVE' THEN 'ACTIVE' ELSE 'APPROVED' END
WHERE request.status = 'ACTIVE';
ALTER TABLE cms_sponsors ALTER COLUMN is_active SET DEFAULT 0;

CREATE TABLE cms_sponsorship_governance_settings (
  team_id CHAR(36) PRIMARY KEY,
  dual_approval_threshold DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  version INT NOT NULL DEFAULT 1,
  updated_by VARCHAR(191) NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_sponsorship_settings_team
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE cms_sponsor_contract_approvals (
  id CHAR(36) PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  sponsor_id BIGINT NOT NULL,
  maker_user_id VARCHAR(191) NOT NULL,
  approval_mode ENUM('SINGLE_APPROVAL','DUAL_APPROVAL') NOT NULL,
  required_approvals INT NOT NULL,
  contract_amount_snapshot DECIMAL(12,3) NOT NULL,
  threshold_snapshot DECIMAL(12,3) NOT NULL,
  contract_fingerprint VARCHAR(64) NOT NULL,
  status ENUM('PENDING','APPROVED','REJECTED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  rejection_reason TEXT NULL,
  resolved_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_sponsor_contract_approvals_team
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_sponsor_contract_approvals_sponsor
    FOREIGN KEY (sponsor_id) REFERENCES cms_sponsors(id) ON DELETE CASCADE,
  INDEX idx_cms_sponsor_contract_approvals_queue (team_id, status, created_at),
  INDEX idx_cms_sponsor_contract_approvals_sponsor (team_id, sponsor_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE cms_sponsor_contract_decisions (
  id CHAR(36) PRIMARY KEY,
  approval_id CHAR(36) NOT NULL,
  actor_user_id VARCHAR(191) NOT NULL,
  decision ENUM('APPROVE','REJECT') NOT NULL,
  reason TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_sponsor_contract_decisions_approval
    FOREIGN KEY (approval_id) REFERENCES cms_sponsor_contract_approvals(id) ON DELETE CASCADE,
  CONSTRAINT uq_cms_sponsor_contract_decision_actor UNIQUE (approval_id, actor_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE cms_sponsor_workflow_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  sponsor_request_id BIGINT NULL,
  sponsor_id BIGINT NULL,
  actor_user_id VARCHAR(191) NOT NULL,
  transition VARCHAR(64) NOT NULL,
  from_status VARCHAR(64) NULL,
  to_status VARCHAR(64) NOT NULL,
  details LONGTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_sponsor_events_team
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_sponsor_events_request
    FOREIGN KEY (sponsor_request_id) REFERENCES cms_sponsor_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_sponsor_events_sponsor
    FOREIGN KEY (sponsor_id) REFERENCES cms_sponsors(id) ON DELETE CASCADE,
  INDEX idx_cms_sponsor_events_request (team_id, sponsor_request_id, created_at),
  INDEX idx_cms_sponsor_events_sponsor (team_id, sponsor_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
