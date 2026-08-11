-- Invitation club (staff) en 2 temps (avancement.md § 2 « sso »). Table
-- propre à `sso` — aucune autre app n'y écrit ni ne la lit (voir
-- db/OWNERSHIP.md). `token_hash` est le SHA-256 du jeton brut envoyé par
-- email, jamais stocké en clair — même principe que password_reset_tokens.
--
-- Appliquée automatiquement en dev via start.sh (section « Correctif schéma
-- partagé ») ; ce fichier documente la même migration pour un environnement
-- où start.sh n'est pas utilisé.

USE foot;

CREATE TABLE IF NOT EXISTS club_invitations (
  id CHAR(36) NOT NULL DEFAULT uuid() PRIMARY KEY,
  email VARCHAR(191) NOT NULL,
  team_id VARCHAR(191) NOT NULL,
  role VARCHAR(20) NOT NULL,
  invited_by_user_id VARCHAR(191) NOT NULL,
  token_hash VARCHAR(191) NOT NULL,
  expires_at DATETIME NOT NULL,
  consumed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_club_invitations_invited_by FOREIGN KEY (invited_by_user_id) REFERENCES `User`(id) ON DELETE CASCADE,
  INDEX idx_club_invitations_email (email),
  INDEX idx_club_invitations_token_hash (token_hash),
  INDEX idx_club_invitations_team_id (team_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
