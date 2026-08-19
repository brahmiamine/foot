-- ID-005 — registre de sessions individuelles Identity.
-- `token_version` conserve la génération globale de révocation ; `id` est le
-- claim JWT `sid` utilisé pour invalider une session sans toucher aux autres.

USE foot;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
