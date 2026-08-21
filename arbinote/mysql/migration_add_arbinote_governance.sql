-- ARBI-001/002/003/004 (platform-governance-roadmap.md, section H) : policy
-- de vote (mode/fenêtre/seuil de visibilité/seuil de quarantaine), état
-- `quarantined` sur les votes, audit standard GOV-005, et versionnement du
-- barème public. Migration additive, compatible avec la base partagée
-- (critere_definitions/votes sont aussi lus/écrits par federation-hub via
-- des entités TypeORM identiques).

-- REF-006-style policy PLATFORM/FEDERATION/LEAGUE/SEASON (GOV-001/GOV-004).
CREATE TABLE IF NOT EXISTS `arbinote_voting_policies` (
  `id` char(36) NOT NULL,
  `scope_type` enum('PLATFORM','FEDERATION','LEAGUE','SEASON') NOT NULL,
  `scope_id` char(36) DEFAULT NULL,
  `version` int NOT NULL,
  `effective_from` datetime DEFAULT NULL,
  `effective_until` datetime DEFAULT NULL,
  `values_json` json NOT NULL,
  `updated_by` varchar(191) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_arbinote_voting_policy_scope_version` (`scope_type`, `scope_id`, `version`),
  KEY `idx_arbinote_voting_policy_scope` (`scope_type`, `scope_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- GOV-005 — journal append-only des changements de configuration ArbiNote
-- (policy de vote, quarantaine automatique des votes, versions de critères).
CREATE TABLE IF NOT EXISTS `arbinote_configuration_audit` (
  `id` char(36) NOT NULL,
  `domain` varchar(80) NOT NULL,
  `configuration_key` varchar(120) NOT NULL,
  `scope_type` varchar(50) NOT NULL,
  `scope_id` varchar(191) DEFAULT NULL,
  `previous_version` int DEFAULT NULL,
  `new_version` int DEFAULT NULL,
  `before_value` json DEFAULT NULL,
  `after_value` json NOT NULL,
  `actor_user_id` varchar(191) NOT NULL,
  `actor_role` varchar(80) NOT NULL,
  `reason` text NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(512) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_arbinote_configuration_audit_domain` (`domain`),
  KEY `idx_arbinote_configuration_audit_key` (`configuration_key`),
  KEY `idx_arbinote_configuration_audit_scope` (`scope_type`, `scope_id`),
  KEY `idx_arbinote_configuration_audit_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ARBI-003 — un vote suspect peut être mis en quarantaine automatiquement,
-- distinct d'une exclusion humaine explicite, en attente de revue.
ALTER TABLE `votes`
  MODIFY COLUMN `moderation_status` enum('pending','validated','excluded','quarantined') DEFAULT 'pending';

-- ARBI-004 — barème public versionné (append-only) : chaque modification
-- clôture la version en vigueur au lieu de la muter, pour que les votes
-- déjà écrits ne changent jamais rétroactivement de sens.
ALTER TABLE `critere_definitions`
  ADD COLUMN `version` int NOT NULL DEFAULT 1 AFTER `id`,
  ADD COLUMN `season_id` varchar(36) DEFAULT NULL AFTER `version`,
  ADD COLUMN `competition_id` varchar(36) DEFAULT NULL AFTER `season_id`,
  ADD COLUMN `effective_from` datetime DEFAULT NULL AFTER `competition_id`,
  ADD COLUMN `effective_until` datetime DEFAULT NULL AFTER `effective_from`;

UPDATE `critere_definitions`
SET `effective_from` = COALESCE(`effective_from`, `created_at`, CURRENT_TIMESTAMP)
WHERE `effective_from` IS NULL;

ALTER TABLE `critere_definitions`
  MODIFY COLUMN `effective_from` datetime NOT NULL,
  DROP PRIMARY KEY,
  ADD PRIMARY KEY (`id`, `version`),
  ADD KEY `idx_critere_definitions_resolution` (`id`, `effective_from`, `effective_until`),
  ADD KEY `idx_critere_definitions_scope` (`season_id`, `competition_id`);
