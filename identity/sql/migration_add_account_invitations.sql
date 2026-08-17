-- Invitations de comptes provisionnés par les domaines (ID-001).
-- Identity reste l'unique propriétaire des credentials et jetons d'activation.
-- Le token brut n'est jamais stocké : seule son empreinte SHA-256 est persistée.

USE foot;

CREATE TABLE IF NOT EXISTS account_invitations (
  id CHAR(36) NOT NULL DEFAULT uuid() PRIMARY KEY,
  user_id VARCHAR(191) NOT NULL,
  purpose VARCHAR(40) NOT NULL,
  token_hash VARCHAR(191) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  invited_by_user_id VARCHAR(191) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_account_invitations_user FOREIGN KEY (user_id) REFERENCES `User`(id) ON DELETE CASCADE,
  UNIQUE KEY uq_account_invitations_token_hash (token_hash),
  INDEX idx_account_invitations_user (user_id),
  INDEX idx_account_invitations_expiry (expires_at, used_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
