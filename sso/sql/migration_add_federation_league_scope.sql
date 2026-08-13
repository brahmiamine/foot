-- migration.md §7-8 (modèle Fédération/Ligue/Club) : ajoute les rôles
-- cibles PLATFORM_SUPERADMIN/FEDERATION_ADMIN/LEAGUE_ADMIN à la table
-- `User` partagée, à côté des rôles historiques (ADMIN, OBSERVATEUR,
-- SUPERADMIN, MEMBER — inchangés, voir migration_add_member_role.sql),
-- et le scope fédéral/ligue nécessaire pour restreindre un compte
-- FEDERATION_ADMIN/LEAGUE_ADMIN à son périmètre (migration.md §3/§8).
--
-- Additive uniquement : les rôles/colonnes existants ne changent pas, les
-- 5 autres apps (matchsheet/arbinote/superadmin/teamManager/ob) décodent
-- déjà le rôle du JWT comme une simple string (voir leur src/lib/
-- ssoSession.ts), rien à modifier côté schéma pour elles. Les colonnes
-- `federation_id`/`league_id` restent NULL pour tout compte qui n'est ni
-- FEDERATION_ADMIN ni LEAGUE_ADMIN.

USE foot;

ALTER TABLE `User`
  MODIFY `role` ENUM(
    'ADMIN',
    'OBSERVATEUR',
    'SUPERADMIN',
    'MEMBER',
    'PLATFORM_SUPERADMIN',
    'FEDERATION_ADMIN',
    'LEAGUE_ADMIN'
  ) NOT NULL DEFAULT 'OBSERVATEUR';

ALTER TABLE `User`
  ADD COLUMN `federation_id` VARCHAR(191) NULL AFTER `teamId`,
  ADD COLUMN `league_id` VARCHAR(191) NULL AFTER `federation_id`;

-- Pas de contrainte FK vers `federations`/`ligues` : ces tables sont
-- possédées par `superadmin` (voir db/OWNERSHIP.md), `User` par `sso` —
-- une FK cross-app romprait l'indépendance de déploiement/migration des
-- deux bases logiques déjà documentée pour teamId/teams (aucune FK
-- existante non plus entre User.teamId et teams.id). L'intégrité
-- référentielle est du ressort applicatif (voir packages/auth-shared/src/
-- roles.ts, canAccessFederation/canAccessLeague, qui relit toujours la
-- ressource cible plutôt que de faire confiance au seul scope du JWT).
CREATE INDEX `idx_user_federation_id` ON `User` (`federation_id`);
CREATE INDEX `idx_user_league_id` ON `User` (`league_id`);
