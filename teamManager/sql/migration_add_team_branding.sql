-- Migration : identité & apparence du club (module "Branding") — logique
-- multi-tenant : une seule application teamManager, mais chaque club voit
-- une interface personnalisée (logo, nom affiché, couleurs) après
-- connexion, résolue depuis son team_id.
--
-- On ne touche pas au référentiel partagé `teams` (nom officiel, logo déjà
-- existants, utilisés par ArbiNote/superadmin) : `cms_team_branding` ne
-- porte que des SURCHARGES optionnelles propres à teamManager (nom
-- affiché, logo clair/sombre, favicon, 3 couleurs). Toutes les colonnes
-- d'identité sont nullables : si absentes, l'application retombe sur
-- `teams.nom`/`teams.logo_url` (voir lib/branding.ts, resolveBranding()).
--
-- UNIQUE(team_id) : un club = une seule configuration graphique.

USE foot;

CREATE TABLE cms_team_branding (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  display_name VARCHAR(150) NULL,
  short_name VARCHAR(30) NULL,
  logo_url VARCHAR(500) NULL,
  logo_dark_url VARCHAR(500) NULL,
  favicon_url VARCHAR(500) NULL,
  primary_color CHAR(7) NOT NULL DEFAULT '#556ee6',
  secondary_color CHAR(7) NOT NULL DEFAULT '#74788d',
  accent_color CHAR(7) NOT NULL DEFAULT '#f1b44c',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_team_branding_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT uq_cms_team_branding_team UNIQUE (team_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
