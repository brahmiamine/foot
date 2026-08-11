-- Phase 3 : stats publiques (#22). Les événements de match (buts, cartons,
-- remplacements, compositions) et les stats saison par joueur existent déjà
-- dans matchsheet (`ms_goals`, `ms_substitutions`, `Card`) et teamManager
-- (`cms_match_lineups`, `cms_player_stats`) — `ob` les lit en lecture seule
-- (voir les entités MsGoal/MsSubstitution/MatchCard/MatchLineup/
-- PlayerSeasonStat), rien à migrer pour ça.
--
-- Seules les stats post-match agrégées (possession, tirs, corners, fautes)
-- n'existent nulle part ailleurs : nouvelle table, saisie par le staff.

USE foot;

CREATE TABLE ob_match_stats (
  match_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci NOT NULL PRIMARY KEY,
  possession_home INT NULL,
  possession_away INT NULL,
  shots_home INT NULL,
  shots_away INT NULL,
  shots_on_target_home INT NULL,
  shots_on_target_away INT NULL,
  corners_home INT NULL,
  corners_away INT NULL,
  fouls_home INT NULL,
  fouls_away INT NULL,
  updated_by VARCHAR(191) NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
