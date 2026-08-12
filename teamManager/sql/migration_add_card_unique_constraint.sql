-- `Card` a deux écrivains (teamManager et matchsheet, voir
-- db/OWNERSHIP.md § « Card a deux écrivains ») sans verrou de concurrence
-- (voir avancement.md). Ajoute une contrainte UNIQUE(playerId, matchId,
-- type) : un joueur ne peut avoir qu'un seul carton d'un type donné par
-- match (règle déjà appliquée en application côté CardService.create et
-- CardEventService.create, voir ces fichiers) — ceci en fait le filet de
-- sécurité au niveau base contre une vraie course entre les deux apps.
--
-- Cette migration doit être appliquée identiquement côté matchsheet (voir
-- matchsheet/sql/migration_add_card_unique_constraint.sql, même fichier) —
-- les deux apps écrivent dans la même table `Card`.
--
-- Si cette migration échoue avec une erreur de duplicata, c'est qu'il
-- existe déjà des cartons en double (playerId, matchId, type) en base :
-- les identifier et corriger manuellement avant de réessayer, par exemple :
--   SELECT playerId, matchId, type, COUNT(*) FROM `Card`
--   GROUP BY playerId, matchId, type HAVING COUNT(*) > 1;

USE foot;

ALTER TABLE `Card`
  ADD UNIQUE INDEX uq_card_player_match_type (playerId, matchId, type);
