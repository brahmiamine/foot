-- migration-v2.md P0-010 — litiges (commissions juridiques fédérales).
-- Parties (claimant/respondent) modélisées de façon polymorphe
-- (`*_type` + `*_id`), comme `person_licenses.person_reference_id` : un
-- litige peut opposer un club, un joueur, un coach, un staff, un agent ou
-- la fédération elle-même, sans dupliquer ces référentiels.

USE foot;

CREATE TABLE IF NOT EXISTS `legal_cases` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `case_number` varchar(32) NOT NULL,
  `federation_id` char(36) NOT NULL,
  `league_id` char(36) DEFAULT NULL,
  `season_id` char(36) DEFAULT NULL,
  `category` enum('PLAYER_CLUB','COACH_CLUB','STAFF_CLUB','AGENT_PLAYER','AGENT_CLUB','CLUB_CLUB','CONTRACT','TRANSFER','DISCIPLINARY','FINANCIAL','OTHER') NOT NULL,
  `claimant_type` enum('CLUB','PLAYER','COACH','STAFF','AGENT','FEDERATION','OTHER') NOT NULL,
  `claimant_id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `respondent_type` enum('CLUB','PLAYER','COACH','STAFF','AGENT','FEDERATION','OTHER') NOT NULL,
  `respondent_id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `subject` text NOT NULL,
  `status` enum('FILED','ADMISSIBILITY_REVIEW','INADMISSIBLE','UNDER_REVIEW','HEARING_SCHEDULED','HEARD','DECIDED','APPEALED','CLOSED','WITHDRAWN') NOT NULL DEFAULT 'FILED',
  `filed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `admissibility_reviewed_at` datetime DEFAULT NULL,
  `hearing_date` datetime DEFAULT NULL,
  `decided_at` datetime DEFAULT NULL,
  `decision_summary` text DEFAULT NULL,
  `amount_awarded` decimal(15,3) DEFAULT NULL,
  `currency` char(3) DEFAULT NULL,
  `deadline` datetime DEFAULT NULL,
  `created_by` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `assigned_to` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_legal_case_number` (`case_number`),
  KEY `idx_legal_case_scope_status` (`federation_id`, `league_id`, `status`),
  KEY `idx_legal_case_claimant` (`claimant_type`, `claimant_id`),
  KEY `idx_legal_case_respondent` (`respondent_type`, `respondent_id`),
  KEY `idx_legal_case_season` (`season_id`),
  CONSTRAINT `fk_legal_case_federation` FOREIGN KEY (`federation_id`) REFERENCES `federations` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_legal_case_league` FOREIGN KEY (`league_id`) REFERENCES `ligues` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_legal_case_season` FOREIGN KEY (`season_id`) REFERENCES `saisons` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_legal_case_creator` FOREIGN KEY (`created_by`) REFERENCES `User` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_legal_case_assignee` FOREIGN KEY (`assigned_to`) REFERENCES `User` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `legal_case_documents` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `case_id` char(36) NOT NULL,
  `file_url` text NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `mime_type` varchar(100) NOT NULL,
  `size` bigint unsigned NOT NULL,
  `checksum` char(64) NOT NULL,
  `version` int unsigned NOT NULL,
  `submitted_by_type` enum('CLAIMANT','RESPONDENT','FEDERATION') NOT NULL,
  `uploaded_by` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `uploaded_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_legal_case_document_case` (`case_id`, `uploaded_at`),
  CONSTRAINT `fk_legal_case_document_case` FOREIGN KEY (`case_id`) REFERENCES `legal_cases` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_legal_case_document_uploader` FOREIGN KEY (`uploaded_by`) REFERENCES `User` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `legal_case_hearings` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `case_id` char(36) NOT NULL,
  `scheduled_at` datetime NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  `mode` enum('IN_PERSON','REMOTE','WRITTEN') NOT NULL DEFAULT 'IN_PERSON',
  `notes` text DEFAULT NULL,
  `held` tinyint(1) NOT NULL DEFAULT 0,
  `created_by` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_legal_case_hearing_case` (`case_id`, `scheduled_at`),
  CONSTRAINT `fk_legal_case_hearing_case` FOREIGN KEY (`case_id`) REFERENCES `legal_cases` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_legal_case_hearing_creator` FOREIGN KEY (`created_by`) REFERENCES `User` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `legal_case_decisions` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `case_id` char(36) NOT NULL,
  `summary` text NOT NULL,
  `full_text_url` text DEFAULT NULL,
  `amount_awarded` decimal(15,3) DEFAULT NULL,
  `currency` char(3) DEFAULT NULL,
  `sanction_issued` tinyint(1) NOT NULL DEFAULT 0,
  `decided_by` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `decided_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_legal_case_decision_case` (`case_id`),
  CONSTRAINT `fk_legal_case_decision_case` FOREIGN KEY (`case_id`) REFERENCES `legal_cases` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_legal_case_decision_decider` FOREIGN KEY (`decided_by`) REFERENCES `User` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `legal_case_events` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `case_id` char(36) NOT NULL,
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
  KEY `idx_legal_case_event` (`case_id`, `created_at`),
  CONSTRAINT `fk_legal_case_event_case` FOREIGN KEY (`case_id`) REFERENCES `legal_cases` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_legal_case_event_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `User` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
