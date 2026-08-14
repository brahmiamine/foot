-- migration-v2.md P1-001 — contrôle financier réglementaire (pas une
-- comptabilité générale : uniquement les agrégats déclaratifs nécessaires
-- à la décision de conformité fédérale).

USE foot;

CREATE TABLE IF NOT EXISTS `club_financial_compliance` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `club_id` char(36) NOT NULL,
  `season_id` char(36) NOT NULL,
  `federation_id` char(36) NOT NULL,
  `league_id` char(36) DEFAULT NULL,
  `status` enum('DRAFT','SUBMITTED','UNDER_REVIEW','COMPLIANT','CONDITIONAL','NON_COMPLIANT') NOT NULL DEFAULT 'DRAFT',
  `budget_forecast` decimal(15,3) DEFAULT NULL,
  `payroll_forecast` decimal(15,3) DEFAULT NULL,
  `player_debts` decimal(15,3) NOT NULL DEFAULT 0.000,
  `staff_debts` decimal(15,3) NOT NULL DEFAULT 0.000,
  `tax_debts` decimal(15,3) NOT NULL DEFAULT 0.000,
  `federation_debts` decimal(15,3) NOT NULL DEFAULT 0.000,
  `other_debts` decimal(15,3) NOT NULL DEFAULT 0.000,
  `currency` char(3) NOT NULL DEFAULT 'TND',
  `audited_accounts_url` text DEFAULT NULL,
  `auditor_name` varchar(255) DEFAULT NULL,
  `submitted_at` datetime DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `reviewed_by` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `review_comment` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_financial_compliance_club_season` (`club_id`, `season_id`),
  KEY `idx_financial_compliance_scope_status` (`federation_id`, `league_id`, `status`),
  CONSTRAINT `fk_financial_compliance_club` FOREIGN KEY (`club_id`) REFERENCES `teams` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_financial_compliance_season` FOREIGN KEY (`season_id`) REFERENCES `saisons` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_financial_compliance_federation` FOREIGN KEY (`federation_id`) REFERENCES `federations` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_financial_compliance_league` FOREIGN KEY (`league_id`) REFERENCES `ligues` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_financial_compliance_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `User` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `club_financial_compliance_history` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `compliance_id` char(36) NOT NULL,
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
  KEY `idx_financial_compliance_history` (`compliance_id`, `created_at`),
  CONSTRAINT `fk_financial_compliance_history_compliance` FOREIGN KEY (`compliance_id`) REFERENCES `club_financial_compliance` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_financial_compliance_history_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `User` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
