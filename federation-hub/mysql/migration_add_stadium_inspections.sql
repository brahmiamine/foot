-- migration-v2.md P1-003 — homologation des stades. Réutilise `cms_stadiums`
-- (club-hub, référentiel riche des stades) : aucune duplication du
-- référentiel, uniquement l'acte d'inspection/homologation fédérale.

USE foot;

CREATE TABLE IF NOT EXISTS `stadium_inspections` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `stadium_id` bigint NOT NULL,
  `club_id` char(36) NOT NULL,
  `season_id` char(36) NOT NULL,
  `federation_id` char(36) NOT NULL,
  `league_id` char(36) DEFAULT NULL,
  `inspection_date` date NOT NULL,
  `inspector_user_id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `pitch_status` enum('OK','ISSUES','CRITICAL','NOT_APPLICABLE') NOT NULL DEFAULT 'OK',
  `lighting_status` enum('OK','ISSUES','CRITICAL','NOT_APPLICABLE') NOT NULL DEFAULT 'OK',
  `changing_rooms_status` enum('OK','ISSUES','CRITICAL','NOT_APPLICABLE') NOT NULL DEFAULT 'OK',
  `security_status` enum('OK','ISSUES','CRITICAL','NOT_APPLICABLE') NOT NULL DEFAULT 'OK',
  `capacity_status` enum('OK','ISSUES','CRITICAL','NOT_APPLICABLE') NOT NULL DEFAULT 'OK',
  `medical_status` enum('OK','ISSUES','CRITICAL','NOT_APPLICABLE') NOT NULL DEFAULT 'OK',
  `media_status` enum('OK','ISSUES','CRITICAL','NOT_APPLICABLE') NOT NULL DEFAULT 'OK',
  `var_status` enum('OK','ISSUES','CRITICAL','NOT_APPLICABLE') DEFAULT NULL,
  `observations` text DEFAULT NULL,
  `status` enum('PENDING','APPROVED','APPROVED_WITH_RESTRICTIONS','REJECTED','SUSPENDED','EXPIRED') NOT NULL DEFAULT 'PENDING',
  `expires_at` date DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_stadium_inspection_scope_status` (`federation_id`, `league_id`, `status`),
  KEY `idx_stadium_inspection_stadium` (`stadium_id`, `season_id`),
  KEY `idx_stadium_inspection_club` (`club_id`, `season_id`),
  CONSTRAINT `fk_stadium_inspection_stadium` FOREIGN KEY (`stadium_id`) REFERENCES `cms_stadiums` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_stadium_inspection_club` FOREIGN KEY (`club_id`) REFERENCES `teams` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_stadium_inspection_season` FOREIGN KEY (`season_id`) REFERENCES `saisons` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_stadium_inspection_federation` FOREIGN KEY (`federation_id`) REFERENCES `federations` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_stadium_inspection_league` FOREIGN KEY (`league_id`) REFERENCES `ligues` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_stadium_inspection_inspector` FOREIGN KEY (`inspector_user_id`) REFERENCES `User` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `stadium_restrictions` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `inspection_id` char(36) NOT NULL,
  `description` text NOT NULL,
  `lifted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_stadium_restriction_inspection` (`inspection_id`),
  CONSTRAINT `fk_stadium_restriction_inspection` FOREIGN KEY (`inspection_id`) REFERENCES `stadium_inspections` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `stadium_inspection_history` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `inspection_id` char(36) NOT NULL,
  `action` varchar(100) NOT NULL,
  `from_status` varchar(32) DEFAULT NULL,
  `to_status` varchar(32) DEFAULT NULL,
  `actor_user_id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `actor_role` varchar(50) NOT NULL,
  `reason` text DEFAULT NULL,
  `after_value` json DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(512) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_stadium_inspection_history` (`inspection_id`, `created_at`),
  CONSTRAINT `fk_stadium_inspection_history_inspection` FOREIGN KEY (`inspection_id`) REFERENCES `stadium_inspections` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_stadium_inspection_history_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `User` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
