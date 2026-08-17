-- Politique MFA par rôle (ID-002).
-- Les rôles administratifs critiques sont REQUIRED par défaut ; les autres
-- restent OPTIONAL. Une ligne absente conserve les mêmes defaults côté code.

USE foot;

CREATE TABLE IF NOT EXISTS identity_mfa_role_policies (
  role VARCHAR(50) NOT NULL PRIMARY KEY,
  mode ENUM('REQUIRED','OPTIONAL','DISABLED') NOT NULL DEFAULT 'OPTIONAL',
  grace_period_days INT NOT NULL DEFAULT 0,
  updated_by VARCHAR(191) NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO identity_mfa_role_policies (role, mode, grace_period_days)
VALUES
  ('SUPERADMIN', 'REQUIRED', 0),
  ('PLATFORM_SUPERADMIN', 'REQUIRED', 0),
  ('FEDERATION_ADMIN', 'REQUIRED', 0),
  ('LEAGUE_ADMIN', 'REQUIRED', 0),
  ('ADMIN', 'OPTIONAL', 0),
  ('OBSERVATEUR', 'OPTIONAL', 0),
  ('MEMBER', 'OPTIONAL', 0),
  ('REFEREE', 'OPTIONAL', 0),
  ('MATCH_OFFICIAL', 'OPTIONAL', 0),
  ('REFEREE_OBSERVER', 'OPTIONAL', 0),
  ('PLAYER', 'OPTIONAL', 0)
ON DUPLICATE KEY UPDATE role = VALUES(role);
