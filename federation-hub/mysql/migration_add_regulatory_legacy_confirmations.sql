-- migration-v2 §36 : transition explicite des données historiques vers le
-- nouveau modèle réglementaire sans rendre immédiatement tous les joueurs
-- existants inéligibles. Une confirmation legacy ne neutralise jamais une
-- suspension, un transfert, l'appartenance au club ou la catégorie d'âge :
-- elle remplace uniquement les nouvelles pièces administratives absentes
-- pendant la période de transition.
USE foot;

CREATE TABLE IF NOT EXISTS regulatory_legacy_confirmations (
  id char(36) NOT NULL DEFAULT uuid(),
  player_id varchar(191) NOT NULL,
  club_id char(36) NOT NULL,
  season_id char(36) NOT NULL,
  source enum('LEGACY_BACKFILL','MANUAL') NOT NULL DEFAULT 'LEGACY_BACKFILL',
  reason text DEFAULT NULL,
  expires_at date DEFAULT NULL,
  created_by varchar(191) NOT NULL DEFAULT 'migration_v2_legacy_backfill',
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_regulatory_legacy_player_club_season (player_id, club_id, season_id),
  KEY idx_regulatory_legacy_lookup (club_id, season_id, player_id, expires_at),
  CONSTRAINT fk_regulatory_legacy_club FOREIGN KEY (club_id) REFERENCES teams(id) ON DELETE RESTRICT,
  CONSTRAINT fk_regulatory_legacy_season FOREIGN KEY (season_id) REFERENCES saisons(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Backfill conservateur et idempotent : on confirme uniquement un joueur qui
-- appartenait effectivement au club à la date d'au moins un match de la saison.
-- La confirmation expire avec la saison et ne s'étend donc jamais à une saison
-- future sans nouvelle validation réglementaire.
INSERT IGNORE INTO regulatory_legacy_confirmations (
  id, player_id, club_id, season_id, source, reason, expires_at, created_by
)
SELECT DISTINCT
  UUID(),
  tm.player_id,
  tm.team_id,
  j.saison_id,
  'LEGACY_BACKFILL',
  'Backfill from historical cms_team_members + scheduled matches',
  s.date_fin,
  'migration_v2_legacy_backfill'
FROM cms_team_members tm
JOIN matches m
  ON (m.equipe_home = tm.team_id OR m.equipe_away = tm.team_id)
JOIN journees j ON j.id = m.journee_id
JOIN saisons s ON s.id = j.saison_id
WHERE tm.player_id IS NOT NULL
  AND tm.start_date <= DATE(COALESCE(m.date, CURRENT_TIMESTAMP))
  AND (tm.end_date IS NULL OR tm.end_date >= DATE(COALESCE(m.date, CURRENT_TIMESTAMP)));
