-- Migration: officiels de la rencontre + contrôles d'identité/licences.
-- Additive, non destructive, à appliquer après migration_match-operations_init.sql.
--
-- ms_match_officials : arbitre central, assistants 1/2, 4e arbitre, délégué
-- principal — écran "Infos arbitre" de la FMI, à valider avant les
-- signatures avant-match.
-- ms_player_controls : contrôle du numéro de maillot / de l'identité de
-- chaque joueur inscrit sur la feuille — écran "Contrôles".

USE foot;

CREATE TABLE ms_match_officials (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  sheet_id BIGINT NOT NULL,
  role ENUM('REFEREE_CENTRAL','ASSISTANT_1','ASSISTANT_2','FOURTH_OFFICIAL','DELEGATE') NOT NULL,
  full_name VARCHAR(191) NULL,
  license_number VARCHAR(50) NULL,
  confirmed TINYINT(1) NOT NULL DEFAULT 0,
  confirmed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ms_officials_sheet FOREIGN KEY (sheet_id) REFERENCES ms_sheets(id) ON DELETE CASCADE,
  UNIQUE KEY uq_ms_officials_role (sheet_id, role),
  INDEX idx_ms_officials_sheet (sheet_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE ms_player_controls (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  sheet_id BIGINT NOT NULL,
  match_lineup_id BIGINT NOT NULL,
  checked TINYINT(1) NOT NULL DEFAULT 0,
  checked_at DATETIME NULL,
  note VARCHAR(255) NULL,
  CONSTRAINT fk_ms_controls_sheet FOREIGN KEY (sheet_id) REFERENCES ms_sheets(id) ON DELETE CASCADE,
  CONSTRAINT fk_ms_controls_lineup FOREIGN KEY (match_lineup_id) REFERENCES cms_match_lineups(id) ON DELETE CASCADE,
  UNIQUE KEY uq_ms_controls_lineup (sheet_id, match_lineup_id),
  INDEX idx_ms_controls_sheet (sheet_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
