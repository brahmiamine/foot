-- Migration : statistiques joueur saisies/importées par le staff (minutes,
-- buts, passes décisives, cartons, blessures, présence aux entraînements).
-- Une ligne = une entrée (liée à un match officiel/amical si pertinent, ou
-- à une saison pour une saisie/import agrégé). Additive, propre à
-- teamManager, scopée par team_id.

USE foot;

CREATE TABLE cms_player_stats (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  player_id VARCHAR(191) NOT NULL,
  match_type ENUM('OFFICIAL', 'FRIENDLY') NULL,
  match_id CHAR(36) NULL,
  friendly_match_id BIGINT NULL,
  season VARCHAR(20) NULL,
  minutes_played INT NOT NULL DEFAULT 0,
  goals INT NOT NULL DEFAULT 0,
  assists INT NOT NULL DEFAULT 0,
  yellow_cards INT NOT NULL DEFAULT 0,
  red_cards INT NOT NULL DEFAULT 0,
  injuries_count INT NOT NULL DEFAULT 0,
  trainings_attended INT NOT NULL DEFAULT 0,
  trainings_total INT NOT NULL DEFAULT 0,
  notes VARCHAR(500) NULL,
  created_by VARCHAR(191) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_player_stats_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_player_stats_player FOREIGN KEY (player_id) REFERENCES Player(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_player_stats_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE SET NULL,
  CONSTRAINT fk_cms_player_stats_friendly_match FOREIGN KEY (friendly_match_id) REFERENCES cms_friendly_matches(id) ON DELETE SET NULL,
  CONSTRAINT fk_cms_player_stats_creator FOREIGN KEY (created_by) REFERENCES User(id) ON DELETE SET NULL,
  INDEX idx_cms_player_stats_team_player (team_id, player_id),
  INDEX idx_cms_player_stats_season (team_id, season)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
