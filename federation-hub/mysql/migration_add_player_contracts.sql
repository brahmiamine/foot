-- migration-v2.md P0-004 — contrats joueurs et homologation fédérale.

USE foot;

CREATE TABLE IF NOT EXISTS `player_contracts` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `player_id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `club_id` char(36) NOT NULL,
  `season_id` char(36) NOT NULL,
  `federation_id` char(36) NOT NULL,
  `league_id` char(36) DEFAULT NULL,
  `contract_type` enum('PROFESSIONAL','AMATEUR','TRAINEE','YOUTH','OTHER') NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `salary` decimal(15,3) DEFAULT NULL,
  `currency` char(3) DEFAULT NULL,
  `bonuses_json` json DEFAULT NULL,
  `agent_id` varchar(191) DEFAULT NULL,
  `signed_at` datetime DEFAULT NULL,
  `document_url` text DEFAULT NULL,
  `status` enum('DRAFT','SIGNED','TERMINATED','EXPIRED') NOT NULL DEFAULT 'DRAFT',
  `federation_status` enum('NOT_SUBMITTED','SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED','CANCELLED') NOT NULL DEFAULT 'NOT_SUBMITTED',
  `submitted_at` datetime DEFAULT NULL,
  `review_started_at` datetime DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `rejected_at` datetime DEFAULT NULL,
  `approved_by` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `terminated_at` datetime DEFAULT NULL,
  `termination_reason` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_player_contract_scope_status` (`federation_id`, `league_id`, `federation_status`),
  KEY `idx_player_contract_club_season` (`club_id`, `season_id`, `status`),
  KEY `idx_player_contract_player_dates` (`player_id`, `start_date`, `end_date`),
  CONSTRAINT `fk_player_contract_player` FOREIGN KEY (`player_id`) REFERENCES `Player` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_player_contract_club` FOREIGN KEY (`club_id`) REFERENCES `teams` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_player_contract_season` FOREIGN KEY (`season_id`) REFERENCES `saisons` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_player_contract_federation` FOREIGN KEY (`federation_id`) REFERENCES `federations` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_player_contract_league` FOREIGN KEY (`league_id`) REFERENCES `ligues` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_player_contract_approver` FOREIGN KEY (`approved_by`) REFERENCES `User` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `player_contract_documents` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `contract_id` char(36) NOT NULL,
  `file_url` text NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `mime_type` varchar(100) NOT NULL,
  `size` bigint unsigned NOT NULL,
  `checksum` char(64) NOT NULL,
  `version` int unsigned NOT NULL,
  `status` enum('CURRENT','SUPERSEDED') NOT NULL DEFAULT 'CURRENT',
  `uploaded_by` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `uploaded_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_player_contract_document_version` (`contract_id`, `version`),
  KEY `idx_player_contract_document_status` (`contract_id`, `status`),
  CONSTRAINT `fk_player_contract_document_contract` FOREIGN KEY (`contract_id`) REFERENCES `player_contracts` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_player_contract_document_uploader` FOREIGN KEY (`uploaded_by`) REFERENCES `User` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `player_contract_history` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `contract_id` char(36) NOT NULL,
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
  KEY `idx_player_contract_history` (`contract_id`, `created_at`),
  CONSTRAINT `fk_player_contract_history_contract` FOREIGN KEY (`contract_id`) REFERENCES `player_contracts` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_player_contract_history_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `User` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

ALTER TABLE `saisons`
  ADD COLUMN IF NOT EXISTS `requires_player_contract` tinyint(1) NOT NULL DEFAULT 0 AFTER `date_fin`;

ALTER TABLE `player_registrations`
  ADD CONSTRAINT `fk_player_registration_contract` FOREIGN KEY (`contract_id`) REFERENCES `player_contracts` (`id`) ON DELETE RESTRICT;
