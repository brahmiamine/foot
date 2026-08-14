-- migration-v2.md P0-009 — sanctions clubs et interdictions de recrutement.
-- `competitionId` du document est couvert par `season_id` (voir
-- migration_add_player_registrations.sql : `saisons` est déjà l'édition de
-- compétition dans ce dépôt, aucune table Competition séparée).
-- `source_case_id` est une référence polymorphe optionnelle vers un futur
-- `legal_cases`/`disciplinary_cases` (P0-010/P1-007) : pas de FK stricte,
-- comme le pattern déjà utilisé pour `person_licenses.person_reference_id`.

USE foot;

CREATE TABLE IF NOT EXISTS `club_sanctions` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `club_id` char(36) NOT NULL,
  `season_id` char(36) DEFAULT NULL,
  `federation_id` char(36) NOT NULL,
  `league_id` char(36) DEFAULT NULL,
  `source_case_type` enum('LEGAL_CASE','DISCIPLINARY_CASE','MANUAL') NOT NULL DEFAULT 'MANUAL',
  `source_case_id` char(36) DEFAULT NULL,
  `type` enum('TRANSFER_BAN','REGISTRATION_BAN','COMPETITION_BAN','FINE','POINT_DEDUCTION','MATCH_BEHIND_CLOSED_DOORS','STADIUM_SUSPENSION','COMPETITION_EXCLUSION','WARNING') NOT NULL,
  `reason` text NOT NULL,
  `starts_at` datetime NOT NULL,
  `ends_at` datetime DEFAULT NULL,
  `amount_due` decimal(15,3) DEFAULT NULL,
  `currency` char(3) DEFAULT NULL,
  `status` enum('ACTIVE','SUSPENDED','LIFTED','EXPIRED','CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  `lifted_at` datetime DEFAULT NULL,
  `lifted_by` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lift_reason` text DEFAULT NULL,
  `created_by` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_club_sanction_scope_status` (`federation_id`, `league_id`, `status`),
  KEY `idx_club_sanction_club_status` (`club_id`, `status`, `type`),
  KEY `idx_club_sanction_season` (`season_id`),
  KEY `idx_club_sanction_source` (`source_case_type`, `source_case_id`),
  CONSTRAINT `fk_club_sanction_club` FOREIGN KEY (`club_id`) REFERENCES `teams` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_club_sanction_season` FOREIGN KEY (`season_id`) REFERENCES `saisons` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_club_sanction_federation` FOREIGN KEY (`federation_id`) REFERENCES `federations` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_club_sanction_league` FOREIGN KEY (`league_id`) REFERENCES `ligues` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_club_sanction_creator` FOREIGN KEY (`created_by`) REFERENCES `User` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_club_sanction_lifter` FOREIGN KEY (`lifted_by`) REFERENCES `User` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `club_sanction_history` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `sanction_id` char(36) NOT NULL,
  `action` varchar(100) NOT NULL,
  `from_status` varchar(32) DEFAULT NULL,
  `to_status` varchar(32) DEFAULT NULL,
  `actor_user_id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `actor_role` varchar(50) NOT NULL,
  `reason` text DEFAULT NULL,
  `before_value` json DEFAULT NULL,
  `after_value` json DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(512) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_club_sanction_history` (`sanction_id`, `created_at`),
  CONSTRAINT `fk_club_sanction_history_sanction` FOREIGN KEY (`sanction_id`) REFERENCES `club_sanctions` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_club_sanction_history_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `User` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
