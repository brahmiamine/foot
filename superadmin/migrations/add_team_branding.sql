-- Migration : identité visuelle par club (ClubBranding), résolue
-- dynamiquement par les apps génériques à partir du teamId du contexte
-- authentifié. Voir README racine, section « Classification des projets ».
-- Additive, une ligne optionnelle par club (absence = branding par défaut
-- côté app consommatrice).

USE foot;

CREATE TABLE IF NOT EXISTS team_branding (
  team_id CHAR(36) NOT NULL PRIMARY KEY,
  favicon_url TEXT NULL,
  primary_color VARCHAR(16) NULL,
  secondary_color VARCHAR(16) NULL,
  accent_color VARCHAR(16) NULL,
  font VARCHAR(191) NULL,
  metadata JSON NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_team_branding_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
