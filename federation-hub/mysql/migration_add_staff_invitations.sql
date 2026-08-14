-- Invitation club (staff) en 2 temps (avancement.md) : un compte
-- ADMIN/OBSERVATEUR était créé "à la main" — federation-hub choisissait le mot
-- de passe lui-même et le communiquait hors plateforme. Remplacé par une
-- invitation par email à usage unique : `federation-hub` crée l'invitation
-- (sans mot de passe), le destinataire choisit lui-même son mot de passe en
-- l'acceptant. Table propre à `federation-hub`, qui gère déjà `User` pour les
-- comptes club (voir db/OWNERSHIP.md, "Comptes et sessions" — écrit aussi
-- par federation-hub pour ce cas précis, pas seulement lu).

USE foot;

CREATE TABLE IF NOT EXISTS staff_invitations (
  id CHAR(36) NOT NULL DEFAULT uuid() PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  name VARCHAR(191) NOT NULL,
  email VARCHAR(191) NOT NULL,
  role ENUM('ADMIN','OBSERVATEUR') NOT NULL,
  token_hash VARCHAR(191) NOT NULL,
  expires_at DATETIME NOT NULL,
  accepted_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_staff_invitations_team_id (team_id),
  INDEX idx_staff_invitations_token_hash (token_hash),
  INDEX idx_staff_invitations_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
