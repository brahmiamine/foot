-- migration-v2.md P1-005 — aptitude médicale fédérale. Ne stocke JAMAIS de
-- diagnostic : uniquement le statut d'aptitude (FIT/UNFIT/PENDING/EXPIRED/
-- SUSPENDED) et une référence de certificat opaque. Le détail médical reste
-- propriété de `cms_injuries` (club-hub) / medical-hub — migration-v2.md §3.3.

USE foot;

CREATE TABLE IF NOT EXISTS `medical_eligibilities` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `player_id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `club_id` char(36) NOT NULL,
  `season_id` char(36) NOT NULL,
  `federation_id` char(36) NOT NULL,
  `league_id` char(36) DEFAULT NULL,
  `examination_date` date NOT NULL,
  `expires_at` date DEFAULT NULL,
  `status` enum('PENDING','FIT','UNFIT','EXPIRED','SUSPENDED') NOT NULL DEFAULT 'PENDING',
  `validated_by_medical_user_id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `validated_at` datetime DEFAULT NULL,
  `certificate_reference` varchar(191) DEFAULT NULL,
  `document_url` text DEFAULT NULL,
  `created_by` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_medical_eligibility_player_season` (`player_id`, `season_id`),
  KEY `idx_medical_eligibility_scope_status` (`federation_id`, `league_id`, `status`),
  KEY `idx_medical_eligibility_club_season` (`club_id`, `season_id`),
  CONSTRAINT `fk_medical_eligibility_player` FOREIGN KEY (`player_id`) REFERENCES `Player` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_medical_eligibility_club` FOREIGN KEY (`club_id`) REFERENCES `teams` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_medical_eligibility_season` FOREIGN KEY (`season_id`) REFERENCES `saisons` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_medical_eligibility_federation` FOREIGN KEY (`federation_id`) REFERENCES `federations` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_medical_eligibility_league` FOREIGN KEY (`league_id`) REFERENCES `ligues` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_medical_eligibility_validator` FOREIGN KEY (`validated_by_medical_user_id`) REFERENCES `User` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_medical_eligibility_creator` FOREIGN KEY (`created_by`) REFERENCES `User` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `medical_eligibility_history` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `eligibility_id` char(36) NOT NULL,
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
  KEY `idx_medical_eligibility_history` (`eligibility_id`, `created_at`),
  CONSTRAINT `fk_medical_eligibility_history_eligibility` FOREIGN KEY (`eligibility_id`) REFERENCES `medical_eligibilities` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_medical_eligibility_history_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `User` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
