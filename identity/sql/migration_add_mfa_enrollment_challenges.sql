-- Challenge d'enrôlement MFA à durée de vie courte (avancement.md, "identity" :
-- durcir l'enrôlement MFA). Remplace le round-trip client du secret TOTP
-- entre /api/mfa/setup et /api/mfa/enable : le serveur garde seul le secret
-- entre les deux appels, avec expiration. Table propre à `sso` (voir
-- db/OWNERSHIP.md).

USE foot;

CREATE TABLE IF NOT EXISTS mfa_enrollment_challenges (
  user_id VARCHAR(191) NOT NULL PRIMARY KEY,
  secret VARCHAR(191) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mfa_enrollment_challenges_user FOREIGN KEY (user_id) REFERENCES `User`(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
