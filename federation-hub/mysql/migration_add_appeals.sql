-- migration-v2.md P1-008 — appels. Référence polymorphe vers la décision
-- contestée (source_type + source_id), aucune FK stricte : un appel ne
-- doit jamais modifier l'historique de la décision originale (§23), il ne
-- fait que la référencer en lecture. Cette table est le seul endroit où
-- une décision peut être remise en cause.

USE foot;

CREATE TABLE IF NOT EXISTS `appeals` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `federation_id` char(36) NOT NULL,
  `league_id` char(36) DEFAULT NULL,
  `source_type` enum('LEGAL_CASE','DISCIPLINARY_CASE','CLUB_SANCTION','CLUB_LICENSE','PERSON_LICENSE','STADIUM_INSPECTION','COACH_QUALIFICATION','FINANCIAL_COMPLIANCE','MEDICAL_ELIGIBILITY','OTHER') NOT NULL,
  `source_id` char(36) NOT NULL,
  `applicant_type` enum('CLUB','PLAYER','COACH','STAFF','AGENT','FEDERATION','OTHER') NOT NULL,
  `applicant_id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `grounds` text NOT NULL,
  `submitted_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('SUBMITTED','ADMISSIBILITY_REVIEW','UNDER_REVIEW','HEARING','DECIDED','REJECTED','WITHDRAWN') NOT NULL DEFAULT 'SUBMITTED',
  `decision_at` datetime DEFAULT NULL,
  `decision_summary` text DEFAULT NULL,
  `created_by` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_appeal_scope_status` (`federation_id`, `league_id`, `status`),
  KEY `idx_appeal_source` (`source_type`, `source_id`),
  KEY `idx_appeal_applicant` (`applicant_type`, `applicant_id`),
  CONSTRAINT `fk_appeal_federation` FOREIGN KEY (`federation_id`) REFERENCES `federations` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_appeal_league` FOREIGN KEY (`league_id`) REFERENCES `ligues` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_appeal_creator` FOREIGN KEY (`created_by`) REFERENCES `User` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `appeal_documents` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `appeal_id` char(36) NOT NULL,
  `file_url` text NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `uploaded_by` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `uploaded_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_appeal_document_appeal` (`appeal_id`),
  CONSTRAINT `fk_appeal_document_appeal` FOREIGN KEY (`appeal_id`) REFERENCES `appeals` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_appeal_document_uploader` FOREIGN KEY (`uploaded_by`) REFERENCES `User` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `appeal_events` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `appeal_id` char(36) NOT NULL,
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
  KEY `idx_appeal_event` (`appeal_id`, `created_at`),
  CONSTRAINT `fk_appeal_event_appeal` FOREIGN KEY (`appeal_id`) REFERENCES `appeals` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_appeal_event_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `User` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
