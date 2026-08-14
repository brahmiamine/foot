-- migration.md §6 (Phase 2) : historique de rattachement club <-> fédération
-- /ligue/saison. Nouvelle table, n'affecte aucune donnée existante.
-- `teams.federation_id` (lien courant, non historisé) n'est pas retiré ni
-- migré automatiquement : ce chantier ajoute une source de vérité
-- historique en parallèle, sans réécrire ce qui fonctionne déjà (voir
-- migration.md §25, "ne pas remplacer toutes les relations par de
-- nouvelles tables sans migration").
--
-- Pas de colonne `competition_id` : ce dépôt ne modélise pas de table
-- Competition séparée, voir federation-hub/src/lib/entities/TeamAffiliation.ts.
--
-- Au plus une ligne `ACTIVE` par club à la fois : invariant applicatif
-- (federation-hub/src/lib/teamAffiliations.ts), pas une contrainte SQL — MySQL/
-- MariaDB ne supporte pas nativement un index unique partiel (WHERE status
-- = 'ACTIVE'), même limitation déjà documentée pour `sp_inventory_items`
-- (voir TASK-P0-005, todo.md).

USE foot;

CREATE TABLE IF NOT EXISTS `team_affiliations` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `team_id` char(36) NOT NULL,
  `federation_id` char(36) NOT NULL,
  `league_id` char(36) DEFAULT NULL,
  `saison_id` char(36) DEFAULT NULL,
  `status` enum('ACTIVE','ENDED','SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` varchar(191) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_team_affiliations_team_status` (`team_id`, `status`),
  KEY `idx_team_affiliations_federation` (`federation_id`),
  KEY `idx_team_affiliations_league` (`league_id`),
  KEY `idx_team_affiliations_saison` (`saison_id`),
  CONSTRAINT `fk_team_affiliations_team` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_team_affiliations_federation` FOREIGN KEY (`federation_id`) REFERENCES `federations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_team_affiliations_league` FOREIGN KEY (`league_id`) REFERENCES `ligues` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_team_affiliations_saison` FOREIGN KEY (`saison_id`) REFERENCES `saisons` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
