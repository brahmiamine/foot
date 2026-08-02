CREATE TABLE IF NOT EXISTS `vote_alerts` (
    `id` char(36) NOT NULL,
    `match_id` char(36) NOT NULL,
    `alert_type` enum('critical', 'important') NOT NULL DEFAULT 'important',
    `confidence` decimal(5, 4) NOT NULL DEFAULT '0.0000',
    `credibility` decimal(5, 2) NOT NULL DEFAULT '0.00',
    `reasons` json DEFAULT NULL,
    `status` enum(
        'new',
        'reviewed',
        'resolved',
        'dismissed'
    ) NOT NULL DEFAULT 'new',
    `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `reviewed_at` datetime DEFAULT NULL,
    `reviewed_by` char(36) DEFAULT NULL,
    `notes` text DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_vote_alerts_match` (`match_id`),
    KEY `idx_vote_alerts_status` (`status`),
    KEY `idx_vote_alerts_created` (`created_at`),
    KEY `idx_vote_alerts_type` (`alert_type`),
    CONSTRAINT `fk_vote_alerts_match` FOREIGN KEY (`match_id`) REFERENCES `matches` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_uca1400_ai_ci;

CREATE INDEX `idx_vote_alerts_match_status` ON `vote_alerts` (`match_id`, `status`);