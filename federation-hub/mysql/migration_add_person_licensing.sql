-- migration-v2.md P0-002 — licences administratives individuelles.
-- Le référentiel de la personne reste dans sa table propriétaire ;
-- person_reference_id est volontairement polymorphe et ne porte pas de FK.

USE foot;

CREATE TABLE IF NOT EXISTS `person_licenses` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `person_type` enum('PLAYER','COACH','STAFF','MEDICAL','DIRECTOR','REFEREE','MATCH_OFFICIAL') NOT NULL,
  `person_reference_id` varchar(191) NOT NULL,
  `user_id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `club_id` char(36) DEFAULT NULL,
  `federation_id` char(36) NOT NULL,
  `league_id` char(36) DEFAULT NULL,
  `season_id` char(36) NOT NULL,
  `license_type` varchar(100) NOT NULL,
  `license_number` varchar(100) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `status` enum('DRAFT','SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED','SUSPENDED','EXPIRED','REVOKED') NOT NULL DEFAULT 'DRAFT',
  `requested_at` datetime DEFAULT NULL,
  `review_started_at` datetime DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `rejected_at` datetime DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `approved_by` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_person_license_request` (`person_type`, `person_reference_id`, `federation_id`, `season_id`, `license_type`),
  UNIQUE KEY `uq_person_license_number` (`license_number`),
  KEY `idx_person_license_scope_status` (`federation_id`, `league_id`, `status`),
  KEY `idx_person_license_club_status` (`club_id`, `season_id`, `status`),
  KEY `idx_person_license_person` (`person_type`, `person_reference_id`),
  CONSTRAINT `fk_person_license_user` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_person_license_club` FOREIGN KEY (`club_id`) REFERENCES `teams` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_person_license_federation` FOREIGN KEY (`federation_id`) REFERENCES `federations` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_person_license_league` FOREIGN KEY (`league_id`) REFERENCES `ligues` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_person_license_season` FOREIGN KEY (`season_id`) REFERENCES `saisons` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_person_license_approver` FOREIGN KEY (`approved_by`) REFERENCES `User` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `person_license_documents` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `license_id` char(36) NOT NULL,
  `document_type` varchar(100) NOT NULL,
  `file_url` text NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `mime_type` varchar(100) NOT NULL,
  `size` bigint unsigned NOT NULL,
  `checksum` char(64) NOT NULL,
  `version` int unsigned NOT NULL DEFAULT 1,
  `status` enum('PENDING','ACCEPTED','REJECTED','SUPERSEDED') NOT NULL DEFAULT 'PENDING',
  `review_comment` text DEFAULT NULL,
  `uploaded_by` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `uploaded_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewed_by` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_person_license_document_version` (`license_id`, `document_type`, `version`),
  KEY `idx_person_license_document_status` (`license_id`, `status`),
  CONSTRAINT `fk_person_license_document_license` FOREIGN KEY (`license_id`) REFERENCES `person_licenses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_person_license_document_uploader` FOREIGN KEY (`uploaded_by`) REFERENCES `User` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_person_license_document_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `User` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `person_license_history` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `license_id` char(36) NOT NULL,
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
  KEY `idx_person_license_history_license` (`license_id`, `created_at`),
  CONSTRAINT `fk_person_license_history_license` FOREIGN KEY (`license_id`) REFERENCES `person_licenses` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_person_license_history_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `User` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
