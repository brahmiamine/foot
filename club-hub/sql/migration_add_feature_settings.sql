-- GOV-010 — feature settings par club, versionnés et résolus côté serveur.
-- L'absence de ligne conserve le comportement historique : module activé.
CREATE TABLE IF NOT EXISTS cms_feature_settings (
  id CHAR(36) NOT NULL,
  team_id CHAR(36) NOT NULL,
  feature ENUM('ACADEMY','RECRUITMENT','SPONSORING','TICKETING','MARKETPLACE') NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  version INT NOT NULL DEFAULT 1,
  effective_from DATETIME NULL,
  effective_until DATETIME NULL,
  updated_by VARCHAR(191) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_cms_feature_settings_version UNIQUE (team_id, feature, version),
  CONSTRAINT fk_cms_feature_settings_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  INDEX idx_cms_feature_settings_resolution (team_id, feature, effective_from, effective_until, version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
