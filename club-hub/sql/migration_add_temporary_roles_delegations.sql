-- CLUB-012 : rôles temporaires et délégations de permissions bornées.
USE foot;

ALTER TABLE cms_user_roles
  ADD COLUMN IF NOT EXISTS valid_from DATETIME NULL AFTER category,
  ADD COLUMN IF NOT EXISTS valid_until DATETIME NULL AFTER valid_from,
  ADD COLUMN IF NOT EXISTS granted_by VARCHAR(191) NULL AFTER valid_until,
  ADD COLUMN IF NOT EXISTS grant_reason TEXT NULL AFTER granted_by,
  ADD COLUMN IF NOT EXISTS revoked_at DATETIME NULL AFTER grant_reason,
  ADD COLUMN IF NOT EXISTS revoked_by VARCHAR(191) NULL AFTER revoked_at,
  ADD COLUMN IF NOT EXISTS revocation_reason TEXT NULL AFTER revoked_by;

-- Les attributions historiques restent permanentes : valid_from/valid_until NULL.
-- Aucun backfill temporel n'est inventé pour elles.
ALTER TABLE cms_user_roles
  ADD INDEX idx_cms_user_roles_active_window (team_id, user_id, valid_from, valid_until, revoked_at);

CREATE TABLE IF NOT EXISTS cms_role_delegations (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  delegator_user_id VARCHAR(191) NOT NULL,
  delegatee_user_id VARCHAR(191) NOT NULL,
  permissions TEXT NOT NULL,
  category VARCHAR(10) NULL,
  valid_from DATETIME NOT NULL,
  valid_until DATETIME NOT NULL,
  reason TEXT NOT NULL,
  revoked_at DATETIME NULL,
  revoked_by VARCHAR(191) NULL,
  revocation_reason TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_role_delegations_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT chk_cms_role_delegations_window CHECK (valid_until > valid_from),
  INDEX idx_cms_role_delegations_delegatee_window (team_id, delegatee_user_id, valid_from, valid_until),
  INDEX idx_cms_role_delegations_delegator (team_id, delegator_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
