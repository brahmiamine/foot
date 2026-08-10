-- Migration: rendre la table partagée `teams` générique pour n'importe quel
-- club de football, toutes catégories (U7 -> Seniors) et tous les genres
-- (homme / femme / mixte).
--
-- Table PARTAGÉE avec ArbiNote, SuperAdmin (référentiel) et matchsheet
-- (même base "foot", mêmes UUID). Changements strictement additifs et non
-- destructifs :
--   - age_category: on AJOUTE des valeurs d'enum (u7..u12) sans toucher aux
--     valeurs existantes (seniors..u13) ni à leur ordre relatif.
--   - gender: nouvelle colonne NOT NULL avec DEFAULT 'male', donc toutes les
--     lignes existantes restent valides sans backfill manuel et le
--     comportement actuel (équipes non genrées = considérées "male") est
--     préservé pour les autres apps qui ne connaissent pas encore ce champ.
--
-- Ne JAMAIS supprimer/renommer une valeur d'enum ici : d'autres apps
-- (ArbiNote, SuperAdmin, matchsheet) lisent/écrivent cette même colonne.

ALTER TABLE `teams`
  MODIFY COLUMN `age_category` ENUM(
    'seniors',
    'u21', 'u20', 'u19', 'u18', 'u17', 'u16', 'u15', 'u14', 'u13',
    'u12', 'u11', 'u10', 'u9', 'u8', 'u7'
  ) NOT NULL DEFAULT 'seniors';

ALTER TABLE `teams`
  ADD COLUMN `gender` ENUM('male', 'female', 'mixed') NOT NULL DEFAULT 'male' AFTER `age_category`;

ALTER TABLE `teams`
  ADD INDEX `idx_teams_gender` (`gender`);

-- NB: la gestion des compétitions (championnat / coupe / tournois) est déjà
-- générique côté DB : voir `saisons.type_competition` (championnat|coupe|
-- tournois) relié à `ligues` -> `federations`, et `journees.saison_id`.
-- Aucun changement de schéma n'est nécessaire pour ce point ; seule
-- l'app teamManager ne consomme pas encore ces tables (elle ne lit que
-- `journees.numero`), ce qui est un sujet applicatif séparé, pas un
-- problème de généricité du schéma.
