-- TASK-P0-025 (portion scopée) : clé d'idempotence côté client pour les
-- événements saisis en direct (but, remplacement, blessure) — un
-- double-clic ou un retry réseau sur le même formulaire renvoie
-- désormais l'événement déjà créé plutôt que d'en créer un doublon (voir
-- GoalService/SubstitutionService/InjuryService.create). `Card` a déjà une
-- contrainte unique naturelle (playerId, matchId, type) et n'a pas besoin
-- de cette colonne. Additive, nullable — n'affecte aucune ligne existante ;
-- NULL n'entre jamais en collision sur l'index unique (sémantique NULL
-- distinct de MySQL/MariaDB).

USE foot;

ALTER TABLE ms_goals
  ADD COLUMN client_request_id CHAR(36) NULL AFTER is_penalty,
  ADD UNIQUE KEY uniq_ms_goals_sheet_client_request (sheet_id, client_request_id);

ALTER TABLE ms_substitutions
  ADD COLUMN client_request_id CHAR(36) NULL AFTER period,
  ADD UNIQUE KEY uniq_ms_subs_sheet_client_request (sheet_id, client_request_id);

ALTER TABLE ms_injuries
  ADD COLUMN client_request_id CHAR(36) NULL AFTER requires_substitution,
  ADD UNIQUE KEY uniq_ms_injuries_sheet_client_request (sheet_id, client_request_id);
