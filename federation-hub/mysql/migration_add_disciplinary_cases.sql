-- migration-v2.md P1-007 — discipline fédérale avancée (commission de
-- discipline). Ne remplace PAS les cartons/suspensions existants (`Card`,
-- `Suspension`, `CardReason`, propriété club-hub/match-operations) : ce
-- niveau supérieur instruit et décide, la sanction concrète sur un club
-- réutilise `club_sanctions` (P0-009, source_case_type='DISCIPLINARY_CASE'),
-- une sanction individuelle réutilise le mécanisme `Suspension` existant
-- (non automatisé ici, voir migration-v2.md §P1-007).

USE foot;

CREATE TABLE IF NOT EXISTS `disciplinary_cases` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `case_number` varchar(32) NOT NULL,
  `federation_id` char(36) NOT NULL,
  `league_id` char(36) DEFAULT NULL,
  `match_id` char(36) DEFAULT NULL,
  `club_id` char(36) DEFAULT NULL,
  `person_type` enum('PLAYER','COACH','STAFF','REFEREE','AGENT','OTHER') DEFAULT NULL,
  `person_id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `offense_type` varchar(191) NOT NULL,
  `description` text NOT NULL,
  `status` enum('OPEN','UNDER_REVIEW','HEARING_SCHEDULED','DECIDED','APPEALED','CLOSED') NOT NULL DEFAULT 'OPEN',
  `opened_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `hearing_date` datetime DEFAULT NULL,
  `decision_date` datetime DEFAULT NULL,
  `created_by` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_disciplinary_case_number` (`case_number`),
  KEY `idx_disciplinary_case_scope_status` (`federation_id`, `league_id`, `status`),
  KEY `idx_disciplinary_case_club` (`club_id`),
  KEY `idx_disciplinary_case_person` (`person_type`, `person_id`),
  KEY `idx_disciplinary_case_match` (`match_id`),
  CONSTRAINT `fk_disciplinary_case_federation` FOREIGN KEY (`federation_id`) REFERENCES `federations` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_disciplinary_case_league` FOREIGN KEY (`league_id`) REFERENCES `ligues` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_disciplinary_case_club` FOREIGN KEY (`club_id`) REFERENCES `teams` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_disciplinary_case_creator` FOREIGN KEY (`created_by`) REFERENCES `User` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `disciplinary_case_evidence` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `case_id` char(36) NOT NULL,
  `file_url` text NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `uploaded_by` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `uploaded_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_disciplinary_case_evidence_case` (`case_id`),
  CONSTRAINT `fk_disciplinary_case_evidence_case` FOREIGN KEY (`case_id`) REFERENCES `disciplinary_cases` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_disciplinary_case_evidence_uploader` FOREIGN KEY (`uploaded_by`) REFERENCES `User` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `disciplinary_case_hearings` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `case_id` char(36) NOT NULL,
  `scheduled_at` datetime NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_disciplinary_case_hearing_case` (`case_id`, `scheduled_at`),
  CONSTRAINT `fk_disciplinary_case_hearing_case` FOREIGN KEY (`case_id`) REFERENCES `disciplinary_cases` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_disciplinary_case_hearing_creator` FOREIGN KEY (`created_by`) REFERENCES `User` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `disciplinary_case_decisions` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `case_id` char(36) NOT NULL,
  `summary` text NOT NULL,
  `sanction_description` text DEFAULT NULL,
  `club_sanction_id` char(36) DEFAULT NULL,
  `decided_by` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `decided_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_disciplinary_case_decision_case` (`case_id`),
  CONSTRAINT `fk_disciplinary_case_decision_case` FOREIGN KEY (`case_id`) REFERENCES `disciplinary_cases` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_disciplinary_case_decision_sanction` FOREIGN KEY (`club_sanction_id`) REFERENCES `club_sanctions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_disciplinary_case_decision_decider` FOREIGN KEY (`decided_by`) REFERENCES `User` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `disciplinary_case_events` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `case_id` char(36) NOT NULL,
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
  KEY `idx_disciplinary_case_event` (`case_id`, `created_at`),
  CONSTRAINT `fk_disciplinary_case_event_case` FOREIGN KEY (`case_id`) REFERENCES `disciplinary_cases` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_disciplinary_case_event_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `User` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
