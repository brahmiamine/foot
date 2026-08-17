-- Politique MFA par rôle (ID-002 / GOV-004 / GOV-005).
-- Les rôles administratifs critiques sont REQUIRED par défaut ; les autres
-- restent OPTIONAL. Chaque modification incrémente `version` et écrit un
-- audit append-only avec motif et contexte de requête.

USE foot;

CREATE TABLE IF NOT EXISTS identity_mfa_role_policies (
  role VARCHAR(50) NOT NULL PRIMARY KEY,
  mode ENUM('REQUIRED','OPTIONAL','DISABLED') NOT NULL DEFAULT 'OPTIONAL',
  grace_period_days INT NOT NULL DEFAULT 0,
  version INT NOT NULL DEFAULT 1,
  updated_by VARCHAR(191) NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS identity_policy_audit (
  id CHAR(36) NOT NULL DEFAULT uuid() PRIMARY KEY,
  domain VARCHAR(80) NOT NULL,
  configuration_key VARCHAR(120) NOT NULL,
  scope_type VARCHAR(50) NOT NULL,
  scope_id VARCHAR(191) NULL,
  previous_version INT NULL,
  new_version INT NOT NULL,
  before_value JSON NULL,
  after_value JSON NOT NULL,
  actor_user_id VARCHAR(191) NOT NULL,
  actor_role VARCHAR(50) NOT NULL,
  reason TEXT NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(512) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_identity_policy_audit_domain (domain, configuration_key, created_at),
  INDEX idx_identity_policy_audit_actor (actor_user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO identity_mfa_role_policies (role, mode, grace_period_days, version)
VALUES
  ('SUPERADMIN', 'REQUIRED', 0, 1),
  ('PLATFORM_SUPERADMIN', 'REQUIRED', 0, 1),
  ('FEDERATION_ADMIN', 'REQUIRED', 0, 1),
  ('LEAGUE_ADMIN', 'REQUIRED', 0, 1),
  ('ADMIN', 'OPTIONAL', 0, 1),
  ('OBSERVATEUR', 'OPTIONAL', 0, 1),
  ('MEMBER', 'OPTIONAL', 0, 1),
  ('REFEREE', 'OPTIONAL', 0, 1),
  ('MATCH_OFFICIAL', 'OPTIONAL', 0, 1),
  ('REFEREE_OBSERVER', 'OPTIONAL', 0, 1),
  ('PLAYER', 'OPTIONAL', 0, 1)
ON DUPLICATE KEY UPDATE role = VALUES(role);
