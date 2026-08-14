-- migration-v2.md P0-001 — dossier réglementaire de licence club.
-- Migration additive et idempotente : aucune table ni colonne existante
-- n'est supprimée. Les décisions et leur historique ne sont jamais effacés
-- par cascade depuis les référentiels ; les suppressions de référentiel sont
-- donc bloquées tant qu'un dossier réglementaire les référence.

USE foot;

CREATE TABLE IF NOT EXISTS `club_license_applications` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `club_id` char(36) NOT NULL,
  `season_id` char(36) NOT NULL,
  `federation_id` char(36) NOT NULL,
  `league_id` char(36) DEFAULT NULL,
  `status` enum('DRAFT','SUBMITTED','UNDER_REVIEW','CHANGES_REQUESTED','APPROVED','REJECTED','SUSPENDED','EXPIRED') NOT NULL DEFAULT 'DRAFT',
  `submitted_at` datetime DEFAULT NULL,
  `review_started_at` datetime DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `rejected_at` datetime DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `reviewer_user_id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_club_license_club_season` (`club_id`, `season_id`),
  KEY `idx_club_license_scope_status` (`federation_id`, `league_id`, `status`),
  KEY `idx_club_license_season_status` (`season_id`, `status`),
  CONSTRAINT `fk_club_license_club` FOREIGN KEY (`club_id`) REFERENCES `teams` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_club_license_season` FOREIGN KEY (`season_id`) REFERENCES `saisons` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_club_license_federation` FOREIGN KEY (`federation_id`) REFERENCES `federations` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_club_license_league` FOREIGN KEY (`league_id`) REFERENCES `ligues` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_club_license_reviewer` FOREIGN KEY (`reviewer_user_id`) REFERENCES `User` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `club_license_requirements` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `application_id` char(36) NOT NULL,
  `category` enum('SPORTING','INFRASTRUCTURE','ADMINISTRATIVE','LEGAL','PERSONNEL','MEDICAL','FINANCIAL') NOT NULL,
  `code` varchar(100) NOT NULL,
  `label` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `mandatory` tinyint(1) NOT NULL DEFAULT 1,
  `status` enum('PENDING','COMPLIANT','NON_COMPLIANT','WAIVED') NOT NULL DEFAULT 'PENDING',
  `review_comment` text DEFAULT NULL,
  `waiver_reason` text DEFAULT NULL,
  `reviewed_by` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_club_license_requirement_code` (`application_id`, `code`),
  KEY `idx_club_license_requirement_status` (`application_id`, `mandatory`, `status`),
  CONSTRAINT `fk_club_license_requirement_application` FOREIGN KEY (`application_id`) REFERENCES `club_license_applications` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_club_license_requirement_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `User` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `club_license_documents` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `application_id` char(36) NOT NULL,
  `requirement_id` char(36) DEFAULT NULL,
  `document_type` varchar(100) NOT NULL,
  `file_url` text NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `mime_type` varchar(100) NOT NULL,
  `size` bigint unsigned NOT NULL,
  `checksum` char(64) NOT NULL,
  `version` int unsigned NOT NULL DEFAULT 1,
  `uploaded_by` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `uploaded_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('PENDING','ACCEPTED','REJECTED','SUPERSEDED') NOT NULL DEFAULT 'PENDING',
  `review_comment` text DEFAULT NULL,
  `reviewed_by` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_club_license_document_version` (`application_id`, `document_type`, `version`),
  KEY `idx_club_license_document_requirement` (`requirement_id`, `status`),
  CONSTRAINT `fk_club_license_document_application` FOREIGN KEY (`application_id`) REFERENCES `club_license_applications` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_club_license_document_requirement` FOREIGN KEY (`requirement_id`) REFERENCES `club_license_requirements` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_club_license_document_uploader` FOREIGN KEY (`uploaded_by`) REFERENCES `User` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_club_license_document_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `User` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `club_license_history` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `application_id` char(36) NOT NULL,
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
  KEY `idx_club_license_history_application` (`application_id`, `created_at`),
  CONSTRAINT `fk_club_license_history_application` FOREIGN KEY (`application_id`) REFERENCES `club_license_applications` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_club_license_history_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `User` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
