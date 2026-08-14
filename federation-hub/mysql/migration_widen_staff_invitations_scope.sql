-- migration.md §0 (provisioning) : élargit le flux d'invitation staff
-- existant (jusqu'ici ADMIN/OBSERVATEUR d'un club uniquement) aux nouveaux
-- rôles du modèle Fédération/Ligue/Club — FEDERATION_ADMIN, LEAGUE_ADMIN,
-- REFEREE, MATCH_OFFICIAL, REFEREE_OBSERVER (déjà dans l'enum `User.role`
-- de sso depuis les migrations Phase 1/4). PLATFORM_SUPERADMIN volontairement
-- exclu de ce flux self-service (compte le plus privilégié, provisionné
-- autrement).
--
-- Additive/élargissante uniquement : team_id devient nullable (les rôles
-- non-club n'en ont pas), federation_id/league_id ajoutés en option selon
-- le rôle. Les invitations club existantes (team_id renseigné) ne changent
-- pas de comportement.

USE foot;

ALTER TABLE `staff_invitations`
  MODIFY `team_id` CHAR(36) NULL,
  ADD COLUMN `federation_id` CHAR(36) NULL AFTER `team_id`,
  ADD COLUMN `league_id` CHAR(36) NULL AFTER `federation_id`,
  MODIFY `role` ENUM(
    'ADMIN',
    'OBSERVATEUR',
    'FEDERATION_ADMIN',
    'LEAGUE_ADMIN',
    'REFEREE',
    'MATCH_OFFICIAL',
    'REFEREE_OBSERVER'
  ) NOT NULL;
