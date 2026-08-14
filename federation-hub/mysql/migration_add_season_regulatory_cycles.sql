-- migration-v2.md P0-011 — assistant de renouvellement saisonnier.
-- Une ligne par saison couverte par l'assistant fédéral ; l'absence de ligne
-- pour une saison signifie "non couverte" (comportement historique
-- inchangé), jamais "fermée" — voir isRegulatoryWindowOpen côté applicatif.

USE foot;

CREATE TABLE IF NOT EXISTS `season_regulatory_cycles` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `season_id` char(36) NOT NULL,
  `federation_id` char(36) NOT NULL,
  `league_id` char(36) DEFAULT NULL,
  `status` enum('DRAFT','ACTIVE','CLOSED') NOT NULL DEFAULT 'DRAFT',
  `club_licensing_open_at` datetime DEFAULT NULL,
  `club_licensing_close_at` datetime DEFAULT NULL,
  `registration_open_at` datetime DEFAULT NULL,
  `registration_close_at` datetime DEFAULT NULL,
  `previous_season_id` char(36) DEFAULT NULL,
  `previous_season_expired_at` datetime DEFAULT NULL,
  `created_by` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_season_regulatory_cycle_season` (`season_id`),
  KEY `idx_season_regulatory_cycle_scope` (`federation_id`, `league_id`, `status`),
  CONSTRAINT `fk_season_regulatory_cycle_season` FOREIGN KEY (`season_id`) REFERENCES `saisons` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_season_regulatory_cycle_previous_season` FOREIGN KEY (`previous_season_id`) REFERENCES `saisons` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_season_regulatory_cycle_federation` FOREIGN KEY (`federation_id`) REFERENCES `federations` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_season_regulatory_cycle_league` FOREIGN KEY (`league_id`) REFERENCES `ligues` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_season_regulatory_cycle_creator` FOREIGN KEY (`created_by`) REFERENCES `User` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `season_regulatory_cycle_history` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `cycle_id` char(36) NOT NULL,
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
  KEY `idx_season_regulatory_cycle_history` (`cycle_id`, `created_at`),
  CONSTRAINT `fk_season_regulatory_cycle_history_cycle` FOREIGN KEY (`cycle_id`) REFERENCES `season_regulatory_cycles` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_season_regulatory_cycle_history_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `User` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
