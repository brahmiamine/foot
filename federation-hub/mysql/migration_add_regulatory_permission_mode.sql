-- FED-011 (platform-governance-roadmap.md, section N) : mode de migration
-- global des permissions réglementaires fines (LEGACY/WARN/ENFORCE), pour un
-- passage contrôlé vers une whitelist complète.
--   - LEGACY (défaut, comportement historique inchangé) : un compte sans
--     aucune ligne dans regulatory_user_permissions garde tous ses droits.
--   - WARN : évalue comme si la whitelist était déjà stricte (compte sans
--     ligne = refusé) mais n'empêche rien — journalise seulement dans
--     regulatory_permission_warnings, pour mesurer l'impact avant bascule.
--   - ENFORCE : la whitelist stricte est réellement appliquée pour tous les
--     comptes, y compris ceux sans aucune ligne configurée.
-- Voir federation-hub/src/lib/regulatoryPermissions.ts.

CREATE TABLE IF NOT EXISTS regulatory_permission_mode_settings (
  id VARCHAR(20) NOT NULL PRIMARY KEY,
  mode ENUM('LEGACY','WARN','ENFORCE') NOT NULL DEFAULT 'LEGACY',
  updated_by VARCHAR(191) NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS regulatory_permission_warnings (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(191) NOT NULL,
  permission VARCHAR(191) NOT NULL,
  pathname VARCHAR(500) NULL,
  occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_regulatory_permission_warnings_user (user_id, occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
