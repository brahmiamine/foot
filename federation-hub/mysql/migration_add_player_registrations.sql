-- migration-v2.md P0-003 — enregistrement réglementaire des joueurs.
-- Dans ce dépôt, `saisons` représente déjà l'édition d'une compétition
-- (`type_competition` + `league_id`) : aucune table Competition n'est dupliquée.

USE foot;

CREATE TABLE IF NOT EXISTS `player_registrations` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `player_id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `club_id` char(36) NOT NULL,
  `season_id` char(36) NOT NULL,
  `federation_id` char(36) NOT NULL,
  `league_id` char(36) DEFAULT NULL,
  `license_id` char(36) NOT NULL,
  `contract_id` char(36) DEFAULT NULL,
  `registered_at` datetime DEFAULT NULL,
  `status` enum('DRAFT','SUBMITTED','APPROVED','REJECTED','SUSPENDED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  `eligibility_status` enum('ELIGIBLE','INELIGIBLE','PENDING') NOT NULL DEFAULT 'PENDING',
  `validated_by` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `validated_at` datetime DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_player_registration_scope` (`player_id`, `club_id`, `season_id`),
  KEY `idx_player_registration_scope_status` (`federation_id`, `league_id`, `status`),
  KEY `idx_player_registration_club_season` (`club_id`, `season_id`, `status`),
  KEY `idx_player_registration_license` (`license_id`),
  CONSTRAINT `fk_player_registration_player` FOREIGN KEY (`player_id`) REFERENCES `Player` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_player_registration_club` FOREIGN KEY (`club_id`) REFERENCES `teams` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_player_registration_season` FOREIGN KEY (`season_id`) REFERENCES `saisons` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_player_registration_federation` FOREIGN KEY (`federation_id`) REFERENCES `federations` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_player_registration_league` FOREIGN KEY (`league_id`) REFERENCES `ligues` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_player_registration_license` FOREIGN KEY (`license_id`) REFERENCES `person_licenses` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_player_registration_validator` FOREIGN KEY (`validated_by`) REFERENCES `User` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `player_registration_history` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `registration_id` char(36) NOT NULL,
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
  KEY `idx_player_registration_history` (`registration_id`, `created_at`),
  CONSTRAINT `fk_player_registration_history_registration` FOREIGN KEY (`registration_id`) REFERENCES `player_registrations` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_player_registration_history_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `User` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
