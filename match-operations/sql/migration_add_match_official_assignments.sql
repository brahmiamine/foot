-- migration.md §11 (Phase 4) : identité officielle de match, distincte de
-- ms_match_officials (saisie libre existante, voir
-- migration_match-operations_officials_controls.sql) — ici, un vrai lien vers un
-- compte SSO (user_id) affecté par la fédération/ligue, vérifié avant tout
-- accès aux routes de match par un compte REFEREE/MATCH_OFFICIAL/
-- REFEREE_OBSERVER (voir src/middleware.ts, [matchId]/layout.tsx).
-- Additive, n'affecte aucune donnée/table existante.

USE foot;

CREATE TABLE IF NOT EXISTS match_official_assignments (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  match_id CHAR(36) NOT NULL,
  user_id VARCHAR(191) NOT NULL,
  referee_id VARCHAR(191) NULL,
  role ENUM('CENTER_REFEREE', 'ASSISTANT_REFEREE', 'FOURTH_OFFICIAL', 'MATCH_DELEGATE', 'REFEREE_OBSERVER', 'TEAM_REPRESENTATIVE') NOT NULL,
  status ENUM('ACTIVE', 'REVOKED') NOT NULL DEFAULT 'ACTIVE',
  assigned_by VARCHAR(191) NULL,
  assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_by VARCHAR(191) NULL,
  revoked_at DATETIME NULL,
  CONSTRAINT fk_match_official_assignments_match FOREIGN KEY (match_id) REFERENCES matches (id) ON DELETE CASCADE,
  INDEX idx_moa_match (match_id),
  INDEX idx_moa_user_match (user_id, match_id),
  INDEX idx_moa_match_status (match_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
