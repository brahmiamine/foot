-- Module transferts (avancement.md) : superadmin peut transférer un
-- joueur d'un club à un autre, avec un historique consultable. `Player`
-- (référentiel effectif club) reste possédé par `teamManager` (voir
-- db/OWNERSHIP.md) — ce module n'écrit que sa colonne `teamId`, sur le même
-- modèle que le double-écrivain déjà documenté pour `Card`
-- (teamManager + matchsheet) : toute évolution du schéma de `Player` doit
-- rester validée par les deux apps.
--
-- `player_transfers` est une table propre à `superadmin`, qui journalise
-- déjà les comptes club (`staff_invitations`) et les actions admin
-- (`audit_logs`) — cohérent avec le rôle de superadmin comme autorité
-- centrale de la fédération pour ce type d'opération administrative
-- (à la différence de la gestion quotidienne de l'effectif, qui reste dans
-- teamManager).
--
-- `player_name_fr`/`player_number` sont des instantanés pris au moment du
-- transfert (pas une jointure vive) : l'historique reste lisible même si le
-- joueur est plus tard retiré ou renommé côté teamManager.

USE foot;

CREATE TABLE IF NOT EXISTS player_transfers (
  id CHAR(36) NOT NULL DEFAULT uuid() PRIMARY KEY,
  -- FK logique vers Player.id (table teamManager) — jamais de contrainte FK
  -- réelle cross-connexion, même convention que le reste du dépôt.
  player_id VARCHAR(191) NOT NULL,
  player_name_fr VARCHAR(383) NOT NULL,
  player_number INT NULL,
  -- FK logique vers teams.id (référentiel superadmin, celui-là réellement
  -- possédé par cette app).
  from_team_id CHAR(36) NOT NULL,
  to_team_id CHAR(36) NOT NULL,
  note TEXT NULL,
  -- User.id (sso, superadmin) qui a effectué le transfert.
  performed_by VARCHAR(191) NULL,
  transferred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_player_transfers_player_id (player_id),
  INDEX idx_player_transfers_from_team_id (from_team_id),
  INDEX idx_player_transfers_to_team_id (to_team_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
