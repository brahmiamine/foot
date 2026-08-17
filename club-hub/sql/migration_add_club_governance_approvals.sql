-- Gouvernance interne du club : maker/checker et files d'approbation
-- éditoriales/boutique (CLUB-001 à CLUB-004).

CREATE TABLE IF NOT EXISTS cms_club_governance_settings (
  team_id CHAR(36) NOT NULL PRIMARY KEY,
  maker_checker_enabled TINYINT(1) NOT NULL DEFAULT 1,
  news_approval_mode ENUM('AUTO','SINGLE_APPROVAL','DUAL_APPROVAL') NOT NULL DEFAULT 'SINGLE_APPROVAL',
  news_reapproval_on_sensitive_change TINYINT(1) NOT NULL DEFAULT 1,
  announcement_default_approval_mode ENUM('AUTO','SINGLE_APPROVAL','DUAL_APPROVAL') NOT NULL DEFAULT 'SINGLE_APPROVAL',
  announcement_decision_approval_mode ENUM('AUTO','SINGLE_APPROVAL','DUAL_APPROVAL') NOT NULL DEFAULT 'DUAL_APPROVAL',
  announcement_sanction_approval_mode ENUM('AUTO','SINGLE_APPROVAL','DUAL_APPROVAL') NOT NULL DEFAULT 'DUAL_APPROVAL',
  announcement_reapproval_on_sensitive_change TINYINT(1) NOT NULL DEFAULT 1,
  shop_product_approval_mode ENUM('AUTO','SINGLE_APPROVAL','DUAL_APPROVAL') NOT NULL DEFAULT 'SINGLE_APPROVAL',
  shop_product_reapproval_on_sensitive_change TINYINT(1) NOT NULL DEFAULT 1,
  version INT NOT NULL DEFAULT 1,
  updated_by VARCHAR(191) NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_club_governance_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cms_approval_requests (
  id CHAR(36) NOT NULL PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  domain ENUM('NEWS','ANNOUNCEMENT','CLUB_PRODUCT') NOT NULL,
  entity_id VARCHAR(191) NOT NULL,
  action VARCHAR(50) NOT NULL DEFAULT 'PUBLISH',
  maker_user_id VARCHAR(191) NOT NULL,
  maker_checker_enabled TINYINT(1) NOT NULL DEFAULT 1,
  approval_mode ENUM('SINGLE_APPROVAL','DUAL_APPROVAL') NOT NULL,
  required_approvals INT NOT NULL,
  content_fingerprint VARCHAR(64) NOT NULL,
  status ENUM('PENDING','APPROVED','REJECTED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  rejection_reason TEXT NULL,
  resolved_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_cms_approval_queue (team_id, status, created_at),
  INDEX idx_cms_approval_entity (team_id, domain, entity_id, status),
  CONSTRAINT fk_cms_approval_request_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cms_approval_decisions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  request_id CHAR(36) NOT NULL,
  actor_user_id VARCHAR(191) NOT NULL,
  decision ENUM('APPROVE','REJECT') NOT NULL,
  reason TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cms_approval_decision_actor (request_id, actor_user_id),
  INDEX idx_cms_approval_decisions_request (request_id, created_at),
  CONSTRAINT fk_cms_approval_decision_request FOREIGN KEY (request_id) REFERENCES cms_approval_requests(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
