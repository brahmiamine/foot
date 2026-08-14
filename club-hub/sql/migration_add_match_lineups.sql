-- Migration: composition d'équipe par match (titulaires / remplaçants),
-- gérée depuis club-hub, consommée par le nouveau projet "match-operations"
-- (feuille de match) pour afficher la composition avant le coup d'envoi.

USE foot;

CREATE TABLE cms_match_lineups (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  match_id CHAR(36) NOT NULL,
  player_id VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  role ENUM('STARTER','SUBSTITUTE') NOT NULL DEFAULT 'STARTER',
  shirt_number INT NULL,
  position VARCHAR(50) NULL,
  is_captain TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_match_lineups_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_match_lineups_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_match_lineups_player FOREIGN KEY (player_id) REFERENCES Player(id) ON DELETE CASCADE,
  CONSTRAINT uq_cms_match_lineups_match_player UNIQUE (match_id, player_id),
  INDEX idx_cms_match_lineups_team (team_id),
  INDEX idx_cms_match_lineups_match (match_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
