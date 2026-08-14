-- Réinitialisation de mot de passe (avancement.md, rang 8). Table propre à
-- `sso` — aucune autre app n'y écrit ni ne la lit (voir db/OWNERSHIP.md).
-- `token_hash` est le SHA-256 du jeton brut envoyé par email : la valeur
-- utilisable n'est donc jamais stockée en base, seule sa base compromise
-- ne suffirait pas à réinitialiser un mot de passe.

USE foot;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id CHAR(36) NOT NULL DEFAULT uuid() PRIMARY KEY,
  user_id VARCHAR(191) NOT NULL,
  token_hash VARCHAR(191) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_password_reset_tokens_user FOREIGN KEY (user_id) REFERENCES `User`(id) ON DELETE CASCADE,
  INDEX idx_password_reset_tokens_user_id (user_id),
  INDEX idx_password_reset_tokens_token_hash (token_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
