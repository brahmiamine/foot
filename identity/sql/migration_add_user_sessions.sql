-- ID-005/ID-006 — registre de sessions individuelles et accès temporaire Identity.
-- `token_version` conserve la génération globale de révocation ; `id` est le
-- claim JWT `sid` utilisé pour invalider une session sans toucher aux autres.
-- La fenêtre compte suit [access_valid_from, access_valid_until) et est relue
-- côté Identity à chaque login/introspection.

USE foot;

ALTER TABLE `User`
  ADD COLUMN access_valid_from DATETIME NULL AFTER isActive,
  ADD COLUMN access_valid_until DATETIME NULL AFTER access_valid_from;

CREATE TABLE IF NOT EXISTS identity_user_sessions (
  id VARCHAR(36) NOT NULL,
  user_id VARCHAR(191) NOT NULL,
  token_version INT NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(512) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at DATETIME NOT NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  revoked_reason VARCHAR(64) NULL,
  PRIMARY KEY (id),
  INDEX idx_identity_user_sessions_user_active (user_id, revoked_at, expires_at),
  CONSTRAINT fk_identity_user_sessions_user
    FOREIGN KEY (user_id) REFERENCES `User`(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;