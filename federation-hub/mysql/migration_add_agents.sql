-- migration-v2.md P1-006 — agents et intermédiaires.

USE foot;

CREATE TABLE IF NOT EXISTS `football_agents` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `user_id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `federation_id` char(36) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `fifa_license_number` varchar(100) DEFAULT NULL,
  `federation_registration_number` varchar(100) DEFAULT NULL,
  `status` enum('PENDING','ACTIVE','SUSPENDED','REVOKED','EXPIRED') NOT NULL DEFAULT 'PENDING',
  `valid_from` date DEFAULT NULL,
  `valid_until` date DEFAULT NULL,
  `contact_email` varchar(255) NOT NULL,
  `contact_phone` varchar(30) DEFAULT NULL,
  `created_by` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_football_agent_fifa_license` (`fifa_license_number`),
  KEY `idx_football_agent_federation_status` (`federation_id`, `status`),
  CONSTRAINT `fk_football_agent_federation` FOREIGN KEY (`federation_id`) REFERENCES `federations` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_football_agent_user` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_football_agent_creator` FOREIGN KEY (`created_by`) REFERENCES `User` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `representation_agreements` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `agent_id` char(36) NOT NULL,
  `player_id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `club_id` char(36) DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `document_url` text DEFAULT NULL,
  `status` enum('DRAFT','ACTIVE','TERMINATED','EXPIRED') NOT NULL DEFAULT 'DRAFT',
  `created_by` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_representation_agreement_agent` (`agent_id`, `status`),
  KEY `idx_representation_agreement_player` (`player_id`),
  KEY `idx_representation_agreement_club` (`club_id`),
  CONSTRAINT `chk_representation_agreement_party` CHECK (`player_id` IS NOT NULL OR `club_id` IS NOT NULL),
  CONSTRAINT `fk_representation_agreement_agent` FOREIGN KEY (`agent_id`) REFERENCES `football_agents` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_representation_agreement_player` FOREIGN KEY (`player_id`) REFERENCES `Player` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_representation_agreement_club` FOREIGN KEY (`club_id`) REFERENCES `teams` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_representation_agreement_creator` FOREIGN KEY (`created_by`) REFERENCES `User` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `football_agent_history` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `agent_id` char(36) NOT NULL,
  `action` varchar(100) NOT NULL,
  `from_status` varchar(32) DEFAULT NULL,
  `to_status` varchar(32) DEFAULT NULL,
  `actor_user_id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `actor_role` varchar(50) NOT NULL,
  `reason` text DEFAULT NULL,
  `after_value` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_football_agent_history` (`agent_id`, `created_at`),
  CONSTRAINT `fk_football_agent_history_agent` FOREIGN KEY (`agent_id`) REFERENCES `football_agents` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_football_agent_history_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `User` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
