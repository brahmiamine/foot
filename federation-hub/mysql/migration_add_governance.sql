-- migration-v2.md P1-002 — gouvernance et comité directeur des clubs.

USE foot;

CREATE TABLE IF NOT EXISTS `club_board_mandates` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `club_id` char(36) NOT NULL,
  `federation_id` char(36) NOT NULL,
  `league_id` char(36) DEFAULT NULL,
  `starts_at` date NOT NULL,
  `ends_at` date NOT NULL,
  `status` enum('DRAFT','SUBMITTED','VALIDATED','REJECTED','ENDED') NOT NULL DEFAULT 'DRAFT',
  `election_document_url` text DEFAULT NULL,
  `submitted_at` datetime DEFAULT NULL,
  `federation_validated_at` datetime DEFAULT NULL,
  `validated_by` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `created_by` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_board_mandate_scope_status` (`federation_id`, `league_id`, `status`),
  KEY `idx_board_mandate_club` (`club_id`, `status`),
  CONSTRAINT `fk_board_mandate_club` FOREIGN KEY (`club_id`) REFERENCES `teams` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_board_mandate_federation` FOREIGN KEY (`federation_id`) REFERENCES `federations` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_board_mandate_league` FOREIGN KEY (`league_id`) REFERENCES `ligues` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_board_mandate_validator` FOREIGN KEY (`validated_by`) REFERENCES `User` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_board_mandate_creator` FOREIGN KEY (`created_by`) REFERENCES `User` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `club_board_members` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `mandate_id` char(36) NOT NULL,
  `person_name` varchar(255) NOT NULL,
  `user_id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('PRESIDENT','VICE_PRESIDENT','GENERAL_SECRETARY','TREASURER','BOARD_MEMBER','OTHER') NOT NULL,
  `starts_at` date NOT NULL,
  `ends_at` date DEFAULT NULL,
  `appointment_document_url` text DEFAULT NULL,
  `federation_approved` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_board_member_mandate` (`mandate_id`),
  CONSTRAINT `fk_board_member_mandate` FOREIGN KEY (`mandate_id`) REFERENCES `club_board_mandates` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_board_member_user` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `club_board_mandate_history` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `mandate_id` char(36) NOT NULL,
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
  KEY `idx_board_mandate_history` (`mandate_id`, `created_at`),
  CONSTRAINT `fk_board_mandate_history_mandate` FOREIGN KEY (`mandate_id`) REFERENCES `club_board_mandates` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_board_mandate_history_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `User` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
