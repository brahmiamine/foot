-- Ajoute le rôle PLAYER (espace joueur de `player-hub`) et la colonne de
-- liaison `player_id` (club-hub `Player.id`, même base "foot") à la table
-- `User` partagée. Additive uniquement : les rôles et colonnes existants ne
-- changent pas, les 6 autres apps clientes n'ont rien à modifier (elles
-- décodent le rôle du JWT comme une simple string, voir leur propre
-- src/lib/ssoSession.ts).
--
-- `player_id` reste NULL pour tout compte qui n'est pas PLAYER. Pas de
-- contrainte FK explicite vers `Player` (id) : `Player` est une table
-- possédée par club-hub, et identity ne référence par convention aucune
-- table propriété d'une autre app par contrainte SQL (même principe que
-- teamId -> Team), seulement par lecture applicative.

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
    'REFEREE_OBSERVER',
    'PLAYER'
  ) NOT NULL DEFAULT 'OBSERVATEUR';

ALTER TABLE `User`
  ADD COLUMN `player_id` VARCHAR(191) NULL AFTER `league_id`;

CREATE INDEX `idx_user_player_id` ON `User` (`player_id`);
