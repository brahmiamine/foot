-- migration.md §7/§11 (Phase 4) : ajoute les rôles d'officiel de match
-- REFEREE/MATCH_OFFICIAL/REFEREE_OBSERVER à la table `User` partagée.
-- Additive uniquement : les rôles existants et leurs contraintes ne
-- changent pas. Ces comptes n'ont pas de `teamId` (voir
-- matchsheet/src/middleware.ts) — leur périmètre réel est vérifié match
-- par match via `match_official_assignments`
-- (matchsheet/sql/migration_add_match_official_assignments.sql), jamais
-- uniquement par la présence de ce rôle dans le JWT.

USE foot;

ALTER TABLE `User`
  MODIFY `role` ENUM(
    'ADMIN',
    'OBSERVATEUR',
    'SUPERADMIN',
    'MEMBER',
    'PLATFORM_SUPERADMIN',
    'FEDERATION_ADMIN',
    'LEAGUE_ADMIN',
    'REFEREE',
    'MATCH_OFFICIAL',
    'REFEREE_OBSERVER'
  ) NOT NULL DEFAULT 'OBSERVATEUR';
