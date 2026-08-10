-- Migration : compétitions internes du club + événements de match +
-- classements calculés — vague suivante de la refonte architecturale.
--
--   - `saisons`/`journees`/`ligues`/`matches` : calendrier FÉDÉRAL partagé
--     (ArbiNote/superadmin), NON MODIFIÉ.
--   - `cms_competitions`   : compétition organisée par le CLUB lui-même
--     (tournoi interne, coupe amicale, série de matchs amicaux groupés),
--     NOUVEAU, indépendante du calendrier fédéral.
--   - `cms_competition_participants` : participant à une compétition club —
--     soit une équipe interne du club (cms_teams), soit un club externe du
--     référentiel partagé `teams`, soit un nom libre (adversaire non
--     référencé). Permet un tournoi entre plusieurs de nos propres équipes
--     internes (ex: U17 A vs U17 B) aussi bien qu'une coupe amicale externe.
--   - `cms_friendly_matches` reçoit 3 colonnes nullables (competition_id,
--     home_participant_id, away_participant_id) : un match amical existant
--     reste valable tel quel (adversaire via opponent_team_id/opponent_name
--     + is_home), et devient en plus rattachable à une compétition/à des
--     participants pour calculer un classement.
--   - `cms_match_events` : événements de match horodatés (but, but contre
--     son camp, passe décisive, carton, entrée/sortie) pour un match
--     officiel (table partagée `matches`, lecture seule) ou amical
--     (`cms_friendly_matches`), jamais les deux à la fois. Base pour
--     remplacer à terme la saisie manuelle de `cms_player_stats`, qui reste
--     utilisable en parallèle (aucune suppression).
--
-- Toutes les tables/colonnes sont additives, aucune table partagée avec
-- cardManager/ArbiNote/matchsheet/superadmin n'est modifiée.

USE foot;

-- ---------------------------------------------------------------------
-- 1. Compétitions internes organisées par le club
-- ---------------------------------------------------------------------

CREATE TABLE cms_competitions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  season_id BIGINT NULL,
  name VARCHAR(150) NOT NULL,
  type ENUM('TOURNAMENT', 'CUP', 'INTERNAL_LEAGUE', 'FRIENDLY_SERIES', 'OTHER') NOT NULL DEFAULT 'TOURNAMENT',
  category ENUM(
    'seniors',
    'u21', 'u20', 'u19', 'u18', 'u17', 'u16', 'u15', 'u14', 'u13',
    'u12', 'u11', 'u10', 'u9', 'u8', 'u7'
  ) NULL,
  format ENUM('LEAGUE', 'GROUPS', 'KNOCKOUT') NOT NULL DEFAULT 'LEAGUE',
  points_win INT NOT NULL DEFAULT 3,
  points_draw INT NOT NULL DEFAULT 1,
  points_loss INT NOT NULL DEFAULT 0,
  status ENUM('PLANNED', 'ACTIVE', 'FINISHED') NOT NULL DEFAULT 'PLANNED',
  start_date DATE NULL,
  end_date DATE NULL,
  notes VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_competitions_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_competitions_season FOREIGN KEY (season_id) REFERENCES cms_seasons(id) ON DELETE SET NULL,
  INDEX idx_cms_competitions_team (team_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE cms_competition_participants (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  competition_id BIGINT NOT NULL,
  internal_team_id BIGINT NULL,
  external_team_id CHAR(36) NULL,
  external_name VARCHAR(200) NULL,
  logo_url VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_competition_participants_competition FOREIGN KEY (competition_id) REFERENCES cms_competitions(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_competition_participants_internal_team FOREIGN KEY (internal_team_id) REFERENCES cms_teams(id) ON DELETE SET NULL,
  CONSTRAINT fk_cms_competition_participants_external_team FOREIGN KEY (external_team_id) REFERENCES teams(id) ON DELETE SET NULL,
  CONSTRAINT chk_cms_competition_participants_identity CHECK (
    internal_team_id IS NOT NULL OR external_team_id IS NOT NULL OR external_name IS NOT NULL
  ),
  INDEX idx_cms_competition_participants_competition (competition_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ---------------------------------------------------------------------
-- 2. Rattachement optionnel des matchs amicaux à une compétition club,
--    avec identification des deux participants pour le calcul du
--    classement (indépendant de is_home/opponent_* qui restent utilisés
--    pour un match amical isolé, hors compétition).
-- ---------------------------------------------------------------------

ALTER TABLE cms_friendly_matches
  ADD COLUMN competition_id BIGINT NULL AFTER season_id,
  ADD COLUMN home_participant_id BIGINT NULL AFTER competition_id,
  ADD COLUMN away_participant_id BIGINT NULL AFTER home_participant_id;

ALTER TABLE cms_friendly_matches
  ADD CONSTRAINT fk_cms_friendly_matches_competition FOREIGN KEY (competition_id) REFERENCES cms_competitions(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_cms_friendly_matches_home_participant FOREIGN KEY (home_participant_id) REFERENCES cms_competition_participants(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_cms_friendly_matches_away_participant FOREIGN KEY (away_participant_id) REFERENCES cms_competition_participants(id) ON DELETE SET NULL,
  ADD INDEX idx_cms_friendly_matches_competition (competition_id);

-- ---------------------------------------------------------------------
-- 3. Événements de match horodatés (but, passe décisive, cartons,
--    changements) — match officiel (lecture seule, table `matches`) ou
--    amical (`cms_friendly_matches`), jamais les deux à la fois.
-- ---------------------------------------------------------------------

CREATE TABLE cms_match_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  match_type ENUM('OFFICIAL', 'FRIENDLY') NOT NULL,
  match_id CHAR(36) NULL,
  friendly_match_id BIGINT NULL,
  event_type ENUM(
    'GOAL', 'OWN_GOAL', 'ASSIST', 'YELLOW_CARD', 'RED_CARD',
    'SUBSTITUTION_IN', 'SUBSTITUTION_OUT', 'INJURY'
  ) NOT NULL,
  team_side ENUM('HOME', 'AWAY') NOT NULL,
  player_id VARCHAR(191) NULL,
  related_player_id VARCHAR(191) NULL,
  minute INT NULL,
  notes VARCHAR(255) NULL,
  created_by VARCHAR(191) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_match_events_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_match_events_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_match_events_friendly_match FOREIGN KEY (friendly_match_id) REFERENCES cms_friendly_matches(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_match_events_player FOREIGN KEY (player_id) REFERENCES Player(id) ON DELETE SET NULL,
  CONSTRAINT fk_cms_match_events_related_player FOREIGN KEY (related_player_id) REFERENCES Player(id) ON DELETE SET NULL,
  CONSTRAINT fk_cms_match_events_created_by FOREIGN KEY (created_by) REFERENCES User(id) ON DELETE SET NULL,
  CONSTRAINT chk_cms_match_events_target CHECK (
    (match_type = 'OFFICIAL' AND match_id IS NOT NULL AND friendly_match_id IS NULL) OR
    (match_type = 'FRIENDLY' AND friendly_match_id IS NOT NULL AND match_id IS NULL)
  ),
  INDEX idx_cms_match_events_official (match_id),
  INDEX idx_cms_match_events_friendly (friendly_match_id),
  INDEX idx_cms_match_events_player (player_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
