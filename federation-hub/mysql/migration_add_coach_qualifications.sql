-- migration-v2.md P1-004 — qualifications CAF des entraîneurs. Distinct de
-- `person_licenses` (P0-002, enregistrement administratif saisonnier) : ici
-- un diplôme technique permanent (niveau CAF), rattaché à la personne, pas
-- à une saison. `staff_contracts.qualification_id` (P0-005) continue de
-- référencer `person_licenses` sans changement — pas de migration de
-- données entre les deux domaines.

USE foot;

CREATE TABLE IF NOT EXISTS `coach_qualifications` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `staff_id` bigint NOT NULL,
  `club_id` char(36) NOT NULL,
  `federation_id` char(36) NOT NULL,
  `league_id` char(36) DEFAULT NULL,
  `qualification_type` enum('CAF_PRO','CAF_A','CAF_B','CAF_C','NATIONAL','OTHER') NOT NULL,
  `license_number` varchar(100) DEFAULT NULL,
  `issued_at` date DEFAULT NULL,
  `expires_at` date DEFAULT NULL,
  `document_url` text DEFAULT NULL,
  `status` enum('PENDING','VALID','EXPIRED','SUSPENDED','REVOKED') NOT NULL DEFAULT 'PENDING',
  `validated_by` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `validated_at` datetime DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `created_by` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_coach_qualification_scope_status` (`federation_id`, `league_id`, `status`),
  KEY `idx_coach_qualification_staff` (`staff_id`, `status`),
  CONSTRAINT `fk_coach_qualification_club` FOREIGN KEY (`club_id`) REFERENCES `teams` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_coach_qualification_federation` FOREIGN KEY (`federation_id`) REFERENCES `federations` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_coach_qualification_league` FOREIGN KEY (`league_id`) REFERENCES `ligues` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_coach_qualification_validator` FOREIGN KEY (`validated_by`) REFERENCES `User` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_coach_qualification_creator` FOREIGN KEY (`created_by`) REFERENCES `User` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `coach_qualification_history` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `qualification_id` char(36) NOT NULL,
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
  KEY `idx_coach_qualification_history` (`qualification_id`, `created_at`),
  CONSTRAINT `fk_coach_qualification_history_qualification` FOREIGN KEY (`qualification_id`) REFERENCES `coach_qualifications` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_coach_qualification_history_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `User` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

ALTER TABLE `saisons`
  ADD COLUMN IF NOT EXISTS `minimum_head_coach_qualification` enum('CAF_PRO','CAF_A','CAF_B','CAF_C','NATIONAL','OTHER') DEFAULT NULL AFTER `requires_staff_qualification`;
